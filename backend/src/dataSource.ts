// src/dataSource.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from './models/User';
// ServicePrincipal is deprecated and replaced by CloudCredentials
// import { ServicePrincipal } from './models/ServicePrincipal'; 
import { CloudCredentials } from './models/CloudCredentials';
import { Scan } from './models/Scan';
import { Findings } from './models/Findings';
import { ScanPolicy } from './models/ScanPolicy';
import { ScheduledScan } from './models/ScheduledScan'; // Added import
import { Report } from './models/Report';

import dotenv from 'dotenv';
dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',  // or your db type
  host: process.env.DB_HOST || 'localhost', // Fallback for local development
  port: parseInt(process.env.DB_PORT || '5432', 10), // Fallback for local development
  username: process.env.DB_USERNAME || 'postgres', // Fallback for local development only - SET DB_USERNAME in production
  password: process.env.DB_PASSWORD, // NO FALLBACK for password in production. SET DB_PASSWORD. For local dev, set it in .env or manually.
  database: process.env.DB_NAME || 'azure_security_db', // Fallback for local development
  entities: [User, CloudCredentials, Scan, Findings, Report, ScanPolicy, ScheduledScan], // ServicePrincipal removed
  synchronize: true, // Set to false in production; use migrations instead
  logging: process.env.NODE_ENV === 'development' ? true : false, // Enable logging in dev
});

// Validate essential DB credentials for production
if (process.env.NODE_ENV === 'production' && (!process.env.DB_USERNAME || !process.env.DB_PASSWORD || !process.env.DB_HOST || !process.env.DB_NAME)) {
  console.error('FATAL ERROR: Missing one or more critical database environment variables in production (DB_USERNAME, DB_PASSWORD, DB_HOST, DB_NAME).');
  // Optional: logger.fatal(...) if logger is configured to work before full app init, otherwise console.error is fine here.
  process.exit(1); // Exit if critical DB config is missing in production
}
