// src/utils/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[ERROR]', err);
  // If you have custom error objects, you can parse them here
  res.status(500).json({ message: err.message || 'Internal Server Error' });
};
