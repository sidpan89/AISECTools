// backend/src/workers/scanWorker.ts
import { Worker, Job } from 'bullmq';
import redisConnection from '../config/redisConfig';
import { ioInstance } from '../index'; // Added import for Socket.IO instance
import logger from '../utils/logger'; // Added import
import { QUEUE_NAME as SCAN_QUEUE_NAME, ScanJobData, ScanJobReturnValue } from '../queues/scanQueue'; // Assuming QUEUE_NAME is exported
import { AppDataSource } from '../dataSource';
import { Scan } from '../models/Scan';
import { CloudCredentials } from '../models/CloudCredentials';
import { ScanPolicy } from '../models/ScanPolicy';
import { Findings } from '../models/Findings'; // Assuming this is your Findings model
import { credentialService } from '../services/encryptionService'; // Corrected name
import { IScanner, ScanOptions, DecryptedCloudCredentials } from '../scanners/IScanner';
import { ProwlerScanner } from '../scanners/ProwlerScanner';
import { CloudSploitScanner } from '../scanners/CloudSploitScanner';
import { GcpSccScanner } from '../scanners/GcpSccScanner';
import path from 'path';
import fs from 'fs/promises';

const scanRepository = AppDataSource.getRepository(Scan);
const findingsRepository = AppDataSource.getRepository(Findings);
const cloudCredentialsRepository = AppDataSource.getRepository(CloudCredentials);
const scanPolicyRepository = AppDataSource.getRepository(ScanPolicy);


// The core processing function for a scan job
const processScanJob = async (job: Job<ScanJobData, ScanJobReturnValue>): Promise<ScanJobReturnValue> => {
  const { scanId, userId, credentialId, toolName, targetIdentifier, policyId } = job.data;
  logger.info(`Processing scan job ${job.id} for scan entity ID: ${scanId}`, { jobId: job.id, scanId });

  const scan = await scanRepository.findOneBy({ id: scanId });
  if (!scan) {
    logger.error(`Scan entity ID ${scanId} not found for job ${job.id}. Skipping.`, { jobId: job.id, scanId });
    throw new Error(`Scan entity ID ${scanId} not found.`);
  }

  try {
    await scanRepository.update(scanId, { status: 'in_progress', errorMessage: null, startedAt: new Date() });
    if (ioInstance && scan.userId) {
      const updatedScanInProgress = await scanRepository.findOneBy({ id: scanId });
      ioInstance.to(scan.userId.toString()).emit('scan_update', updatedScanInProgress);
      logger.debug('Emitted scan_update (in_progress)', { scanId, userId: scan.userId });
    }

    const cloudCredentials = await cloudCredentialsRepository.findOneBy({ id: credentialId, userId });
    if (!cloudCredentials) {
      throw new Error(`CloudCredentials ID ${credentialId} not found or not authorized for user ${userId}.`);
    }
    const decryptedJsonCredentials = credentialService.decrypt(cloudCredentials.encryptedCredentials);
    const decryptedCredentials = JSON.parse(decryptedJsonCredentials) as DecryptedCloudCredentials;

    let policyConfiguration: any | undefined = undefined;
    if (policyId) {
      const policy = await scanPolicyRepository.findOneBy({ id: policyId, userId });
      if (!policy) throw new Error(`ScanPolicy ID ${policyId} not found or not authorized.`);
      if (policy.provider !== cloudCredentials.provider || policy.tool.toLowerCase() !== toolName.toLowerCase()) {
        throw new Error(`Scan policy provider or tool does not match scan request.`);
      }
      policyConfiguration = policy.definition;
    }

    let scanner: IScanner;
    const tool = toolName.toLowerCase();
    if (tool === 'prowler') scanner = new ProwlerScanner();
    else if (tool === 'cloudsploit') scanner = new CloudSploitScanner();
    else if (tool === 'gcp-scc') scanner = new GcpSccScanner();
    else throw new Error(`Unsupported tool: ${toolName}`);

    if (!scanner.supportedProviders.includes(cloudCredentials.provider)) {
      throw new Error(`Scanner ${scanner.toolName} does not support provider: ${cloudCredentials.provider}`);
    }
    
    // Define output directory for this specific job/scan
    const outputDirectory = path.join('scan_outputs', scanId.toString()); // Ensure this path is writable
    await fs.mkdir(outputDirectory, { recursive: true });

    const scanOptions: ScanOptions = {
      credentials: decryptedCredentials,
      cloudProvider: cloudCredentials.provider,
      outputDirectory,
      target: targetIdentifier || undefined,
      policyConfiguration,
    };

    const scanRunResult = await scanner.runScan(scanOptions);
    if (!scanRunResult.success) {
      throw new Error(scanRunResult.error || `Scan execution failed for tool ${toolName}`);
    }

    await scanRepository.update(scanId, { status: 'parsing_output' });
    if (ioInstance && scan.userId) {
      const updatedScanParsing = await scanRepository.findOneBy({ id: scanId });
      ioInstance.to(scan.userId.toString()).emit('scan_update', updatedScanParsing);
      logger.debug('Emitted scan_update (parsing_output)', { scanId, userId: scan.userId });
    }
    const parseResult = await scanner.parseOutput(scanRunResult.rawOutputPaths, scanId);

    if (!parseResult.success) {
      throw new Error(parseResult.error || `Output parsing failed for tool ${toolName}`);
    }

    if (parseResult.findings.length > 0) {
      // Ensure scanId is set on each finding before bulk saving
      const findingsToSave = parseResult.findings.map(f => ({ ...f, scanId: scanId }));
      await findingsRepository.save(findingsToSave);
      logger.info(`Saved findings for scan job`, { jobId: job.id, scanId, findingsCount: parseResult.findings.length });
    } else {
      logger.info(`No findings to save for scan job`, { jobId: job.id, scanId });
    }
    
    await scanRepository.update(scanId, { status: 'completed', completedAt: new Date(), errorMessage: null });
    logger.info(`Scan job completed successfully`, { jobId: job.id, scanId });
    if (ioInstance && scan.userId) {
      const completedScan = await scanRepository.findOneBy({ id: scanId });
      // Consider adding finding count if relation is loaded or a summary field is added to Scan model
      ioInstance.to(scan.userId.toString()).emit('scan_update', { ...completedScan, message: 'Scan completed successfully!' });
      logger.info('Emitted scan_update (completed)', { scanId, userId: scan.userId });
    }
    // Return void or any specific value BullMQ Professional might use

  } catch (error: any) {
    logger.error(`Error processing scan job`, { jobId: job.id, scanId, error: error.message, stack: error.stack, fullError: error });
    // Update scan entity with error
    const errorMessage = error.message || 'Unknown error during scan processing.';
    await scanRepository.update(scanId, { 
        status: determineFailedStatus(error.message), // Helper to set more specific failed status
        completedAt: new Date(), 
        errorMessage: errorMessage.substring(0, 1023) // Ensure it fits if errorMessage field has length limit
    }).catch(updateErr => logger.error(`Failed to update scan with error state after job failure`, { scanId, originalJobError: error.message, updateError: updateErr.message, updateErrorStack: updateErr.stack }));
    
    if (ioInstance && scan?.userId) { // scan might be null if initial fetch failed, though less likely here
      const failedScan = await scanRepository.findOneBy({ id: scanId }); // Get the updated scan with error message
      ioInstance.to(scan.userId.toString()).emit('scan_update', failedScan);
      logger.info('Emitted scan_update (failed)', { scanId, userId: scan.userId, error: errorMessage });
    }
    throw error; // Re-throw to let BullMQ handle retries/failure
  }
};

