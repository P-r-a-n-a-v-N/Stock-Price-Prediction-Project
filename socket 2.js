// frontend/src/services/socket.js
import { io } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:5000';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log('[WS] Connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[WS] Connection error:', err.message);
    });
  }
  return socket;
}

export function subscribeToTicker(ticker) {
  getSocket().emit('subscribe:ticker', ticker);
}

export function unsubscribeFromTicker(ticker) {
  getSocket().emit('unsubscribe:ticker', ticker);
}

export function subscribeToJob(jobId) {
  getSocket().emit('subscribe:job', jobId);
}
