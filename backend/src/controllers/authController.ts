// src/controllers/authController.ts
import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';
import logger from '../utils/logger'; // Added import

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body;
    const { token, user } = await authService.login(username, password); // Assume login returns user object
    logger.info('User login successful', { username: user.username, userId: user.id, path: req.path, method: req.method });
    return res.json({ token });
  } catch (err) {
    logger.error('Login failed', { 
      username: req.body.username, 
      error: (err as Error).message, 
      stack: (err as Error).stack,
      path: req.path,
      method: req.method
    });
    next(err);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, email, password } = req.body;
    const newUser = await authService.register({ username, email, password });
    logger.info('User registration successful', { username: newUser.username, userId: newUser.id, path: req.path, method: req.method });
    return res.status(201).json(newUser);
  } catch (err) {
    logger.error('User registration failed', { 
      username: req.body.username, 
      email: req.body.email,
      error: (err as Error).message, 
      stack: (err as Error).stack,
      path: req.path,
      method: req.method
    });
    next(err);
  }
};
