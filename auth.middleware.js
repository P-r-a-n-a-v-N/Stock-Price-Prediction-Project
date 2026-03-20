/**
 * backend/src/middleware/auth.middleware.js
 * JWT authentication middleware.
 */
'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const { AppError } = require('./errorHandler');

async function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('No token provided', 401));
  }

  const token = header.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return next(new AppError('Invalid or expired token', 401));
  }

  const user = await User.findById(decoded.id).select('-password');
  if (!user) return next(new AppError('User not found', 401));

  req.user = user;
  next();
}

function authorize(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }
    next();
  };
}

module.exports = { authenticate, authorize };
