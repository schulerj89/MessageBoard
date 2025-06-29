const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const environment = require('../config/environment');
const logger = require('../utils/logger');

/**
 * Security middleware configuration
 */
const setupSecurity = (app) => {
  // Helmet for security headers
  app.use(helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: environment.nodeEnv === 'development' 
          ? ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://unpkg.com"]
          : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: environment.nodeEnv === 'development'
          ? ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"]
          : ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: environment.nodeEnv === 'development'
          ? ["'self'", "https://cdn.jsdelivr.net", "https://unpkg.com"]
          : ["'self'"],
        fontSrc: environment.nodeEnv === 'development'
          ? ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"]
          : ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    
    // Cross Origin Embedder Policy
    crossOriginEmbedderPolicy: false, // Disabled for GraphQL Playground
    
    // Referrer Policy
    referrerPolicy: {
      policy: 'same-origin'
    },
    
    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    }
  }));

  // CORS configuration
  const corsOptions = {
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      // Apollo Playground CDN domains
      const apolloDomains = [
        'https://cdn.jsdelivr.net',
        'https://unpkg.com',
        'https://studio.apollographql.com'
      ];
      
      // Check if it's an Apollo CDN domain
      if (apolloDomains.some(domain => origin.startsWith(domain))) {
        return callback(null, true);
      }
      
      const allowedOrigins = Array.isArray(environment.cors.origin) 
        ? environment.cors.origin 
        : [environment.cors.origin];
      
      if (allowedOrigins.includes(origin) || environment.nodeEnv === 'development') {
        callback(null, true);
      } else {
        logger.warn('CORS blocked request from origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Apollo-Require-Preflight'
    ],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
  };

  app.use(cors(corsOptions));

  // Compression middleware
  app.use(compression({
    filter: (req, res) => {
      // Don't compress responses if the request includes a Cache-Control: no-transform directive
      if (req.headers['cache-control'] && req.headers['cache-control'].includes('no-transform')) {
        return false;
      }
      return compression.filter(req, res);
    },
    level: 6, // Compression level (1-9)
    threshold: 1024 // Only compress responses larger than 1KB
  }));

  // Trust proxy if behind reverse proxy
  if (environment.nodeEnv === 'production') {
    app.set('trust proxy', 1);
  }

  // Remove powered by header
  app.disable('x-powered-by');

  // Request logging middleware
  app.use((req, res, next) => {
    const startTime = Date.now();
    
    // Log request
    logger.info('Incoming request', {
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer')
    });

    // Log response when finished
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      logger.logRequest(req, res, responseTime);
    });

    next();
  });

  // Input sanitization middleware
  app.use((req, res, next) => {
    // Basic input sanitization
    if (req.body) {
      req.body = sanitizeInput(req.body);
    }
    if (req.query) {
      req.query = sanitizeInput(req.query);
    }
    if (req.params) {
      req.params = sanitizeInput(req.params);
    }
    next();
  });

  logger.info('Security middleware configured successfully');
};

/**
 * Basic input sanitization
 */
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    // Remove null bytes and control characters except newlines and tabs
    return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }
  
  return input;
};

/**
 * Error handling middleware
 */
const setupErrorHandling = (app) => {
  // 404 handler
  app.use((req, res, next) => {
    const error = new Error(`Route not found: ${req.method} ${req.path}`);
    error.statusCode = 404;
    next(error);
  });

  // Global error handler
  app.use((error, req, res, next) => {
    logger.error('Express error:', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip
    });

    // Default error response
    const statusCode = error.statusCode || 500;
    const message = environment.nodeEnv === 'production' 
      ? 'Internal server error' 
      : error.message;

    res.status(statusCode).json({
      success: false,
      error: {
        message,
        code: error.code || 'INTERNAL_ERROR',
        ...(environment.nodeEnv === 'development' && { stack: error.stack })
      }
    });
  });

  logger.info('Error handling middleware configured successfully');
};

/**
 * Health check endpoint
 */
const setupHealthCheck = (app) => {
  app.get('/health', (req, res) => {
    const database = require('../config/database');
    
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: environment.nodeEnv,
      database: {
        status: database.isConnected() ? 'connected' : 'disconnected',
        state: database.getConnectionState()
      },
      memory: process.memoryUsage(),
      version: process.version
    };

    res.json(health);
  });

  logger.info('Health check endpoint configured');
};

module.exports = {
  setupSecurity,
  setupErrorHandling,
  setupHealthCheck,
  sanitizeInput
};
