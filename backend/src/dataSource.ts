// src/dataSource.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from './models/User';
import { ServicePrincipal } from './models/ServicePrincipal';
import { CloudCredentials } from './models/CloudCredentials';
import { Scan } from './models/Scan';
import { Findings } from './models/Findings';
import { ScanPolicy } from './models/ScanPolicy';
import { ScheduledScan } from './models/ScheduledScan'; // Added import
import { Report } from './models/Report';

import dotenv from 'dotenv';
dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',  // or 'mysql'
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'password',
  database: process.env.DB_NAME || 'azure_security_db',
  entities: [User, ServicePrincipal, CloudCredentials, Scan, Findings, Report, ScanPolicy, ScheduledScan], // Added ScheduledScan
  synchronize: true, // Set to false in production
  logging: false,
});
