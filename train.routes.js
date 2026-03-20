/**
 * backend/src/routes/train.routes.js
 */
'use strict';

const { Router } = require('express');
const { startTraining, getJobStatus, listModels } = require('../controllers/train.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

router.post('/start', authenticate, startTraining);
router.get('/status/:jobId', authenticate, getJobStatus);
router.get('/models', listModels);

module.exports = router;
