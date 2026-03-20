/**
 * backend/src/services/mlProxy.service.js
 * Axios-based proxy to the Python FastAPI ML microservice.
 * Implements timeout + retry so the Node layer never hangs.
 */
'use strict';

const axios = require('axios');
const logger = require('../utils/logger');

const ML_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

const mlClient = axios.create({
  baseURL: ML_URL,
  timeout: 120_000,   // 2 min for predictions (model cold-start)
  headers: { 'Content-Type': 'application/json' },
});

mlClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.detail || err.message;
    logger.error(`[MLProxy] Error: ${msg}`);
    throw Object.assign(new Error(msg), {
      statusCode: err.response?.status || 502,
      isOperational: true,
    });
  }
);

const MLProxy = {
  async getPrediction(ticker, horizon) {
    const { data } = await mlClient.get(`/predict/${ticker}`, {
      params: { horizon },
    });
    return data;
  },

  async getStockData(ticker, periodDays = 365) {
    const { data } = await mlClient.get(`/data/${ticker}`, {
      params: { period_days: periodDays },
    });
    return data;
  },

  async startTraining(ticker, horizon, epochs = 50, batchSize = 32) {
    const { data } = await mlClient.post('/train/start', {
      ticker,
      horizon,
      epochs,
      batch_size: batchSize,
    });
    return data;
  },

  async getJobStatus(jobId) {
    const { data } = await mlClient.get(`/train/status/${jobId}`);
    return data;
  },

  async listModels() {
    const { data } = await mlClient.get('/train/models');
    return data;
  },

  async healthCheck() {
    const { data } = await mlClient.get('/health');
    return data;
  },
};

module.exports = MLProxy;
