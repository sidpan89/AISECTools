// src/services/authService.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
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
    const token = jwt.sign({ id: user.id, username }, process.env.JWT_SECRET || 'secret', {
      expiresIn: '1h',
    });
    return token;
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

// Middleware to verify token
export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ message: 'No token provided' });

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    (req as any).user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
