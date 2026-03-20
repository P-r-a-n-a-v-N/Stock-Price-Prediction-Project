/**
 * backend/src/controllers/prediction.controller.js
 * Caches ML predictions in Redis for 15 min to avoid hammering the ML service.
 * Uses a per-key mutex so concurrent requests don't cause cache stampede.
 */
'use strict';

const { getRedisClient } = require('../config/redis');
const MLProxy = require('../services/mlProxy.service');
const Prediction = require('../models/Prediction.model');
const { emitToTicker } = require('../config/socket');
const logger = require('../utils/logger');

const CACHE_TTL = 900; // 15 min
// In-flight promise map — prevents cache stampede under concurrency
const _inFlight = new Map();

async function getPrediction(req, res) {
  const ticker = req.params.ticker.toUpperCase();
  const horizon = parseInt(req.query.horizon || '7', 10);

  if (horizon < 1 || horizon > 30) {
    return res.status(400).json({ error: 'horizon must be 1–30' });
  }

  const cacheKey = `pred:${ticker}:${horizon}`;

  // ── Check Redis cache ────────────────────────────────────────────────────────
  try {
    const cached = await getRedisClient().get(cacheKey);
    if (cached) {
      logger.debug(`[Pred] Cache hit: ${cacheKey}`);
      return res.json(JSON.parse(cached));
    }
  } catch (e) {
    logger.warn('[Pred] Redis get failed — proceeding without cache');
  }

  // ── Deduplication: if same key is already in-flight, wait for it ────────────
  if (_inFlight.has(cacheKey)) {
    logger.debug(`[Pred] Dedup in-flight: ${cacheKey}`);
    const result = await _inFlight.get(cacheKey);
    return res.json(result);
  }

  // ── Fetch from ML service ────────────────────────────────────────────────────
  const promise = (async () => {
    const mlResult = await MLProxy.getPrediction(ticker, horizon);

    // Persist to MongoDB asynchronously (non-blocking)
    Prediction.create({
      ticker,
      horizon,
      lastClose: mlResult.last_close,
      predictions: mlResult.predictions,
      confidenceBands: mlResult.confidence_bands,
      modelTrained: mlResult.model_trained,
    }).catch((e) => logger.warn('[Pred] MongoDB save failed:', e.message));

    // Cache in Redis
    try {
      await getRedisClient().setex(cacheKey, CACHE_TTL, JSON.stringify(mlResult));
    } catch (e) {
      logger.warn('[Pred] Redis set failed');
    }

    // Broadcast to subscribed WebSocket clients
    emitToTicker(ticker, 'prediction:new', mlResult);

    return mlResult;
  })();

  _inFlight.set(cacheKey, promise);
  try {
    const result = await promise;
    return res.json(result);
  } finally {
    _inFlight.delete(cacheKey);
  }
}

async function getPredictionHistory(req, res) {
  const ticker = req.params.ticker.toUpperCase();
  const limit = parseInt(req.query.limit || '10', 10);

  const history = await Prediction.find({ ticker })
    .sort({ createdAt: -1 })
    .limit(Math.min(limit, 50))
    .select('-__v');

  res.json({ ticker, count: history.length, history });
}

module.exports = { getPrediction, getPredictionHistory };
