/**
 * backend/src/routes/watchlist.routes.js
 */
'use strict';

const { Router } = require('express');
const { getWatchlist, addTicker, removeTicker } = require('../controllers/watchlist.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

router.use(authenticate); // all watchlist routes require auth

router.get('/', getWatchlist);
router.post('/', addTicker);
router.delete('/:ticker', removeTicker);

module.exports = router;
