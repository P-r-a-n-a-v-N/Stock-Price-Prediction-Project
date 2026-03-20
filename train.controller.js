/**
 * backend/src/controllers/train.controller.js
 * Starts training on the ML service, polls for progress, broadcasts via WS.
 */
'use strict';

const MLProxy = require('../services/mlProxy.service');
const { emitJobProgress } = require('../config/socket');
const logger = require('../utils/logger');

// Active polling intervals keyed by jobId
const _pollers = new Map();

async function startTraining(req, res) {
  const { ticker, horizon = 7, epochs = 50, batch_size = 32 } = req.body;

  if (!ticker) return res.status(400).json({ error: 'ticker required' });

  const result = await MLProxy.startTraining(
    ticker.toUpperCase(), horizon, epochs, batch_size
  );
  const { job_id } = result;

  // Start background polling every 3 seconds
  _startPolling(job_id);

  res.status(202).json({ jobId: job_id, status: 'started' });
}

async function getJobStatus(req, res) {
  const { jobId } = req.params;
  const status = await MLProxy.getJobStatus(jobId);
  res.json(status);
}

async function listModels(_req, res) {
  const data = await MLProxy.listModels();
  res.json(data);
}

function _startPolling(jobId) {
  if (_pollers.has(jobId)) return;

  const interval = setInterval(async () => {
    try {
      const status = await MLProxy.getJobStatus(jobId);
      emitJobProgress(jobId, status);

      // Stop polling when terminal state reached
      if (['completed', 'failed'].includes(status.status)) {
        clearInterval(interval);
        _pollers.delete(jobId);
        logger.info(`[Train] Polling stopped for job ${jobId}: ${status.status}`);
      }
    } catch (err) {
      logger.warn(`[Train] Poll error for ${jobId}: ${err.message}`);
    }
  }, 3000);

  _pollers.set(jobId, interval);
}

module.exports = { startTraining, getJobStatus, listModels };
