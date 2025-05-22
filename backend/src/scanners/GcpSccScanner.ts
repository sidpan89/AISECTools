// backend/src/scanners/GcpSccScanner.ts
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs/promises';
import path from 'path';
import { IScanner, ScanOptions, ScanRunResult, ScanParseResult, DecryptedCloudCredentials } from './IScanner';
import { Findings } from '../models/Findings';
import { CloudProvider } from '../models/enums/CloudProvider';
import { AppDataSource } from '../dataSource';

const execAsync = util.promisify(exec);

export class GcpSccScanner implements IScanner {
  public readonly toolName = 'GCP-SCC'; // GCP Security Command Center
  public readonly supportedProviders: CloudProvider[] = [CloudProvider.GCP];

  async runScan(options: ScanOptions): Promise<ScanRunResult> {
    const { credentials, outputDirectory, target, policyConfiguration } = options; // Added policyConfiguration

    if (options.cloudProvider !== CloudProvider.GCP) {
      return { success: false, rawOutputPaths: [], error: 'GCP-SCC scanner only supports GCP provider.' };
    }

    const reportFileName = `gcp-scc-findings-${Date.now()}.json`;
    const reportFilePath = path.join(outputDirectory, reportFileName);
    let tempGcpKeyFilePath: string | undefined;

    try {
      await fs.mkdir(outputDirectory, { recursive: true });

      // GCP credentials are a service account key JSON. Write to a temporary file.
      tempGcpKeyFilePath = path.join(outputDirectory, `gcp-sa-key-scc-${Date.now()}.json`);
      await fs.writeFile(tempGcpKeyFilePath, JSON.stringify(credentials));

      // Determine the parent resource for listing findings.
      // Target could be organization ID, folder ID, or project ID.
      // Format: organizations/[ORG_ID], folders/[FOLDER_ID], or projects/[PROJECT_ID]
      // If target is just a project ID, format it as projects/[PROJECT_ID].
      // For simplicity, let's assume 'target' is the parent (e.g., organizations/123 or projects/my-project).
      // If target is not provided, try to use the project_id from the credentials.
      const gcpCreds = credentials as { project_id?: string };
      const parent = target || `projects/${gcpCreds.project_id}`;
      
      if (!parent) {
          return { success: false, rawOutputPaths: [], error: 'Target (organization/folder/project) or credential project_id is required for GCP SCC scans.'};
      }

      let sccFilter = 'state="ACTIVE"'; // Default filter - note: no escaped quotes needed for execAsync direct string
      if (policyConfiguration && policyConfiguration.sccFilter && typeof policyConfiguration.sccFilter === 'string') {
        // Ensure user's filter is properly combined, especially if it contains spaces or special characters.
        // The gcloud --filter expects a single string. If policyConfiguration.sccFilter might have spaces,
        // it should be structured to be valid within the larger filter string.
        sccFilter += ` AND (${policyConfiguration.sccFilter})`; 
      }

      let customArgs = '';
      if (policyConfiguration && policyConfiguration.customGcloudArgs && typeof policyConfiguration.customGcloudArgs === 'string') {
        customArgs = ` ${policyConfiguration.customGcloudArgs}`; // Use with caution
      }

      // Command to list active findings. Filter can be added for specific finding types.
      // The output is already JSON.
      // Note: For execAsync, complex filter strings with spaces and quotes might need careful handling.
      // Using an array of arguments for execFile might be more robust if issues arise.
      // However, for now, constructing the string as gcloud expects.
      const command = `gcloud scc findings list "${parent}" --filter="${sccFilter}" --format="json"${customArgs} > "${reportFilePath}"`;
      
      // gcloud typically uses GOOGLE_APPLICATION_CREDENTIALS environment variable.
      const MASKED_COMMAND_FOR_LOG = `gcloud scc findings list "${parent}" --filter="${sccFilter}" --format="json"${customArgs} > "${reportFilePath}"`;
      console.log(`Executing GCP SCC command: ${MASKED_COMMAND_FOR_LOG}`);
      
      await execAsync(command, {
        env: {
          ...process.env,
          GOOGLE_APPLICATION_CREDENTIALS: tempGcpKeyFilePath,
          // CLOUDSDK_CORE_PROJECT: gcpCreds.project_id (might be needed if parent is not a project)
        }
      });
      
      // Check if report file was created and is not empty
      const stats = await fs.stat(reportFilePath);
      if (stats.size === 0) {
        // This could mean no findings, or an issue. gcloud might not error for "no findings".
        // We'll assume an empty file means no findings for now.
        await fs.writeFile(reportFilePath, '[]'); // Write an empty JSON array
      }

      return { success: true, rawOutputPaths: [reportFilePath] };

    } catch (error: any) {
      console.error(`GCP SCC execution failed: ${error.message}`);
      // Check if stderr contains specific gcloud errors
      if (error.stderr) {
        console.error(`GCP SCC stderr: ${error.stderr}`);
        return { success: false, rawOutputPaths: [], error: `gcloud error: ${error.stderr}` };
      }
      return { success: false, rawOutputPaths: [], error: error.message };
    } finally {
      if (tempGcpKeyFilePath) {
        try {
          await fs.unlink(tempGcpKeyFilePath);
        } catch (e) { console.error(`Failed to delete temp GCP key file ${tempGcpKeyFilePath}`, e); }
      }
    }
  }

