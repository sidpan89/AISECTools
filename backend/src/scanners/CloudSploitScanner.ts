// backend/src/scanners/CloudSploitScanner.ts
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs/promises';
import path from 'path';
import { IScanner, ScanOptions, ScanRunResult, ScanParseResult, DecryptedCloudCredentials } from './IScanner';
import { Findings } from '../models/Findings';
import { CloudProvider } from '../models/enums/CloudProvider';
import { AppDataSource } from '../dataSource';

const execAsync = util.promisify(exec);

// Define a simple structure for CloudSploit config file content
interface CloudSploitAwsCredentials {
  access_key: string;
  secret_access_key: string;
  session_token?: string;
}

interface CloudSploitAzureCredentials {
  application_id: string;
  key_value: string;
  directory_id: string;
  subscription_id: string;
}

interface CloudSploitGcpCredentials {
  // GCP uses a path to the service account JSON key file
  credential_file: string;
}


export class CloudSploitScanner implements IScanner {
  public readonly toolName = 'CloudSploit';
  public readonly supportedProviders: CloudProvider[] = [CloudProvider.AWS, CloudProvider.AZURE, CloudProvider.GCP];

  async runScan(options: ScanOptions): Promise<ScanRunResult> {
    const { credentials, cloudProvider, outputDirectory, target, policyConfiguration } = options; // Added policyConfiguration
    
    // CloudSploit typically uses a config file or environment variables.
    // We'll create a temporary config file for it.
    const cloudsploitConfigFileName = `cloudsploit-config-${Date.now()}.js`;
    const tempConfigFilePath = path.join(outputDirectory, cloudsploitConfigFileName);

    const reportFileName = `cloudsploit-output-${Date.now()}.json`;
    const reportFilePath = path.join(outputDirectory, reportFileName);

    let providerConfig: any = {};
    let tempGcpKeyFilePath: string | undefined;

    try {
      await fs.mkdir(outputDirectory, { recursive: true });

      switch (cloudProvider) {
        case CloudProvider.AWS:
          const awsCreds = credentials as { accessKeyId: string, secretAccessKey: string, sessionToken?: string, region?: string };
          providerConfig.aws = {
            access_key: awsCreds.accessKeyId,
            secret_access_key: awsCreds.secretAccessKey,
            session_token: awsCreds.sessionToken,
            // region: awsCreds.region // CloudSploit might pick region automatically or via other params
          };
          break;
        case CloudProvider.AZURE:
          const azureCreds = credentials as { tenantId: string, clientId: string, clientSecret: string, subscriptionId: string };
          providerConfig.azure = {
            application_id: azureCreds.clientId,
            key_value: azureCreds.clientSecret,
            directory_id: azureCreds.tenantId,
            subscription_id: target || azureCreds.subscriptionId, // target might be a specific subscription
          };
          break;
        case CloudProvider.GCP:
          // For GCP, CloudSploit expects a path to the service account key file.
          // We'll write the credentials (which should be the GCP SA key JSON) to a temporary file.
          tempGcpKeyFilePath = path.join(outputDirectory, `gcp-sa-key-cloudsploit-${Date.now()}.json`);
          await fs.writeFile(tempGcpKeyFilePath, JSON.stringify(credentials));
          providerConfig.gcp = {
            credential_file: tempGcpKeyFilePath,
            project: target, // Optional: if target is a specific project ID
          };
          break;
        default:
          return { success: false, rawOutputPaths: [], error: `Unsupported provider for CloudSploit: ${cloudProvider}` };
      }

      // Create CloudSploit config content
      // Note: CloudSploit's config_example.js shows it as module.exports = { aws: {}, azure: {}, gcp: {} ... }
      // So we need to ensure our providerConfig is nested correctly, e.g. { azure: { ... }}
      const configContent = `module.exports = ${JSON.stringify(providerConfig, null, 2)};`;
      await fs.writeFile(tempConfigFilePath, configContent);
      
      // Base command: assuming CloudSploit's index.js is executable and in PATH or specified path
      // The actual path to index.js might need to be configured e.g. /opt/cloudsploit/index.js
      // For now, let's assume it's globally available or in current execution path for the subtask.
      // A real setup would require knowing where CloudSploit is installed.
      let command = `cloudsploit --config ${tempConfigFilePath} --json ${reportFilePath} --console none`;
      
      // Add provider-specific options if any (CloudSploit might infer from config)
      // e.g. if (target && cloudProvider === CloudProvider.AWS) command += ` --account ${target}`;
      // CloudSploit's primary mechanism is its config file for provider details.

      // Dynamically Append CloudSploit CLI Arguments from policyConfiguration
      if (policyConfiguration) {
        if (policyConfiguration.plugins && Array.isArray(policyConfiguration.plugins) && policyConfiguration.plugins.length > 0) {
          // CloudSploit's --plugin flag seems to take one plugin at a time.
          // If multiple specific plugins are needed, it might require multiple runs or choosing a compliance scan.
          // For now, let's assume if 'plugins' array is present, we run the first one.
          // A better approach might be to not support 'plugins' array directly if it implies multiple runs,
          // or adjust to run only one specified plugin if that's the tool's behavior.
          // Alternatively, if CloudSploit allows comma-separated list for --plugin, that could be used.
          // Let's assume a single plugin for now if 'plugins' is specified.
          command += ` --plugin ${policyConfiguration.plugins[0]}`;
        }
        if (policyConfiguration.compliance && typeof policyConfiguration.compliance === 'string') {
          command += ` --compliance ${policyConfiguration.compliance}`;
        }
        if (policyConfiguration.suppressions && Array.isArray(policyConfiguration.suppressions) && policyConfiguration.suppressions.length > 0) {
          for (const suppression of policyConfiguration.suppressions) {
            command += ` --suppress "${suppression}"`; // Ensure suppression string is quoted if it contains special chars
          }
        }
        if (policyConfiguration.customArgs && typeof policyConfiguration.customArgs === 'string') {
          command += ` ${policyConfiguration.customArgs}`; // Use with caution
        }
      }

      console.log(`Executing CloudSploit command: ${command}`);
      const { stdout, stderr } = await execAsync(command); // CloudSploit might need to be run from its own directory

      if (stderr && !stderr.toLowerCase().includes('warning') && !stderr.toLowerCase().includes('info')) {
         console.warn(`CloudSploit stderr: ${stderr}`);
      }
      
      await fs.access(reportFilePath); // Check if report was created

      return { success: true, rawOutputPaths: [reportFilePath] };

    } catch (error: any) {
      console.error(`CloudSploit execution failed for ${cloudProvider}: ${error.message}`);
      return { success: false, rawOutputPaths: [], error: error.message };
    } finally {
      // Clean up temporary config and key files
      try {
        await fs.unlink(tempConfigFilePath);
      } catch (e) { console.error(`Failed to delete temp config ${tempConfigFilePath}`, e); }
      if (tempGcpKeyFilePath) {
        try {
          await fs.unlink(tempGcpKeyFilePath);
        } catch (e) { console.error(`Failed to delete temp GCP key file ${tempGcpKeyFilePath}`, e); }
      }
    }
  }

