// src/services/authService.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger'; // Added import
import { AppDataSource } from '../dataSource';
import { User } from '../models/User';
import { Request, Response, NextFunction } from 'express';

const userRepository = AppDataSource.getRepository(User);

export const authService = {
  async login(username: string, password: string) {
    const user = await userRepository.findOne({ where: { username } });
    if (!user) throw new Error('User not found');

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw new Error('Invalid credentials');

    // Issue JWT
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      if (process.env.NODE_ENV === 'production') {
        logger.error('FATAL ERROR: JWT_SECRET is not defined in production environment.');
        process.exit(1); // Exit if not set in production
      } else {
        logger.error('FATAL ERROR: JWT_SECRET is not defined. Please set it in your environment variables or .env file.');
        process.exit(1);
      }
    }
    const token = jwt.sign({ id: user.id, username: user.username }, jwtSecret, { // used user.username from user object
      expiresIn: '1h',
    });
    return { token, user }; // Return user object along with token
  },

  async register({ username, email, password }: { username: string; email: string; password: string }) {
    const existingUser = await userRepository.findOne({ where: [{ username }, { email }] });
    if (existingUser) throw new Error('User or email already exists');

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = userRepository.create({ username, email, passwordHash });
    await userRepository.save(newUser);
    return newUser;
  },
};

// Middleware to verify token for Express routes (existing)
export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ message: 'No token provided' });

  const token = header.split(' ')[1];
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      // This case should ideally not be reached if the app starts correctly with the check above.
      // However, as a safeguard during runtime:
      logger.error('JWT_SECRET not available during token verification. This indicates a severe configuration issue.');
      return res.status(500).json({ message: 'Server configuration error.' });
    }
    const decoded = jwt.verify(token, jwtSecret) as any;
    (req as any).user = decoded;
    return next();
  } catch (err) {
    logger.warn('Invalid JWT token presented', { error: (err as Error).message, tokenProvided: token ? 'yes' : 'no' });
    return res.status(401).json({ message: 'Invalid token' });
  }
};

// New function for Socket.IO authentication
export const verifyTokenSocket = (token: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('FATAL ERROR: JWT_SECRET is not defined for socket authentication.');
      // In a real scenario, this should prevent server startup or socket connections.
      return reject(new Error('JWT_SECRET not configured on server.'));
    }
    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        return reject(err);
      }
      resolve(decoded);
    });
  });
};