  async parseOutput(rawOutputPaths: string[], scanId: number): Promise<ScanParseResult> {
    if (!rawOutputPaths || rawOutputPaths.length === 0) {
      return { success: false, findings: [], error: 'No raw output paths provided for GCP-SCC.' };
    }

    const findingsRepository = AppDataSource.getRepository(Findings);
    const parsedFindings: Findings[] = [];

    try {
      for (const outputFilePath of rawOutputPaths) {
        const reportContent = await fs.readFile(outputFilePath, 'utf-8');
        // gcloud scc findings list --format="json" outputs a JSON array of finding objects.
        const sccFindings = JSON.parse(reportContent);

        if (!Array.isArray(sccFindings)) {
          console.warn(`GCP SCC output at ${outputFilePath} is not a JSON array.`);
          return { success: false, findings: [], error: `Unexpected GCP SCC output format in ${outputFilePath}. Expected a JSON array.` };
        }

        for (const item of sccFindings) {
          // TODO: Detailed mapping from GCP SCC Finding resource structure to our Findings model.
          // Ref: https://cloud.google.com/security-command-center/docs/reference/rest/v1/organizations.sources.findings#Finding
          const finding = new Findings();
          finding.scanId = scanId;

          finding.severity = (item.finding?.severity || 'UNKNOWN_SEVERITY').substring(0, 255); // SEVERITY_UNSPECIFIED, CRITICAL, HIGH, MEDIUM, LOW
          finding.category = (item.finding?.category || 'Unknown Category').substring(0, 255); // Category display name
          finding.resource = (item.finding?.resourceName || 'N/A').substring(0, 255); // Full resource name
          
          // Description: SCC findings often have a description in sourceProperties, or category can be quite descriptive.
          // item.finding.description is usually not present. We might need to construct one.
          // For now, using category as a placeholder if nothing better is found.
          let description = item.finding?.sourceProperties?.Description || // Common for some sources
                              item.finding?.description || // Rarely used
                              item.finding?.category || // Fallback
                              'No specific description available.';
          finding.description = description;

          // Recommendation: Often found in sourceProperties or needs to be generic.
          let recommendation = item.finding?.sourceProperties?.Recommendation || // Common for some sources
                                 'Refer to GCP Security Command Center documentation for this finding category.';
          finding.recommendation = recommendation;
          
          // item.finding.name is the unique finding ID from SCC
          // item.finding.state (ACTIVE, INACTIVE)
          // item.finding.sourceProperties (object, contains source-specific details)
          // item.finding.eventTime

          parsedFindings.push(finding);
        }
      }
      return { success: true, findings: parsedFindings };
    } catch (error: any) {
      console.error(`Failed to parse GCP SCC output: ${error.message}`);
      return { success: false, findings: [], error: `Failed to parse GCP SCC output: ${error.message}` };
    }
  }
}
