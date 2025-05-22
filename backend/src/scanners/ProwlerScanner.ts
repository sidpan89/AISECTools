// backend/src/scanners/ProwlerScanner.ts
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs/promises';
import path from 'path';
import { IScanner, ScanOptions, ScanRunResult, ScanParseResult, DecryptedCloudCredentials } from './IScanner';
import { Findings } from '../models/Findings'; // Adjust path as needed
import { CloudProvider } from '../models/enums/CloudProvider'; // Adjust path as needed
import { AppDataSource } from '../dataSource'; // Adjust path as needed

const execAsync = util.promisify(exec);

export class ProwlerScanner implements IScanner {
  public readonly toolName = 'Prowler';
  public readonly supportedProviders: CloudProvider[] = [CloudProvider.AWS, CloudProvider.AZURE, CloudProvider.GCP];

  async runScan(options: ScanOptions): Promise<ScanRunResult> {
    const { credentials, cloudProvider, outputDirectory, target, policyConfiguration } = options; // Added policyConfiguration
    const reportFileName = `prowler-output-${Date.now()}.json`;
    const reportFilePath = path.join(outputDirectory, reportFileName);

    let command = `prowler ${cloudProvider.toLowerCase()}`;

    // Temporary credential file handling (example for AWS and GCP)
    // Azure Service Principal might be passed via environment variables
    let tempCredFilePath: string | undefined;

    try {
      // Ensure output directory exists
      await fs.mkdir(outputDirectory, { recursive: true });

      // Construct Prowler command based on provider
      switch (cloudProvider) {
        case CloudProvider.AWS:
          // Prowler uses AWS SDK's default credential chain (env vars, ~/.aws/credentials, IAM roles)
          // If specific keys are provided:
          // const awsCreds = credentials as { accessKeyId: string, secretAccessKey: string, sessionToken?: string, region: string };
          // command += ` --profile temp-prowler-profile`; // Requires setting up a temporary profile or using env vars
          // For simplicity, this example assumes Prowler can pick up credentials from environment variables
          // or a pre-configured AWS profile. More robust handling would involve setting up temporary credential files
          // or directly passing credentials if Prowler supports it.
          // command += ` --region ${awsCreds.region || 'us-east-1'}`; // Example
          if (target) { // Assuming target is AWS Account ID
            command += ` --account-id ${target}`;
          }
          // It's often better to configure AWS credentials via environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, etc.)
          // that Prowler can automatically pick up.
          break;
        case CloudProvider.AZURE:
          const azureCreds = credentials as { tenantId: string, clientId: string, clientSecret: string, subscriptionId?: string };
          // Prowler for Azure typically uses Service Principal credentials passed via environment variables
          // e.g., AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID
          // Or can use --subscription-id <id> if logged in via `az login`
          command += ` --subscription-id ${target || azureCreds.subscriptionId || '<default_subscription_if_any>'}`;
          // Environment variables for SP auth are common: AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID
          break;
        case CloudProvider.GCP:
          const gcpCreds = credentials as { project_id: string, private_key: string, client_email: string /* ... other SA key fields */ };
          // Prowler for GCP can use a service account JSON key file.
          // We'll need to write these credentials to a temporary file.
          tempCredFilePath = path.join(outputDirectory, `gcp-sa-key-${Date.now()}.json`);
          await fs.writeFile(tempCredFilePath, JSON.stringify(credentials));
          command += ` --credentials-file ${tempCredFilePath}`;
          if (target && target !== gcpCreds.project_id) { // Target might be a different project than the SA's default
             command += ` --project-id ${target}`;
          } else {
             command += ` --project-id ${gcpCreds.project_id}`;
          }
          break;
        default:
          return { success: false, rawOutputPaths: [], error: `Unsupported provider: ${cloudProvider}` };
      }

      // Dynamically Append Prowler CLI Arguments from policyConfiguration
      if (policyConfiguration) {
        if (policyConfiguration.checks && Array.isArray(policyConfiguration.checks) && policyConfiguration.checks.length > 0) {
          command += ` --checks ${policyConfiguration.checks.join(' ')}`;
        }
        if (policyConfiguration.excludedChecks && Array.isArray(policyConfiguration.excludedChecks) && policyConfiguration.excludedChecks.length > 0) {
          command += ` --excluded-checks ${policyConfiguration.excludedChecks.join(' ')}`;
        }
        if (policyConfiguration.services && Array.isArray(policyConfiguration.services) && policyConfiguration.services.length > 0) {
          command += ` --services ${policyConfiguration.services.join(' ')}`;
        }
        if (policyConfiguration.complianceFrameworks && Array.isArray(policyConfiguration.complianceFrameworks) && policyConfiguration.complianceFrameworks.length > 0) {
          for (const framework of policyConfiguration.complianceFrameworks) {
              command += ` --compliance ${framework}`;
          }
        }
        // severityThreshold is intentionally omitted from direct command construction for now
        if (policyConfiguration.customArgs && typeof policyConfiguration.customArgs === 'string') {
          command += ` ${policyConfiguration.customArgs}`;
        }
      }

      // Ensure final command structure is correct
      command += ` --output-directory ${outputDirectory} --output-modes json --output-filename ${reportFileName} --status FAIL INFO`;

      console.log(`Executing Prowler command: ${command}`);
      // Note: Setting environment variables for AWS/Azure credentials might be needed here if not using profiles/instance roles
      // e.g., process.env.AWS_ACCESS_KEY_ID = ...
      const { stdout, stderr } = await execAsync(command, { 
        // Consider setting environment variables for credentials here if needed
        // env: { ...process.env, AWS_ACCESS_KEY_ID: '...', ... }
      });

      if (stderr && !stderr.includes("INFO") && !stderr.includes("WARNING")) { // Prowler often outputs non-critical info to stderr
        // A more sophisticated check for actual errors in stderr might be needed
        // For now, we'll log it and proceed, assuming the JSON output is the primary success indicator.
        console.warn(`Prowler stderr: ${stderr}`);
      }
      
      // Verify that the report file was created
      await fs.access(reportFilePath);

      return { success: true, rawOutputPaths: [reportFilePath] };

    } catch (error: any) {
      console.error(`Prowler execution failed for ${cloudProvider}: ${error.message}`);
      return { success: false, rawOutputPaths: [], error: error.message };
    } finally {
      // Clean up temporary credential file
      if (tempCredFilePath) {
        try {
          await fs.unlink(tempCredFilePath);
        } catch (cleanupError) {
          console.error(`Failed to clean up temporary credential file ${tempCredFilePath}: ${cleanupError}`);
        }
      }
    }
  }

