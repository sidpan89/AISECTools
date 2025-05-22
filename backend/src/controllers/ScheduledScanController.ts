// backend/src/controllers/ScheduledScanController.ts
import { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../dataSource';
import logger from '../utils/logger'; // Added import
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
      logger.warn('Create scheduled scan validation failed: Missing required fields', { userId, body: req.body, path: req.path, method: req.method });
      return res.status(400).json({ message: 'Missing required fields: name, credentialId, toolName, cronExpression' });
    }
    if (!cron.validate(cronExpression)) {
        logger.warn('Create scheduled scan validation failed: Invalid cron expression', { userId, cronExpression, path: req.path, method: req.method });
        return res.status(400).json({ message: 'Invalid cron expression.' });
    }

    // Verify credentialId and policyId (if provided) belong to the user and exist
    const cred = await AppDataSource.getRepository(CloudCredentials).findOneBy({id: credentialId, userId});
    if (!cred) {
        logger.warn('Create/Update scheduled scan: Credential not found or not authorized', { userId, credentialId, path: req.path, method: req.method });
        return res.status(404).json({message: "Credential not found or not authorized"});
    }
    
    if (policyId) {
        const policy = await AppDataSource.getRepository(ScanPolicy).findOneBy({id: policyId, userId});
        if (!policy) {
            logger.warn('Create/Update scheduled scan: Scan policy not found or not authorized', { userId, policyId, path: req.path, method: req.method });
            return res.status(404).json({message: "Scan policy not found or not authorized"});
        }
        if (policy.provider !== cred.provider || policy.tool.toLowerCase() !== toolName.toLowerCase()) {
            logger.warn('Create/Update scheduled scan: Scan policy provider/tool mismatch', { userId, policyId, credentialProvider: cred.provider, policyProvider: policy.provider, scheduleTool: toolName, policyTool: policy.tool, path: req.path, method: req.method });
            return res.status(400).json({ message: "Scan policy provider or tool does not match schedule's credential provider or tool." });
        }
    }

    const scheduler = await getScheduler();
    const newScheduledScan = scheduledScanRepository.create({ userId, name, description, credentialId, toolName, targetIdentifier, policyId, cronExpression, isEnabled });
    const savedSchedule = await scheduledScanRepository.save(newScheduledScan);
    
    if (savedSchedule.isEnabled) {
      scheduler.addOrUpdateJob(savedSchedule);
    }
    logger.info('Scheduled scan created', { userId, scheduleId: savedSchedule.id, name: savedSchedule.name, path: req.path, method: req.method });
    return res.status(201).json(savedSchedule);
  } catch (err) {
    logger.error('Failed to create scheduled scan', { 
      userId: (req as any).user?.id, 
      body: req.body,
      error: (err as Error).message, 
      stack: (err as Error).stack,
      path: req.path,
      method: req.method
    });
    next(err);
  }
};

export const getScheduledScansByUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const schedules = await scheduledScanRepository.find({ where: { userId }, relations: ["credential", "policy"] });
    return res.json(schedules);
  } catch (err) {
    logger.error('Failed to get scheduled scans by user', { 
      userId: (req as any).user?.id, 
      error: (err as Error).message, 
      stack: (err as Error).stack,
      path: req.path,
      method: req.method
    });
    next(err);
  }
};

