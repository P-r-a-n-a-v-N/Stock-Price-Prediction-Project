/**
 * backend/src/controllers/watchlist.controller.js
 */
'use strict';

const Watchlist = require('../models/Watchlist.model');

async function getWatchlist(req, res) {
  let wl = await Watchlist.findOne({ userId: req.user._id });
  if (!wl) wl = await Watchlist.create({ userId: req.user._id, tickers: [] });
  res.json({ tickers: wl.tickers });
}

async function addTicker(req, res) {
  const ticker = req.body.ticker?.toUpperCase();
  if (!ticker) return res.status(400).json({ error: 'ticker required' });

  const wl = await Watchlist.findOneAndUpdate(
    { userId: req.user._id },
    { $addToSet: { tickers: ticker } },
    { new: true, upsert: true }
  );
  res.json({ tickers: wl.tickers });
}

async function removeTicker(req, res) {
  const ticker = req.params.ticker.toUpperCase();
  const wl = await Watchlist.findOneAndUpdate(
    { userId: req.user._id },
    { $pull: { tickers: ticker } },
    { new: true }
  );
  res.json({ tickers: wl?.tickers || [] });
}

module.exports = { getWatchlist, addTicker, removeTicker };
