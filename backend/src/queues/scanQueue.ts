// backend/src/queues/scanQueue.ts
import { Queue, QueueOptions } from 'bullmq';
import redisConnection from '../config/redisConfig';

const QUEUE_NAME = 'scan-execution';

// Define the type of data our job will carry
export interface ScanJobData {
  scanId: number; // ID of the Scan entity
  userId: number;
  // Add other necessary data that the worker needs to perform the scan,
  // e.g., credentialId, toolName, targetIdentifier, policyId.
  // These are passed when the job is added to the queue.
  credentialId: number;
  toolName: string;
  targetIdentifier?: string | null;
  policyId?: number | null;
}

// Define the type for the job's return value (if any, for BullMQ Professional)
// For open-source BullMQ, workers typically report results via other means (e.g., updating DB).
export type ScanJobReturnValue = void; // Or an object with summary/status

const queueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // Number of times to retry a failed job
    backoff: {
      type: 'exponential',
      delay: 1000, // Initial delay in ms
    },
    removeOnComplete: { // Keep a certain number of completed jobs or remove them
      count: 1000, // Keep last 1000 completed jobs
      age: 24 * 60 * 60, // Keep for 24 hours
    },
    removeOnFail: { // Keep failed jobs for debugging
      count: 5000,
      age: 7 * 24 * 60 * 60, // Keep for 7 days
    },
  },
};

export const scanQueue = new Queue<ScanJobData, ScanJobReturnValue>(QUEUE_NAME, queueOptions);

// Optional: Event listeners for the queue (useful for logging/monitoring)
scanQueue.on('waiting', (jobId) => {
  console.log(`Scan job ${jobId} is waiting.`);
});

scanQueue.on('active', (job) => {
  console.log(`Scan job ${job.id} is active.`);
});

scanQueue.on('completed', (job, result) => {
  console.log(`Scan job ${job.id} completed.`);
});

scanQueue.on('failed', (job, err) => {
  console.error(`Scan job ${job?.id || 'unknown'} failed with error: ${err.message}`, err.stack);
});

console.log(`BullMQ Scan Queue "${QUEUE_NAME}" initialized.`);
