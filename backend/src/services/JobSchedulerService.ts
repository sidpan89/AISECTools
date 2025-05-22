// backend/src/services/JobSchedulerService.ts
import cron from 'node-cron';
import { AppDataSource } from '../dataSource';
import { ScheduledScan } from '../models/ScheduledScan';
import { scanService } from './scanService'; // Assuming scanService is exportable and named so
// import { LessThanOrEqual, MoreThanOrEqual, IsNull, FindOptionsWhere } from 'typeorm'; // These seem unused


interface RunningJob {
  scheduledScanId: number;
  cronJob: cron.ScheduledTask;
}

export class JobSchedulerService {
  private static _instance: JobSchedulerService;
  private runningJobs: Map<number, RunningJob> = new Map();
  private scheduledScanRepository = AppDataSource.getRepository(ScheduledScan);

  private constructor() {
    if (!AppDataSource.isInitialized) {
        console.warn("DataSource not initialized when JobSchedulerService constructor called. Schedules might not load immediately.");
        // Attempt to initialize schedules later or ensure AppDataSource is initialized before first call to getInstance
    } else {
        this.initializeSchedules().catch(error => {
            console.error("Failed to initialize job schedules in constructor:", error);
        });
    }
  }

  public static async getInstance(): Promise<JobSchedulerService> {
    if (!AppDataSource.isInitialized) {
        console.log("Waiting for DataSource to initialize before getting JobSchedulerService instance...");
        await AppDataSource.initialize(); // Ensure it's initialized
        console.log("DataSource initialized.");
    }
    if (!JobSchedulerService._instance) {
        JobSchedulerService._instance = new JobSchedulerService();
        // If constructor didn't run initializeSchedules due to timing, call it now.
        if (this._instance.runningJobs.size === 0 && AppDataSource.isInitialized) {
             await JobSchedulerService._instance.initializeSchedules().catch(error => {
                console.error("Failed to initialize job schedules in getInstance:", error);
            });
        }
    }
    return JobSchedulerService._instance;
  }
  
  // Make initializeSchedules public if called from getInstance after constructor check
  public async initializeSchedules(): Promise<void> { 
    if (!AppDataSource.isInitialized) {
        console.error("Cannot initialize schedules, DataSource not ready.");
        return;
    }
    console.log('Initializing job schedules...');
    const activeSchedules = await this.scheduledScanRepository.find({
      where: { isEnabled: true },
      relations: ['credential'], // Ensure credential relation is loaded for provider info
    });

    for (const schedule of activeSchedules) {
      this.scheduleJob(schedule);
    }
    console.log(`Initialized ${this.runningJobs.size} scheduled jobs.`);
  }

  private scheduleJob(scheduledScan: ScheduledScan): void {
    if (!cron.validate(scheduledScan.cronExpression)) {
      console.error(`Invalid cron expression for scheduled scan ID ${scheduledScan.id}: ${scheduledScan.cronExpression}`);
      return;
    }

    // If a job for this schedule already exists, stop and remove it before rescheduling
    this.removeJob(scheduledScan.id, false); // false to not update DB as we are about to schedule it

    const cronJob = cron.schedule(scheduledScan.cronExpression, async () => {
      console.log(`Executing scheduled scan ID ${scheduledScan.id}: ${scheduledScan.name}`);
      try {
        // Update lastRunAt and nextRunAt (nextRunAt is tricky with node-cron directly,
        // cron.sendToAvoidNextRun() can be used or we can estimate based on cron expression)
        // For simplicity, we'll just update lastRunAt here.
        // A more robust solution for nextRunAt might involve a library that can parse cron expressions.
        scheduledScan.lastRunAt = new Date();
        // TODO: Calculate nextRunAt accurately. For now, it can be updated manually or by a periodic task.
        // One simple way to get next run is from the cronJob object itself if the library supports it easily,
        // otherwise, it might be complex. Let's assume for now `node-cron` doesn't directly give next run easily post-hoc.
        // cronJob.nextDate() might exist or similar.
        // A common pattern is to query the job for its next invocation time.
        // Let's assume node-cron's ScheduledTask might have a method like .nextDates() or similar.
        // If not, we will skip updating nextRunAt from here for now.
        
        // Example: If cronJob.nextDates() exists (from some versions/types of node-cron or extensions)
        // const nextDate = (cronJob as any).nextDates ? (cronJob as any).nextDates(1)[0] : null;
        // if (nextDate) scheduledScan.nextRunAt = nextDate.toDate();
        
        await this.scheduledScanRepository.save(scheduledScan);

        await scanService.startScan(
          scheduledScan.userId,
          scheduledScan.credentialId,
          scheduledScan.toolName,
          scheduledScan.targetIdentifier || undefined,
          scheduledScan.policyId || undefined
        );
        console.log(`Successfully triggered scheduled scan ID ${scheduledScan.id}`);
      } catch (error) {
        console.error(`Error executing scheduled scan ID ${scheduledScan.id}:`, error);
        // Optionally, update the ScheduledScan entity with error information or disable it after too many failures
      }
    });

    this.runningJobs.set(scheduledScan.id, { scheduledScanId: scheduledScan.id, cronJob });
    console.log(`Scheduled job ID ${scheduledScan.id} (${scheduledScan.name}) with cron: ${scheduledScan.cronExpression}`);
  }

  public addOrUpdateJob(scheduledScan: ScheduledScan): void {
    if (scheduledScan.isEnabled) {
      this.scheduleJob(scheduledScan);
    } else {
      this.removeJob(scheduledScan.id);
    }
  }

  public removeJob(scheduledScanId: number, updateDbIsEnabledFlag: boolean = true): void {
    const jobInfo = this.runningJobs.get(scheduledScanId);
    if (jobInfo) {
      jobInfo.cronJob.stop();
      this.runningJobs.delete(scheduledScanId);
      console.log(`Stopped and removed job for scheduled scan ID ${scheduledScanId}`);
      
      if (updateDbIsEnabledFlag) {
          this.scheduledScanRepository.update({ id: scheduledScanId }, { isEnabled: false, nextRunAt: null })
            .catch(err => console.error(`Failed to update isEnabled for schedule ${scheduledScanId}`, err));
      }
    }
  }

  // Method to be called at application startup - REMOVED in favor of getInstance pattern
  // public static async init(): Promise<JobSchedulerService> { ... }
}

// To instantiate and initialize (e.g., in your main app.ts or index.ts):
// JobSchedulerService.getInstance().then(scheduler => { ... });
// The explicit export of an instance is removed in favor of the static getInstance method.