  async parseOutput(rawOutputPaths: string[], scanId: number): Promise<ScanParseResult> {
    if (!rawOutputPaths || rawOutputPaths.length === 0) {
      return { success: false, findings: [], error: 'No raw output paths provided.' };
    }

    const findingsRepository = AppDataSource.getRepository(Findings);
    const parsedFindings: Findings[] = [];

    try {
      for (const outputFilePath of rawOutputPaths) {
        const reportContent = await fs.readFile(outputFilePath, 'utf-8');
        // Prowler's JSON output can be a single JSON object or a stream of JSON objects (ndjson).
        // The --output-modes json and --output-filename suggests a single file.
        // Let's assume it's an array of findings or a single object containing an array.
        // Prowler v3+ uses OCSF format, which is a single JSON object per finding, often in a JSON array if multiple findings.
        
        let prowlerReportData: any[];
        try {
          // Attempt to parse as a single JSON array
          prowlerReportData = JSON.parse(reportContent);
        } catch (e) {
          // If that fails, try parsing as ndjson (newline-delimited JSON)
          prowlerReportData = reportContent.trim().split('\n').map(line => JSON.parse(line));
        }


        if (!Array.isArray(prowlerReportData)) {
            // If it's a single object that might contain findings (older Prowler versions or specific structures)
            // This part needs to be adapted based on actual Prowler OCSF JSON structure.
            // For now, we'll assume the root is an array of finding objects.
            console.warn(`Prowler output at ${outputFilePath} is not a JSON array. Adjust parsing if needed.`);
            // Example: if (prowlerReportData.Findings) prowlerReportData = prowlerReportData.Findings; else throw new Error...
             return { success: false, findings: [], error: `Unexpected Prowler output format in ${outputFilePath}. Expected a JSON array.` };
        }

        for (const item of prowlerReportData) {
          const finding = new Findings();
          finding.scanId = scanId;

          // Severity Mapping: Based on sample: item.severity
          finding.severity = (item.severity || 'Unknown').substring(0, 255);

          // Category/Title Mapping: Based on sample: item.finding_info.title
          finding.category = (item.finding_info?.title || 'Unknown').substring(0, 255);

          // Resource Mapping: Based on sample: item.resources[0].uid or item.resources[0].name if uid is generic like "AppInsights"
          // Prowler's OCSF can have multiple resources. We'll take the first one.
          let resourceUid = 'N/A';
          if (item.resources && item.resources.length > 0) {
            resourceUid = item.resources[0].uid || item.resources[0].name || 'N/A';
          }
          finding.resource = resourceUid.substring(0, 255);

          // Description Mapping: Based on sample: item.finding_info.desc for general description,
          // or item.message for a more specific message if desc is too generic.
          // The sample also has item.status_detail which is often similar to item.message.
          let description = item.finding_info?.desc || item.message || item.status_detail || 'No description available.';
          finding.description = description; // Assuming TEXT field in DB

          // Recommendation Mapping: Based on sample: item.remediation.desc
          finding.recommendation = item.remediation?.desc || 'No recommendation available.'; // Assuming TEXT field in DB
          
          // Compliance Information (Optional - if you want to store it)
          // Example: Store compliance data as a JSON string in a 'complianceData' field
          // if (item.unmapped?.compliance) {
          //   try {
          //     finding.complianceData = JSON.stringify(item.unmapped.compliance);
          //   } catch (e) {
          //     console.warn('Failed to stringify compliance data for finding:', item.finding_info?.uid);
          //   }
          // }

          // Raw Finding UID (Optional - useful for debugging/correlation)
          // if (item.finding_info?.uid) {
          //    finding.rawFindingUid = item.finding_info.uid;
          // }

          parsedFindings.push(finding);
        }
      }
      return { success: true, findings: parsedFindings };
    } catch (error: any) {
      console.error(`Failed to parse Prowler output: ${error.message}`);
      return { success: false, findings: [], error: `Failed to parse Prowler output: ${error.message}` };
    }
  }
}
