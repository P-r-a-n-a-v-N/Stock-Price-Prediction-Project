/**
 * backend/src/models/Prediction.model.js
 */
'use strict';

const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema(
  {
    ticker: { type: String, required: true, uppercase: true, index: true },
    horizon: { type: Number, required: true, min: 1, max: 30 },
    lastClose: { type: Number, required: true },
    predictions: [
      {
        date: String,
        price: Number,
        _id: false,
      },
    ],
    confidenceBands: [
      {
        date: String,
        upper: Number,
        lower: Number,
        _id: false,
      },
    ],
    modelTrained: { type: Boolean, default: false },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

predictionSchema.index({ ticker: 1, horizon: 1, createdAt: -1 });
// TTL index — MongoDB auto-deletes documents 7 days after createdAt
predictionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

module.exports = mongoose.model('Prediction', predictionSchema);