export const getScheduledScanById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const scheduleId = parseInt(req.params.scheduleId, 10);
    const schedule = await scheduledScanRepository.findOne({ where: { id: scheduleId, userId }, relations: ["credential", "policy"] });
    if (!schedule) {
      logger.warn('Scheduled scan not found or not authorized for get by ID', { userId, scheduleId, path: req.path, method: req.method });
      return res.status(404).json({ message: 'Scheduled scan not found or not authorized' });
    }
    return res.json(schedule);
  } catch (err) {
    logger.error('Failed to get scheduled scan by ID', { 
      userId: (req as any).user?.id, 
      scheduleId: req.params.scheduleId,
      error: (err as Error).message, 
      stack: (err as Error).stack,
      path: req.path,
      method: req.method
    });
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
      logger.warn('Scheduled scan not found or not authorized for update', { userId, scheduleId, path: req.path, method: req.method });
      return res.status(404).json({ message: 'Scheduled scan not found or not authorized' });
    }

    if (updates.cronExpression && !cron.validate(updates.cronExpression)) {
        logger.warn('Update scheduled scan validation failed: Invalid cron expression', { userId, scheduleId, cronExpression: updates.cronExpression, path: req.path, method: req.method });
        return res.status(400).json({ message: 'Invalid cron expression.' });
    }
    
    // Validate credential and policy if they are being changed or if tool/provider context changes
    const newCredentialId = updates.credentialId || schedule.credentialId;
    const newToolName = updates.toolName || schedule.toolName;
    const newPolicyId = updates.policyId === undefined ? schedule.policyId : updates.policyId; // Allows setting policyId to null

    const cred = await AppDataSource.getRepository(CloudCredentials).findOneBy({id: newCredentialId, userId});
    if (!cred) {
        logger.warn('Update scheduled scan: Credential not found or not authorized', { userId, newCredentialId, path: req.path, method: req.method });
        return res.status(404).json({message: "Credential not found or not authorized for update."});
    }
    if (newPolicyId) {
        const policy = await AppDataSource.getRepository(ScanPolicy).findOneBy({id: newPolicyId, userId});
        if (!policy) {
            logger.warn('Update scheduled scan: Scan policy not found or not authorized', { userId, newPolicyId, path: req.path, method: req.method });
            return res.status(404).json({message: "Scan policy not found or not authorized for update."});
        }
        if (policy.provider !== cred.provider || policy.tool.toLowerCase() !== newToolName.toLowerCase()) {
            logger.warn('Update scheduled scan: Scan policy provider/tool mismatch', { userId, newPolicyId, credentialProvider: cred.provider, policyProvider: policy.provider, scheduleTool: newToolName, policyTool: policy.tool, path: req.path, method: req.method });
            return res.status(400).json({ message: "Scan policy provider or tool does not match schedule's credential provider or tool for update." });
        }
    }

    Object.assign(schedule, updates);
    const updatedSchedule = await scheduledScanRepository.save(schedule);
    
    const scheduler = await getScheduler();
    scheduler.addOrUpdateJob(updatedSchedule); // This will reschedule if enabled, or remove if disabled
    logger.info('Scheduled scan updated', { userId, scheduleId: updatedSchedule.id, path: req.path, method: req.method });
    return res.json(updatedSchedule);
  } catch (err) {
    logger.error('Failed to update scheduled scan', { 
      userId: (req as any).user?.id, 
      scheduleId: req.params.scheduleId,
      body: req.body,
      error: (err as Error).message, 
      stack: (err as Error).stack,
      path: req.path,
      method: req.method
    });
    next(err);
  }
};

export const deleteScheduledScan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const scheduleId = parseInt(req.params.scheduleId, 10);

    const schedule = await scheduledScanRepository.findOneBy({ id: scheduleId, userId });
    if (!schedule) {
      logger.warn('Scheduled scan not found or not authorized for delete', { userId, scheduleId, path: req.path, method: req.method });
      return res.status(404).json({ message: 'Scheduled scan not found or not authorized' });
    }

    const scheduler = await getScheduler();
    scheduler.removeJob(scheduleId); // Remove from cron scheduler
    
    await scheduledScanRepository.remove(schedule); // Remove from DB
    logger.info('Scheduled scan deleted', { userId, scheduleId, path: req.path, method: req.method });
    return res.status(204).send();
  } catch (err) {
    logger.error('Failed to delete scheduled scan', { 
      userId: (req as any).user?.id, 
      scheduleId: req.params.scheduleId,
      error: (err as Error).message, 
      stack: (err as Error).stack,
      path: req.path,
      method: req.method
    });
    next(err);
  }
};

// Need to import 'cron' for validation in create/update
import cron from 'node-cron';
