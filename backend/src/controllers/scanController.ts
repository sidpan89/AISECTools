// src/controllers/scanController.ts
import { Request, Response, NextFunction } from 'express';
import { scanService } from '../services/scanService';

export const getScans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const scans = await scanService.getScansForUser(userId);
    return res.json(scans);
  } catch (err) {
    next(err);
  }
};

export const startScan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { tools } = req.body;
    const newScan = await scanService.startScan(userId, tools);
    return res.status(201).json(newScan);
  } catch (err) {
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
    next(err);
  }
};
