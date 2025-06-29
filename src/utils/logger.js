const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const environment = require('../config/environment');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create transports array
const transports = [];

// Console transport for development
if (environment.nodeEnv === 'development') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: environment.logging.level
    })
  );
}

// File transport for all environments
transports.push(
  new DailyRotateFile({
    filename: path.join(process.cwd(), 'logs', 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: logFormat,
    level: environment.logging.level
  })
);

// Error file transport
transports.push(
  new DailyRotateFile({
    filename: path.join(process.cwd(), 'logs', 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    format: logFormat,
    level: 'error'
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: environment.logging.level,
  format: logFormat,
  transports,
  exitOnError: false,
  // Handle uncaught exceptions and unhandled rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'exceptions.log')
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'rejections.log')
    })
  ]
});

// Add request logging method
logger.logRequest = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    query: req.query,
  };

  if (req.body && Object.keys(req.body).length > 0) {
    // Don't log sensitive data
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
    if (sanitizedBody.token) sanitizedBody.token = '[REDACTED]';
    logData.body = sanitizedBody;
  }

  logger.info('HTTP Request', logData);
};

// Add GraphQL operation logging
logger.logGraphQLOperation = (operationName, variables, context, responseTime) => {
  const logData = {
    operationType: 'GraphQL',
    operationName,
    responseTime: `${responseTime}ms`,
    ip: context.req?.ip || context.req?.connection?.remoteAddress,
    userAgent: context.req?.get('User-Agent'),
  };

  // Log variables but sanitize sensitive data
  if (variables && Object.keys(variables).length > 0) {
    const sanitizedVariables = { ...variables };
    if (sanitizedVariables.password) sanitizedVariables.password = '[REDACTED]';
    logData.variables = sanitizedVariables;
  }

  logger.info('GraphQL Operation', logData);
};

// Add rate limit logging
logger.logRateLimit = (userId, action, remaining, resetTime) => {
  logger.warn('Rate Limit Hit', {
    userId,
    action,
    remaining,
    resetTime: new Date(resetTime).toISOString()
  });
};

module.exports = logger;
