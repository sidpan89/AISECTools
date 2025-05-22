// backend/src/utils/logger.ts
import winston from 'winston';

// Determine log level from environment variable or default to 'info'
const logLevel = process.env.LOG_LEVEL || 'info';

const logger = winston.createLogger({
  level: logLevel,
  // Standard log format: JSON including timestamp, level, message.
  // Add service name or other context if needed.
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }), // Log stack traces for errors
    winston.format.splat(),
    winston.format.json() // Output logs in JSON format
  ),
  defaultMeta: { service: process.env.SERVICE_NAME || 'cloud-security-platform' }, // Optional: add service name
  transports: [
    // Console transport:
    // - For development: pretty print, colorized.
    // - For production: JSON format (as defined above).
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' 
        ? winston.format.json() 
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.simple() // Simple format for dev: `${level}: ${message} ${timestamp}`
          ),
      stderrLevels: ['error'], // Log errors to stderr
    }),
    // Optional: File transport for errors
    // new winston.transports.File({ 
    //   filename: 'logs/error.log', 
    //   level: 'error',
    //   maxsize: 5242880, // 5MB
    //   maxFiles: 5,
    // }),
    // Optional: File transport for all logs
    // new winston.transports.File({ 
    //   filename: 'logs/combined.log',
    //   maxsize: 5242880, // 5MB
    //   maxFiles: 5,
    // })
  ],
  // Handle uncaught exceptions and unhandled rejections
  // These are important for catching errors that would otherwise crash the app without logging.
  exceptionHandlers: [
    new winston.transports.Console({ // Also log uncaught exceptions to console
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }),
    // new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new winston.transports.Console({ // Also log unhandled rejections to console
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }),
    // new winston.transports.File({ filename: 'logs/rejections.log' })
  ],
  exitOnError: false, // Do not exit on handled exceptions
});

// If not in production, also log to the console with a simpler, colorized format
if (process.env.NODE_ENV !== 'production') {
  // This is already handled by the conditional format in Console transport.
  // If you wanted a SEPARATE console transport for dev with different settings, you could add it here.
  // For example, if the main console transport was always JSON:
  // logger.add(new winston.transports.Console({
  //   format: winston.format.combine(
  //     winston.format.colorize(),
  //     winston.format.simple()
  //   )
  // }));
}

export default logger;
