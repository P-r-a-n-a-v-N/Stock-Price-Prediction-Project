/**
 * backend/src/server.js
 * Express application entry point.
 * Graceful shutdown, no dangling handles, no race conditions.
 */
'use strict';

require('express-async-errors');
require('dotenv').config();

const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initSocketIO } = require('./config/socket');
const logger = require('./utils/logger');

const PORT = parseInt(process.env.PORT || '5000', 10);

async function bootstrap() {
  // 1. Connect dependencies first — fail fast if unavailable
  await connectDB();
  await connectRedis();

  // 2. HTTP server
  const server = http.createServer(app);

  // 3. Socket.IO (attaches to same HTTP server — no port conflict)
  initSocketIO(server);

  // 4. Listen
  await new Promise((resolve) => server.listen(PORT, resolve));
  logger.info(`[Server] API running on port ${PORT}`);

  // ── Graceful shutdown ────────────────────────────────────────────────────────
  const shutdown = async (signal) => {
    logger.info(`[Server] ${signal} received — shutting down gracefully...`);
    server.close(async () => {
      const { disconnectDB } = require('./config/database');
      const { disconnectRedis } = require('./config/redis');
      await disconnectDB();
      await disconnectRedis();
      logger.info('[Server] Shutdown complete.');
      process.exit(0);
    });

    // Force-kill after 15s
    setTimeout(() => {
      logger.error('[Server] Forced shutdown after timeout.');
      process.exit(1);
    }, 15_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Unhandled rejections — log and keep running (don't crash prod)
  process.on('unhandledRejection', (reason) => {
    logger.error('[Server] UnhandledRejection:', reason);
  });

  process.on('uncaughtException', (err) => {
    logger.error('[Server] UncaughtException:', err);
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.error('[Server] Bootstrap failed:', err);
  process.exit(1);
});
