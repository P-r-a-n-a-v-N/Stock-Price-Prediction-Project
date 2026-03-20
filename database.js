/**
 * backend/src/config/database.js
 * Mongoose connection with exponential back-off retry.
 */
'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

let retries = 0;

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI environment variable not set');

  mongoose.set('strictQuery', true);

  while (retries < MAX_RETRIES) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 2,
      });
      logger.info('[DB] MongoDB connected');
      return;
    } catch (err) {
      retries++;
      logger.warn(`[DB] Connection attempt ${retries}/${MAX_RETRIES} failed: ${err.message}`);
      if (retries >= MAX_RETRIES) throw err;
      await sleep(RETRY_DELAY_MS * retries);
    }
  }
}

async function disconnectDB() {
  await mongoose.disconnect();
  logger.info('[DB] MongoDB disconnected');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { connectDB, disconnectDB };