// Helper function to determine a more specific failed status
function determineFailedStatus(errorMessage: string): string {
    if (errorMessage.includes("Scan execution failed")) return 'failed_execution';
    if (errorMessage.includes("Output parsing failed")) return 'failed_parsing';
    if (errorMessage.includes("not found or not authorized")) return 'failed_auth'; // Example
    return 'failed';
}


// Initialize and start the worker
// The concurrency option specifies how many jobs this worker can process in parallel.
const workerOptions = {
  connection: redisConnection,
  concurrency: parseInt(process.env.SCAN_WORKER_CONCURRENCY || "5", 10), // Default to 5 concurrent jobs
  // Other options like limiter for rate limiting if needed
};

export const scanWorker = new Worker<ScanJobData, ScanJobReturnValue>(SCAN_QUEUE_NAME, processScanJob, workerOptions);

logger.info(`BullMQ Scan Worker started`, { queueName: SCAN_QUEUE_NAME, concurrency: workerOptions.concurrency });

// Event listeners for worker events (optional but good for monitoring)
scanWorker.on('completed', (job, returnValue) => {
  logger.info(`Worker: Job completed`, { jobId: job.id, returnValue });
});

scanWorker.on('failed', (job, failedReason) => {
  logger.error(`Worker: Job failed`, { jobId: job?.id || 'unknown', failedReason });
});

scanWorker.on('error', err => {
  logger.error('Worker encountered an unhandled error', { error: err.message, stack: err.stack });
});

// Ensure this worker is started when the application runs.
// This could be done by importing this file in index.ts or app.ts,
// or by having a separate worker process entry point.
// For now, importing it in index.ts (after DataSource init) is fine.
```
