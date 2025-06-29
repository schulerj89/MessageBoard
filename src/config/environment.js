const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const environment = {
  // Server configuration
  port: process.env.PORT || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/messageboard',
    testUri: process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/messageboard_test',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },
  
  // Security configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback_secret_change_in_production',
  },
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
  
  // Redis configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    testUrl: process.env.REDIS_URL_TEST || 'redis://localhost:6380',
    options: {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
    }
  },
  
  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 3600000, // 1 hour
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 10,
    storage: process.env.RATE_LIMIT_STORAGE || 'redis', // 'redis' or 'mongodb'
  },
  
  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || 'logs/app.log',
  },
  
  // CORS configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  
  // GraphQL configuration
  graphql: {
    introspection: process.env.NODE_ENV !== 'production',
    playground: process.env.NODE_ENV === 'development',
  }
};

// Validation
if (!environment.jwt.secret || environment.jwt.secret === 'fallback_secret_change_in_production') {
  console.warn('Warning: Using default JWT secret. Please set JWT_SECRET in production.');
}

if (!environment.mongodb.uri) {
  throw new Error('MONGODB_URI is required');
}

module.exports = environment;
