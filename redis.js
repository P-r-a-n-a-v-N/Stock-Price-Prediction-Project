/**
 * backend/src/config/redis.js
 * IORedis singleton with reconnect strategy.
 */
'use strict';

const Redis = require('ioredis');
const logger = require('../utils/logger');

let client = null;

function getRedisClient() {
  if (!client) throw new Error('Redis not connected — call connectRedis() first');
  return client;
}

async function connectRedis() {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  client = new Redis(url, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times) => {
      const delay = Math.min(times * 500, 5000);
      logger.warn(`[Redis] Retry #${times} in ${delay}ms`);
      return delay;
    },
    lazyConnect: false,
  });

  client.on('error', (err) => logger.error('[Redis] Error:', err.message));
  client.on('connect', () => logger.info('[Redis] Connected'));

  await client.ping();
}

async function disconnectRedis() {
  if (client) {
    await client.quit();
    client = null;
    logger.info('[Redis] Disconnected');
  }
}

module.exports = { connectRedis, disconnectRedis, getRedisClient };
