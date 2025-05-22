// src/services/socketService.ts
import { io, Socket } from 'socket.io-client';
import { Scan } from './scanService'; // Assuming Scan interface is defined here or import from a shared types location

const SOCKET_SERVER_URL = process.env.REACT_APP_SOCKET_SERVER_URL || process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001'; // Adjust as needed

let socket: Socket | null = null;

interface SocketService {
  connect: () => void;
  disconnect: () => void;
  onScanUpdate: (callback: (updatedScan: Scan) => void) => void;
  offScanUpdate: () => void;
  // Add other event handlers as needed, e.g., onNewFindingSummary
  emitClientMessage: (message: any) => void; // Example emitter
}

const socketService: SocketService = {
  connect: () => {
    if (socket && socket.connected) {
      console.log('Socket already connected.');
      return;
    }

    const token = localStorage.getItem('token'); // Or however you retrieve the auth token
    if (!token) {
      console.error('SocketService: No auth token found. Cannot connect.');
      return;
    }

    console.log('Attempting to connect to WebSocket server:', SOCKET_SERVER_URL);
    socket = io(SOCKET_SERVER_URL, {
      auth: { // Send token for authentication by the backend middleware
        token: token
      },
      // Other options like transports: ['websocket'], reconnectionAttempts: 5, etc.
    });

    socket.on('connect', () => {
      console.log('Successfully connected to WebSocket server. Socket ID:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server. Reason:', reason);
      // Handle potential cleanup or reconnection logic if needed
    });

    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err.message, err.data);
    });
    
    // Example: Listening to a generic message from server (e.g., welcome message)
    socket.on('message', (data: any) => {
        console.log('Message from WebSocket server:', data);
    });

  },

  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
      console.log('Disconnected WebSocket.');
    }
  },

  onScanUpdate: (callback: (updatedScan: Scan) => void) => {
    if (socket) {
      socket.on('scan_update', callback);
      console.log("Subscribed to 'scan_update' events.");
    } else {
      console.warn("Socket not connected. Cannot subscribe to 'scan_update'.");
    }
  },

  offScanUpdate: () => {
    if (socket) {
      socket.off('scan_update');
      console.log("Unsubscribed from 'scan_update' events.");
    }
  },
  
  emitClientMessage: (message: any) => { // Example emitter
    if (socket && socket.connected) {
        socket.emit('client_message', message);
        console.log("Emitted 'client_message':", message);
    } else {
        console.warn("Socket not connected. Cannot emit 'client_message'.");
    }
  }
};

export default socketService;
