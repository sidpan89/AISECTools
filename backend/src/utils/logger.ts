// src/utils/logger.ts

export const logger = {
  info: (message: string) => console.log(`[INFO] ${message}`),
  error: (message: string) => console.error(`[ERROR] ${message}`),
  // Add more levels if needed
};