  async parseOutput(rawOutputPaths: string[], scanId: number): Promise<ScanParseResult> {
    if (!rawOutputPaths || rawOutputPaths.length === 0) {
      return { success: false, findings: [], error: 'No raw output paths provided for CloudSploit.' };
    }

    const findingsRepository = AppDataSource.getRepository(Findings);
    const parsedFindings: Findings[] = [];

    try {
      for (const outputFilePath of rawOutputPaths) {
        const reportContent = await fs.readFile(outputFilePath, 'utf-8');
        const cloudsploitReportData = JSON.parse(reportContent); // CloudSploit typically outputs a JSON array

        if (!Array.isArray(cloudsploitReportData)) {
          console.warn(`CloudSploit output at ${outputFilePath} is not a JSON array.`);
          return { success: false, findings: [], error: `Unexpected CloudSploit output format in ${outputFilePath}. Expected a JSON array.` };
        }

        for (const item of cloudsploitReportData) {
          // TODO: Detailed mapping from CloudSploit finding structure to our Findings model.
          // This is a placeholder based on common fields CloudSploit might use.
          // CloudSploit fields: plugin, category, title/message, resource, status (PASS/WARN/FAIL/UNKNOWN), description/message
          
          const finding = new Findings();
          finding.scanId = scanId;

          // CloudSploit uses status: 0 (PASS), 1 (WARN), 2 (FAIL), 3 (UNKNOWN)
          // And a 'message' field for the title/description of the check.
          // 'description' field often has more details or is null.
          
          let severity = 'Unknown';
          if (item.status === 1) severity = 'Medium'; // WARN
          else if (item.status === 2) severity = 'High'; // FAIL (can be High or Critical depending on context)
          else if (item.status === 0) severity = 'Low'; // PASS (we might not store PASS, or map to Low/Info)
                                                        // For now, let's assume we only process non-PASS or map PASS to Low
          
          // We only want to store FAIL/WARN as findings. Filter out PASS/UNKNOWN if not needed.
          if (item.status === 0 || item.status === 3) { // Skip PASS and UNKNOWN
            // continue; 
            // Or, if we want to record PASS as Low:
             if (item.status === 0) severity = 'Low'; else continue;
          }


          finding.severity = severity.substring(0, 255);
          finding.category = (item.category || item.plugin || 'Unknown').substring(0, 255);
          finding.resource = (item.resource || 'N/A').substring(0, 255);
          finding.description = item.message || item.description || 'No description available.';
          finding.recommendation = item.remediation || 'Refer to CloudSploit documentation for the specific plugin.'; // CloudSploit output might not always have direct remediation in JSON.

          parsedFindings.push(finding);
        }
      }
      return { success: true, findings: parsedFindings };
    } catch (error: any) {
      console.error(`Failed to parse CloudSploit output: ${error.message}`);
      return { success: false, findings: [], error: `Failed to parse CloudSploit output: ${error.message}` };
    }
  }
}
