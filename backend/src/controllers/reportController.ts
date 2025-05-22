// src/controllers/reportController.ts
import { Request, Response, NextFunction } from 'express';
import { reportService } from '../services/reportService';
import logger from '../utils/logger'; // Added import

export const generateReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user.id;
    const { scanId, format } = req.body;
    const reportUrl = await reportService.generateReport(userId, scanId, format);
    logger.info('Report generated successfully', { userId: (req as any).user.id, scanId: req.body.scanId, format: req.body.format, reportUrl, path: req.path, method: req.method });
    return res.json({ reportUrl });
  } catch (err) {
    logger.error('Failed to generate report', { 
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
