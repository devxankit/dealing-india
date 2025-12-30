import { io } from 'socket.io-client';
import { SOCKET_URL } from './constants';

let socket = null;

/**
 * Initialize Socket.io connection with JWT authentication
 * @param {String} token - JWT token from localStorage
 * @returns {Socket} Socket.io instance
 */
export const initializeSocket = (token) => {
  if (socket && socket.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: {
      token: token,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => {
    console.log('Socket.io connected');
  });

  socket.on('disconnect', () => {
    console.log('Socket.io disconnected');
  });

  socket.on('error', (error) => {
    console.error('Socket.io error:', error);
  });

  return socket;
};

/**
 * Get current socket instance
 * @returns {Socket|null} Socket.io instance or null
 */
export const getSocket = () => {
  return socket;
};

/**
 * Disconnect socket
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default {
  initializeSocket,
  getSocket,
  disconnectSocket,
};

