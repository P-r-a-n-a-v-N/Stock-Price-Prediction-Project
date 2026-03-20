/**
 * backend/src/routes/stock.routes.js
 */
'use strict';

const { Router } = require('express');
const { getStockData, getQuote } = require('../controllers/stock.controller');

const router = Router();

router.get('/:ticker/data', getStockData);
router.get('/:ticker/quote', getQuote);

module.exports = router;
