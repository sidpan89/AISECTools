// src/index.ts
import app from './app'; // Your existing Express app
import { AppDataSource } from './dataSource';
import logger from './utils/logger'; // Assuming logger is configured
import { JobSchedulerService } from './services/JobSchedulerService';
import './workers/scanWorker'; // Initializes the scan worker

// For Socket.IO
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyTokenSocket } from './services/authService'; // We'll need a socket auth middleware
import dotenv from 'dotenv'; // dotenv should be configured early

dotenv.config(); // Configure dotenv at the top

const PORT = process.env.PORT || 3001; // Changed to 3001 as per example

// Create HTTP server and pass Express app to it
const httpServer = http.createServer(app);

// Initialize Socket.IO server
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000", // Configure for your frontend URL
    methods: ["GET", "POST"],
    // credentials: true // If you need to handle cookies or sessions with Socket.IO
  }
});

// Socket.IO Authentication Middleware (example)
// This ensures only authenticated users can connect to Socket.IO
io.use(async (socket: Socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];
  if (!token) {
    logger.warn('Socket connection attempt without token.', { socketId: socket.id, remoteAddress: socket.conn.remoteAddress });
    return next(new Error('Authentication error: No token provided.'));
  }
  try {
    const decoded = await verifyTokenSocket(token); // This function needs to be created in authService
    (socket as any).user = decoded; // Attach user info to the socket object
    logger.info('Socket authenticated successfully', { socketId: socket.id, userId: (socket as any).user?.id, remoteAddress: socket.conn.remoteAddress });
    next();
  } catch (err) {
    logger.warn('Socket connection attempt with invalid token.', { socketId: socket.id, token, remoteAddress: socket.conn.remoteAddress, error: (err as Error).message });
    return next(new Error('Authentication error: Invalid token.'));
  }
});

io.on('connection', (socket: Socket) => {
  logger.info('User connected to WebSocket', { socketId: socket.id, userId: (socket as any).user?.id });

  // Join a room based on userId to send targeted messages
  if ((socket as any).user?.id) {
    socket.join((socket as any).user.id.toString());
    logger.info(`Socket ${socket.id} joined room for user ${(socket as any).user.id}`);
  }

  socket.on('disconnect', () => {
    logger.info('User disconnected from WebSocket', { socketId: socket.id, userId: (socket as any).user?.id });
  });

  // Example: Test event
  socket.emit('message', 'Welcome! You are connected to the WebSocket server.');
  socket.on('client_message', (data: any) => {
     logger.info('Message from client via WebSocket', { socketId: socket.id, data, userId: (socket as any).user?.id });
  });
});

// Store io instance on app for access from other services/controllers if needed (alternative to exporting it)
// app.set('io', io); // Or create a dedicated exportable module for 'io'
export let ioInstance: SocketIOServer; // Removed | null
ioInstance = io; // Assign immediately after io is created

// Start the server
AppDataSource.initialize().then(async () => {
    logger.info("TypeORM DataSource initialized successfully.");

    JobSchedulerService.getInstance().then(scheduler => {
        logger.info("JobSchedulerService initialized and schedules loaded via getInstance.");
    }).catch(error => {
        logger.error("Failed to initialize JobSchedulerService during app startup:", { error: error.message, stack: error.stack });
    });
    
    // Use httpServer.listen instead of app.listen
    httpServer.listen(PORT, () => {
        logger.info(`Server is running on port ${PORT}`);
        logger.info("Scan worker initialized and listening for jobs.");
        logger.info("Socket.IO server initialized and listening.");
    });

}).catch(error => {
    logger.error("TypeORM connection error: ", { error: error.message, stack: error.stack });
    process.exit(1);
});
