// backend/src/controllers/ScheduledScanController.ts
import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../dataSource';
import { ScheduledScan } from '../models/ScheduledScan';
import { JobSchedulerService } from '../services/JobSchedulerService'; // Import the class
import { CloudCredentials } from '../models/CloudCredentials';
import { ScanPolicy } from '../models/ScanPolicy';

const scheduledScanRepository = AppDataSource.getRepository(ScheduledScan);

// Helper to get scheduler instance
async function getScheduler() {
  return JobSchedulerService.getInstance();
}

export const createScheduledScan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { name, description, credentialId, toolName, targetIdentifier, policyId, cronExpression, isEnabled = true } = req.body;

    if (!name || !credentialId || !toolName || !cronExpression) {
      return res.status(400).json({ message: 'Missing required fields: name, credentialId, toolName, cronExpression' });
    }
    if (!cron.validate(cronExpression)) {
        return res.status(400).json({ message: 'Invalid cron expression.' });
    }

    // Verify credentialId and policyId (if provided) belong to the user and exist
    const cred = await AppDataSource.getRepository(CloudCredentials).findOneBy({id: credentialId, userId});
    if (!cred) return res.status(404).json({message: "Credential not found or not authorized"});
    
    if (policyId) {
        const policy = await AppDataSource.getRepository(ScanPolicy).findOneBy({id: policyId, userId});
        if (!policy) return res.status(404).json({message: "Scan policy not found or not authorized"});
        if (policy.provider !== cred.provider || policy.tool.toLowerCase() !== toolName.toLowerCase()) {
             return res.status(400).json({ message: "Scan policy provider or tool does not match schedule's credential provider or tool." });
        }
    }


    const scheduler = await getScheduler();
    const newScheduledScan = scheduledScanRepository.create({ userId, name, description, credentialId, toolName, targetIdentifier, policyId, cronExpression, isEnabled });
    const savedSchedule = await scheduledScanRepository.save(newScheduledScan);
    
    if (savedSchedule.isEnabled) {
      scheduler.addOrUpdateJob(savedSchedule);
    }
    return res.status(201).json(savedSchedule);
  } catch (err) {
    next(err);
  }
};

export const getScheduledScansByUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const schedules = await scheduledScanRepository.find({ where: { userId }, relations: ["credential", "policy"] });
    return res.json(schedules);
  } catch (err) {
    next(err);
  }
};

export const getScheduledScanById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const scheduleId = parseInt(req.params.scheduleId, 10);
    const schedule = await scheduledScanRepository.findOne({ where: { id: scheduleId, userId }, relations: ["credential", "policy"] });
    if (!schedule) {
      return res.status(404).json({ message: 'Scheduled scan not found or not authorized' });
    }
    return res.json(schedule);
  } catch (err) {
    next(err);
  }
};

export const updateScheduledScan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const scheduleId = parseInt(req.params.scheduleId, 10);
    const updates = req.body; // { name, description, credentialId, toolName, targetIdentifier, policyId, cronExpression, isEnabled }

    const schedule = await scheduledScanRepository.findOneBy({ id: scheduleId, userId });
    if (!schedule) {
      return res.status(404).json({ message: 'Scheduled scan not found or not authorized' });
    }

    if (updates.cronExpression && !cron.validate(updates.cronExpression)) {
        return res.status(400).json({ message: 'Invalid cron expression.' });
    }
    
    // Validate credential and policy if they are being changed or if tool/provider context changes
    const newCredentialId = updates.credentialId || schedule.credentialId;
    const newToolName = updates.toolName || schedule.toolName;
    const newPolicyId = updates.policyId === undefined ? schedule.policyId : updates.policyId;

    const cred = await AppDataSource.getRepository(CloudCredentials).findOneBy({id: newCredentialId, userId});
    if (!cred) return res.status(404).json({message: "Credential not found or not authorized for update."});

    if (newPolicyId) {
        const policy = await AppDataSource.getRepository(ScanPolicy).findOneBy({id: newPolicyId, userId});
        if (!policy) return res.status(404).json({message: "Scan policy not found or not authorized for update."});
        if (policy.provider !== cred.provider || policy.tool.toLowerCase() !== newToolName.toLowerCase()) {
             return res.status(400).json({ message: "Scan policy provider or tool does not match schedule's credential provider or tool for update." });
        }
    }


    Object.assign(schedule, updates);
    const updatedSchedule = await scheduledScanRepository.save(schedule);
    
    const scheduler = await getScheduler();
    scheduler.addOrUpdateJob(updatedSchedule); // This will reschedule if enabled, or remove if disabled

    return res.json(updatedSchedule);
  } catch (err) {
    next(err);
  }
};

export const deleteScheduledScan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const scheduleId = parseInt(req.params.scheduleId, 10);

    const schedule = await scheduledScanRepository.findOneBy({ id: scheduleId, userId });
    if (!schedule) {
      return res.status(404).json({ message: 'Scheduled scan not found or not authorized' });
    }

    const scheduler = await getScheduler();
    scheduler.removeJob(scheduleId); // Remove from cron scheduler
    
    await scheduledScanRepository.remove(schedule); // Remove from DB

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// Need to import 'cron' for validation in create/update
import cron from 'node-cron';
