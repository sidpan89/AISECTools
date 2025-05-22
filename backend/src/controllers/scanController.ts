// src/controllers/scanController.ts
import { Request, Response, NextFunction } from 'express';
import { scanService } from '../services/scanService';
import logger from '../utils/logger'; // Added import

export const getScans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const scans = await scanService.getScansForUser(userId);
    return res.json(scans);
  } catch (err) {
    logger.error('Failed to get scans for user', { 
      userId: (req as any).user?.id, 
      error: (err as Error).message, 
      stack: (err as Error).stack,
      path: req.path,
      method: req.method
    });
    next(err);
  }
};

export const startScan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    // Destructure all expected parameters for startScan from req.body
    const { credentialId, toolName, targetIdentifier, policyId } = req.body; 

    // Validate required parameters (credentialId and toolName)
    if (!credentialId || !toolName) {
      logger.warn('Missing required parameters for startScan', { userId, body: req.body, path: req.path, method: req.method });
      return res.status(400).json({ message: 'Missing required fields: credentialId, toolName' });
    }

    const newScan = await scanService.startScan(userId, credentialId, toolName, targetIdentifier, policyId);
    logger.info('Scan job enqueued successfully', { userId: (req as any).user.id, scanId: newScan.id, toolName: newScan.tool, credentialId: newScan.credentialId, path: req.path, method: req.method });
    return res.status(201).json(newScan);
  } catch (err) {
    logger.error('Failed to start scan / enqueue job', { 
      userId: (req as any).user?.id, 
      body: req.body, // Log request body for context (be mindful of sensitive data if any)
      error: (err as Error).message, 
      stack: (err as Error).stack,
      path: req.path,
      method: req.method
    });
    next(err);
  }
};

export const getFindingsForScan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const scanId = parseInt(req.params.scanId, 10);
    const findings = await scanService.getFindingsForScan(userId, scanId);
    return res.json(findings);
  } catch (err) {
    logger.error('Failed to get findings for scan', { 
      userId: (req as any).user?.id, 
      scanId: req.params.scanId,
      error: (err as Error).message, 
      stack: (err as Error).stack,
      path: req.path,
      method: req.method
    });
    next(err);
  }
};
