/**
 * backend/src/routes/prediction.routes.js
 */
'use strict';

const { Router } = require('express');
const { getPrediction, getPredictionHistory } = require('../controllers/prediction.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

// Public — predictions are accessible without login
router.get('/:ticker', getPrediction);
router.get('/:ticker/history', authenticate, getPredictionHistory);

module.exports = router;
