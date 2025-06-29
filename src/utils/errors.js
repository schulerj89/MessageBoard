/**
 * Custom error classes for the application
 */

class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, 'CONFLICT');
  }
}

class RateLimitError extends AppError {
  constructor(message, resetTime, remaining) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.resetTime = resetTime;
    this.remaining = remaining;
  }
}

class AuthenticationError extends AppError {
  constructor(message) {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message) {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class DatabaseError extends AppError {
  constructor(message) {
    super(message, 500, 'DATABASE_ERROR');
  }
}

class ExternalServiceError extends AppError {
  constructor(message, service) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
  }
}

/**
 * Error handler for GraphQL resolvers
 */
const handleGraphQLError = (error) => {
  // If it's already our custom error, return as is
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      ...(error.resetTime && { resetTime: error.resetTime }),
      ...(error.remaining !== undefined && { remaining: error.remaining })
    };
  }

  // Handle Mongoose validation errors
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(err => err.message);
    return {
      message: messages.join(', '),
      code: 'VALIDATION_ERROR',
      statusCode: 400
    };
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (error.name === 'CastError') {
    return {
      message: 'Invalid ID format',
      code: 'VALIDATION_ERROR',
      statusCode: 400
    };
  }

  // Handle MongoDB duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return {
      message: `${field} already exists`,
      code: 'CONFLICT',
      statusCode: 409
    };
  }

  // Default error
  return {
    message: 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
    statusCode: 500
  };
};

/**
 * Error handler for Express routes
 */
const handleExpressError = (error, req, res, next) => {
  const logger = require('./logger');
  
  // Log error
  logger.error('Express error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });

  // Handle our custom errors
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        code: error.code,
        ...(error.resetTime && { resetTime: error.resetTime }),
        ...(error.remaining !== undefined && { remaining: error.remaining })
      }
    });
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      error: {
        message: messages.join(', '),
        code: 'VALIDATION_ERROR'
      }
    });
  }

  // Handle duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(409).json({
      success: false,
      error: {
        message: `${field} already exists`,
        code: 'CONFLICT'
      }
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }
  });
};

/**
 * Async error wrapper for Express routes
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Validation helper
 */
const validateRequired = (fields, data) => {
  const missing = fields.filter(field => !data[field]);
  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
  }
};

/**
 * Sanitize error for client response
 */
const sanitizeError = (error, includeStack = false) => {
  const sanitized = {
    message: error.message,
    code: error.code || 'UNKNOWN_ERROR',
    statusCode: error.statusCode || 500
  };

  if (includeStack && process.env.NODE_ENV === 'development') {
    sanitized.stack = error.stack;
  }

  return sanitized;
};

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  AuthenticationError,
  AuthorizationError,
  DatabaseError,
  ExternalServiceError,
  handleGraphQLError,
  handleExpressError,
  asyncHandler,
  validateRequired,
  sanitizeError
};
