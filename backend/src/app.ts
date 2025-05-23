// src/app.ts
import 'reflect-metadata';               // Required by TypeORM for decorators
import express from 'express';
import cors from 'cors';
import { errorHandler } from './utils/errorHandler';
import { AppDataSource } from './dataSource';  // TypeORM data source config (we'll define below)
import authRoutes from './routes/authRoutes';
import credentialRoutes from './routes/credentialRoutes';
import scanRoutes from './routes/scanRoutes';
import reportRoutes from './routes/reportRoutes';
// import other routes if needed

// Initialize the data source before creating the app
AppDataSource.initialize()
  .then(() => {
    console.log('Database connected successfully');
  })
  .catch((err: Error) => {
    console.error('Database connection error:', err);
  });

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/service-principals', credentialRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/reports', reportRoutes);
// Add other routes if needed

// Custom error handling
app.use(errorHandler);

export default app;
