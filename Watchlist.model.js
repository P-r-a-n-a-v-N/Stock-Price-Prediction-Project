/**
 * backend/src/models/Watchlist.model.js
 */
'use strict';

const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tickers: {
      type: [String],
      default: [],
      validate: {
        validator: (v) => v.length <= 20,
        message: 'Watchlist cannot exceed 20 tickers',
      },
    },
  },
  { timestamps: true }
);

watchlistSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('Watchlist', watchlistSchema);
