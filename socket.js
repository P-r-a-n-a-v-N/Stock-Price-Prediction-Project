/**
 * backend/src/config/socket.js
 * Socket.IO server — broadcasts prediction & training progress events.
 * Clients subscribe to rooms: "ticker:AAPL", "job:<job_id>"
 */
'use strict';

const { Server } = require('socket.io');
const logger = require('../utils/logger');

let io = null;

function initSocketIO(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  io.on('connection', (socket) => {
    logger.info(`[WS] Client connected: ${socket.id}`);

    // Client subscribes to a ticker room for live updates
    socket.on('subscribe:ticker', (ticker) => {
      const room = `ticker:${ticker.toUpperCase()}`;
      socket.join(room);
      logger.debug(`[WS] ${socket.id} joined ${room}`);
    });

    socket.on('unsubscribe:ticker', (ticker) => {
      socket.leave(`ticker:${ticker.toUpperCase()}`);
    });

    // Client subscribes to a training job progress
    socket.on('subscribe:job', (jobId) => {
      socket.join(`job:${jobId}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info(`[WS] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  logger.info('[WS] Socket.IO initialised');
  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO not initialised');
  return io;
}

function emitToTicker(ticker, event, data) {
  if (!io) return;
  io.to(`ticker:${ticker.toUpperCase()}`).emit(event, data);
}

function emitJobProgress(jobId, data) {
  if (!io) return;
  io.to(`job:${jobId}`).emit('job:progress', data);
}

module.exports = { initSocketIO, getIO, emitToTicker, emitJobProgress };
