const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('./errors');
const mongoose = require('mongoose');

/**
 * Validation rules for user creation
 */
const userValidationRules = () => {
  return [
    body('name')
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters')
      .trim()
      .escape(),
    
    body('email')
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail()
      .isLength({ max: 100 })
      .withMessage('Email cannot exceed 100 characters')
  ];
};

/**
 * Validation rules for message creation
 */
const messageValidationRules = () => {
  return [
    body('body')
      .isLength({ min: 1, max: 1000 })
      .withMessage('Message body must be between 1 and 1000 characters')
      .trim(),
    
    body('userId')
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new Error('Invalid user ID format');
        }
        return true;
      })
  ];
};

/**
 * Validation rules for ObjectId parameters
 */
const objectIdValidationRules = (paramName = 'id') => {
  return [
    param(paramName)
      .custom((value) => {
        if (!mongoose.Types.ObjectId.isValid(value)) {
          throw new Error(`Invalid ${paramName} format`);
        }
        return true;
      })
  ];
};

/**
 * Validation rules for pagination
 */
const paginationValidationRules = () => {
  return [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
    
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a non-negative integer')
      .toInt()
  ];
};

/**
 * Validation rules for date range queries
 */
const dateRangeValidationRules = () => {
  return [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date')
      .toDate(),
    
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date')
      .toDate()
      .custom((endDate, { req }) => {
        if (req.query.startDate && endDate < new Date(req.query.startDate)) {
          throw new Error('End date must be after start date');
        }
        return true;
      })
  ];
};

/**
 * Middleware to check validation results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    throw new ValidationError(errorMessages.join(', '));
  }
  
  next();
};

/**
 * Custom validation functions
 */
const customValidators = {
  // Validate email format
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validate ObjectId
  isValidObjectId: (id) => {
    return mongoose.Types.ObjectId.isValid(id);
  },

  // Validate message body
  isValidMessageBody: (body) => {
    if (typeof body !== 'string') return false;
    const trimmed = body.trim();
    return trimmed.length >= 1 && trimmed.length <= 1000;
  },

  // Validate user name
  isValidUserName: (name) => {
    if (typeof name !== 'string') return false;
    const trimmed = name.trim();
    return trimmed.length >= 2 && trimmed.length <= 50;
  },

  // Validate pagination parameters
  isValidPagination: (limit, offset) => {
    const parsedLimit = parseInt(limit, 10);
    const parsedOffset = parseInt(offset, 10);
    
    return (
      !isNaN(parsedLimit) && parsedLimit >= 1 && parsedLimit <= 100 &&
      !isNaN(parsedOffset) && parsedOffset >= 0
    );
  },

  // Validate date range
  isValidDateRange: (startDate, endDate) => {
    if (!startDate || !endDate) return true; // Optional parameters
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return !isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end;
  },

  // Sanitize string input
  sanitizeString: (str) => {
    if (typeof str !== 'string') return str;
    
    return str
      .trim()
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
      .substring(0, 1000); // Limit length
  },

  // Validate GraphQL variables
  validateGraphQLVariables: (variables) => {
    const errors = [];
    
    if (variables.userId && !customValidators.isValidObjectId(variables.userId)) {
      errors.push('Invalid user ID format');
    }
    
    if (variables.messageId && !customValidators.isValidObjectId(variables.messageId)) {
      errors.push('Invalid message ID format');
    }
    
    if (variables.name && !customValidators.isValidUserName(variables.name)) {
      errors.push('Invalid user name');
    }
    
    if (variables.email && !customValidators.isValidEmail(variables.email)) {
      errors.push('Invalid email format');
    }
    
    if (variables.body && !customValidators.isValidMessageBody(variables.body)) {
      errors.push('Invalid message body');
    }
    
    if (variables.limit || variables.offset) {
      if (!customValidators.isValidPagination(variables.limit || 50, variables.offset || 0)) {
        errors.push('Invalid pagination parameters');
      }
    }
    
    return errors;
  }
};

/**
 * Validation middleware factory
 */
const createValidationMiddleware = (rules) => {
  return [...rules, validate];
};

module.exports = {
  userValidationRules,
  messageValidationRules,
  objectIdValidationRules,
  paginationValidationRules,
  dateRangeValidationRules,
  validate,
  customValidators,
  createValidationMiddleware
};
