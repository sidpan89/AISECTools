// src/services/scanService.ts
import { AppDataSource } from '../dataSource';
import { Scan } from '../models/Scan';
import { Findings } from '../models/Findings'; // Keep if getFindingsForScan is still relevant here
import { CloudCredentials } from '../models/CloudCredentials';
import { ScanPolicy } from '../models/ScanPolicy';
// Removed scanner-specific imports, path, fs, credentialService, IScanner as they are used in worker
import { scanQueue, ScanJobData } from '../queues/scanQueue'; // Added
// import { User } from '../models/User'; // User model not directly used in startScan for validation here

const scanRepository = AppDataSource.getRepository(Scan);
const findingsRepository = AppDataSource.getRepository(Findings); // Keep for getFindingsForScan
const cloudCredentialsRepository = AppDataSource.getRepository(CloudCredentials);
const scanPolicyRepository = AppDataSource.getRepository(ScanPolicy); // Added for policy validation

export const scanService = {
  async getScansForUser(userId: number) {
    return await scanRepository.find({ 
      where: { userId }, 
      order: { createdAt: 'DESC' } // Optional: order by creation date
    });
  },

  async startScan(
    userId: number, 
    credentialId: number, 
    toolName: string, 
    targetIdentifier?: string, 
    policyId?: number
  ): Promise<Scan> { // Returns the initially created Scan entity
    
    // 1. Validate Credentials and Policy (Pre-check before queueing)
    const credential = await cloudCredentialsRepository.findOneBy({ id: credentialId, userId });
    if (!credential) {
      throw new Error(`Credential with ID ${credentialId} not found or not authorized.`);
    }

    if (policyId) {
      const policy = await scanPolicyRepository.findOneBy({ id: policyId, userId });
      if (!policy) {
        throw new Error(`Scan policy with ID ${policyId} not found or not authorized.`);
      }
      if (policy.provider !== credential.provider || policy.tool.toLowerCase() !== toolName.toLowerCase()) {
        throw new Error(`Scan policy provider or tool does not match scan's credential provider or selected tool.`);
      }
    }
    
    // 2. Create Initial Scan Record with 'queued' status
    const newScan = scanRepository.create({
      userId,
      credentialId,
      cloudProvider: credential.provider, // Get provider from the credential
      tool: toolName,
      targetIdentifier: targetIdentifier || null,
      policyId: policyId || null,
      status: 'queued', // New initial status
      createdAt: new Date(), // Set by @CreateDateColumn, but good for explicitness if needed before save
      updatedAt: new Date(), // Set by @UpdateDateColumn
      errorMessage: null,
    });
    await scanRepository.save(newScan);
    console.log(`Scan record ${newScan.id} created with status 'queued'.`);

    // 3. Prepare Job Data
    const jobData: ScanJobData = {
      scanId: newScan.id,
      userId,
      credentialId,
      toolName,
      targetIdentifier: targetIdentifier || null,
      policyId: policyId || null,
    };

    // 4. Add Job to Queue
    await scanQueue.add(`scan-job-${newScan.id}`, jobData); // Job name can be more descriptive
    console.log(`Scan job for scan ${newScan.id} added to queue.`);

    // 5. Return the initially created scan entity
    return newScan;
  },

  async getFindingsForScan(userId: number, scanId: number) {
    // Check if scan belongs to user
    const scan = await scanRepository.findOneBy({ id: scanId, userId });
    if (!scan) throw new Error('Scan not found or not authorized');

    return await findingsRepository.find({ where: { scanId } });
  },
};
