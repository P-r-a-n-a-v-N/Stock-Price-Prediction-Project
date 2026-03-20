/**
 * backend/src/models/TrainJob.model.js
 */
'use strict';

const mongoose = require('mongoose');

const trainJobSchema = new mongoose.Schema(
  {
    jobId:    { type: String, required: true, unique: true, index: true },
    ticker:   { type: String, required: true, uppercase: true },
    horizon:  { type: Number, required: true },
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'failed'],
      default: 'queued',
    },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    metrics:  { type: mongoose.Schema.Types.Mixed, default: {} },
    error:    { type: String, default: null },
    epochs:   { type: Number, default: 50 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TrainJob', trainJobSchema);
