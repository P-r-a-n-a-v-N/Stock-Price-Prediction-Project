/**
 * backend/src/controllers/stock.controller.js
 */
'use strict';

const { getRedisClient } = require('../config/redis');
const MLProxy = require('../services/mlProxy.service');
const logger = require('../utils/logger');

const CACHE_TTL = 300; // 5 min

async function getStockData(req, res) {
  const ticker = req.params.ticker.toUpperCase();
  const periodDays = parseInt(req.query.period_days || '365', 10);
  const cacheKey = `stock:${ticker}:${periodDays}`;

  try {
    const cached = await getRedisClient().get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));
  } catch (_) {}

  const data = await MLProxy.getStockData(ticker, periodDays);

  try {
    await getRedisClient().setex(cacheKey, CACHE_TTL, JSON.stringify(data));
  } catch (_) {}

  res.json(data);
}

async function getQuote(req, res) {
  const ticker = req.params.ticker.toUpperCase();
  const cacheKey = `quote:${ticker}`;

  try {
    const cached = await getRedisClient().get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));
  } catch (_) {}

  // Fetch 5 days and return only latest close
  const data = await MLProxy.getStockData(ticker, 5);
  const latest = data.data?.[data.data.length - 1] || {};
  const quote = {
    ticker,
    price: latest.close,
    open: latest.open,
    high: latest.high,
    low: latest.low,
    volume: latest.volume,
    date: latest.date,
  };

  try {
    await getRedisClient().setex(cacheKey, 60, JSON.stringify(quote)); // 1 min TTL
  } catch (_) {}

  res.json(quote);
}

module.exports = { getStockData, getQuote };
