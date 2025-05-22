// src/index.ts
import app from './app';
import dotenv from 'dotenv';
import { AppDataSource } from './dataSource'; // Required for JobSchedulerService init
import { JobSchedulerService } from './services/JobSchedulerService'; // Added import

dotenv.config();

const PORT = process.env.PORT || 3000;

// Ensure AppDataSource is initialized before starting the server and scheduler
AppDataSource.initialize()
  .then(() => {
    console.log('Database connected successfully for server startup.');
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);

      // Initialize JobSchedulerService after server starts and DB is connected
      JobSchedulerService.init().then(scheduler => {
        console.log("JobSchedulerService initialized and schedules loaded.");
        // Optional: Make scheduler instance available globally if needed
        // app.set('scheduler', scheduler); 
      }).catch(error => {
        console.error("Failed to initialize JobSchedulerService during app startup:", error);
      });
    });
  })
  .catch((err: Error) => {
    console.error('Database connection error during server startup:', err);
    process.exit(1); // Exit if DB connection fails
  });
