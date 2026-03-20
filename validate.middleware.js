/**
 * backend/src/middleware/validate.middleware.js
 */
'use strict';

const { validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

function validate(req, _res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const msg = errors.array().map((e) => e.msg).join(', ');
    return next(new AppError(msg, 422));
  }
  next();
}

module.exports = { validate };
