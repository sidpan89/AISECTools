// src/controllers/reportController.ts
import { Request, Response, NextFunction } from 'express';
import { reportService } from '../services/reportService';

export const generateReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { scanId, format } = req.body;
    const reportUrl = await reportService.generateReport(userId, scanId, format);
    return res.json({ reportUrl });
  } catch (err) {
    next(err);
  }
};
