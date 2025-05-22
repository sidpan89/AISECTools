// src/services/scanService.ts
import { AppDataSource } from '../dataSource';
import { Scan } from '../models/Scan';
import { Findings } from '../models/Findings';
import { CloudCredentials } from '../models/CloudCredentials';
// CloudProvider is imported by Scan.ts, not directly needed here unless for specific checks
import { credentialService } from './encryptionService'; // Corrected name
import { ScanPolicy } from '../models/ScanPolicy'; // Added import
import { ProwlerScanner } from '../scanners/ProwlerScanner';
import { CloudSploitScanner } from '../scanners/CloudSploitScanner';
import { GcpSccScanner } from '../scanners/GcpSccScanner'; // Added import
import { IScanner, ScanOptions, DecryptedCloudCredentials } from '../scanners/IScanner';
import path from 'path';
import fs from 'fs/promises';

const scanRepository = AppDataSource.getRepository(Scan);
const findingsRepository = AppDataSource.getRepository(Findings);
const cloudCredentialsRepository = AppDataSource.getRepository(CloudCredentials);

export const scanService = {
  async getScansForUser(userId: number) {
    return await scanRepository.find({ where: { userId } });
  },

  async startScan(userId: number, credentialId: number, toolName: string, targetIdentifier?: string, policyId?: number) {
    // 1. Fetch CloudCredentials
    const cloudCredential = await cloudCredentialsRepository.findOneBy({ id: credentialId, userId });
    if (!cloudCredential) {
      // Cannot create scan record if credential not found, so throw error early.
      throw new Error('CloudCredentials not found or user does not have access.');
    }

    // 2. Create and save initial scan record
    let newScan = scanRepository.create({
      userId,
      credentialId,
      cloudProvider: cloudCredential.provider,
      tool: toolName,
      targetIdentifier: targetIdentifier || null,
      policyId: policyId || null, // Store the policyId with the scan
      status: 'pending', // Initial status
      errorMessage: null,
    });
    await scanRepository.save(newScan);

    try {
      // 3. Fetch Scan Policy and Prepare policyConfiguration
      let policyConfiguration: any | undefined = undefined;
      if (policyId) {
        const scanPolicyRepository = AppDataSource.getRepository(ScanPolicy);
        const policy = await scanPolicyRepository.findOneBy({ id: policyId, userId: userId });
        if (!policy) {
          // Handle policy not found or not belonging to user
          // Update scan record with error and throw
          await scanRepository.update(newScan.id, { status: 'failed', completedAt: new Date(), errorMessage: `Scan policy with ID ${policyId} not found or not authorized.` });
          throw new Error(`Scan policy with ID ${policyId} not found or not authorized.`);
        }
        if (policy.provider !== cloudCredential.provider || policy.tool.toLowerCase() !== toolName.toLowerCase()) {
          // Handle policy mismatch with selected provider or tool
          await scanRepository.update(newScan.id, { status: 'failed', completedAt: new Date(), errorMessage: `Scan policy provider or tool does not match scan request.` });
          throw new Error(`Scan policy provider or tool does not match scan request.`);
        }
        policyConfiguration = policy.definition;
      }

      // 4. Decrypt Credentials
      const decryptedJsonString = credentialService.decrypt(cloudCredential.encryptedCredentials);
      const decryptedCredentials: DecryptedCloudCredentials = JSON.parse(decryptedJsonString);

      // 5. Scanner Instantiation
      let scanner: IScanner;
      const tool = toolName.toLowerCase(); // Normalize tool name for comparison

      if (tool === 'prowler') {
        scanner = new ProwlerScanner();
      } else if (tool === 'cloudsploit') {
        scanner = new CloudSploitScanner();
      } else if (tool === 'gcp-scc') { // Add this new case for GCP SCC
        scanner = new GcpSccScanner();
      } else {
        console.error(`Unsupported tool: ${toolName}`);
        await scanRepository.update(newScan.id, {
          status: 'failed', 
          completedAt: new Date(),
          errorMessage: `Unsupported tool: ${toolName}` 
        });
        throw new Error(`Unsupported tool: ${toolName}`);
      }

      // Check if the selected scanner supports the provider
      if (!scanner.supportedProviders.includes(cloudCredential.provider)) { // Used cloudCredential.provider as it's the correct variable in context
        const errorMessage = `Scanner ${scanner.toolName} does not support provider: ${cloudCredential.provider}`; // Used cloudCredential.provider
        console.error(errorMessage);
        await scanRepository.update(newScan.id, {
          status: 'failed', 
          completedAt: new Date(),
          errorMessage 
        });
        throw new Error(errorMessage);
      }

      // 5. Output Directory
      const outputDirectory = path.join('scan_outputs', newScan.id.toString());
      await fs.mkdir(outputDirectory, { recursive: true });

      // 6. Prepare ScanOptions
      const scanOptions: ScanOptions = {
        credentials: decryptedCredentials,
        cloudProvider: cloudCredential.provider,
        outputDirectory,
        target: targetIdentifier,
        policyConfiguration: policyConfiguration, // Pass the fetched policy definition
      };

      // 7. Update Scan Status to 'in_progress'
      newScan.status = 'in_progress';
      await scanRepository.save(newScan);

      // 8. Execute Scan
      const scanRunResult = await scanner.runScan(scanOptions);

      if (!scanRunResult.success) {
        newScan.errorMessage = scanRunResult.error || 'Scan execution failed with no specific error message.';
        // Throw an error to be caught by the main try-catch, which will set status to 'failed_execution'
        throw new Error(`Scan execution failed for tool ${toolName}: ${scanRunResult.error}`);
      }

      // 9. Update Scan Status to 'parsing_output'
      newScan.status = 'parsing_output';
      await scanRepository.save(newScan);

      // 10. Parse Output
      const parseResult = await scanner.parseOutput(scanRunResult.rawOutputPaths, newScan.id);

      if (!parseResult.success) {
        newScan.errorMessage = parseResult.error || 'Output parsing failed with no specific error message.';
         // Throw an error to be caught by the main try-catch, which will set status to 'failed_parsing'
        throw new Error(`Output parsing failed for tool ${toolName}: ${parseResult.error}`);
      }

      // 11. Save Findings
      // The ProwlerScanner.parseOutput is designed to associate scanId already.
      await findingsRepository.save(parseResult.findings);
      console.log(`Saved ${parseResult.findings.length} findings for scan ${newScan.id}`);

      // 12. Update Scan Status to 'completed'
      newScan.status = 'completed';
      newScan.completedAt = new Date();
      newScan.errorMessage = null; // Clear any previous error message on success
      await scanRepository.save(newScan);

      return newScan;

    } catch (error: any) {
      console.error(`Scan process failed for scan ID ${newScan.id}: ${error.message}`);
      if (newScan && newScan.id) { // Ensure newScan and its ID are available
        // Determine appropriate failed status based on current status
        if (newScan.status === 'parsing_output') {
          newScan.status = 'failed_parsing';
        } else if (newScan.status === 'in_progress') {
          newScan.status = 'failed_execution';
        } else {
          newScan.status = 'failed'; // Generic failure
        }
        newScan.completedAt = new Date();
        newScan.errorMessage = error.message;
        await scanRepository.save(newScan);
      }
      // Re-throw the error so the controller can handle it appropriately
      throw error; 
    }
  },

  async getFindingsForScan(userId: number, scanId: number) {
    // Check if scan belongs to user
    const scan = await scanRepository.findOneBy({ id: scanId, userId });
    if (!scan) throw new Error('Scan not found or not authorized');

    return await findingsRepository.find({ where: { scanId } });
  },

  // Potentially more methods to process scanner output, parse JSON, etc.
};
