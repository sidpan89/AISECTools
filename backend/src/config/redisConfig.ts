// backend/src/config/redisConfig.ts
import { ConnectionOptions } from 'bullmq';

// It's highly recommended to use environment variables for sensitive data like passwords and hosts/ports.
const redisConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  // password: process.env.REDIS_PASSWORD || undefined, // Uncomment if your Redis has a password
  // Add other options like db, enableReadyCheck, maxRetriesPerRequest etc. as needed
};

export default redisConnection;
