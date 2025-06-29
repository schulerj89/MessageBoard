const { MongoMemoryServer } = require('mongodb-memory-server');
const { RedisMemoryServer } = require('redis-memory-server');
const mongoose = require('mongoose');
const database = require('../src/config/database');

let mongoServer;
let redisServer;

// Setup test database before all tests
beforeAll(async () => {
  // Set test environment first
  process.env.NODE_ENV = 'test';
  
  // Start in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Start in-memory Redis instance
  redisServer = new RedisMemoryServer();
  const redisHost = await redisServer.getHost();
  const redisPort = await redisServer.getPort();
  const redisUri = `redis://${redisHost}:${redisPort}`;
  
  // Set environment variables
  process.env.MONGODB_URI_TEST = mongoUri;
  process.env.REDIS_URL_TEST = redisUri;
  process.env.REDIS_URL = redisUri; // Also set main Redis URL for tests
  
  // Reset any existing Redis connections to pick up new URL
  const { resetRedisClient } = require('../src/middleware/rateLimiter');
  await resetRedisClient();
  
  // Connect to test database
  await database.connect();
});

// Clean up database before each test
beforeEach(async () => {
  if (database.isConnected()) {
    await database.clearDatabase();
  }
  
  // Clear Redis data (connect to the test Redis instance and flush)
  if (redisServer) {
    const Redis = require('ioredis');
    const redis = new Redis(process.env.REDIS_URL);
    try {
      await redis.flushall();
    } finally {
      await redis.quit();
    }
  }
  
  // Reset Redis client connections to ensure clean state
  const { resetRedisClient } = require('../src/middleware/rateLimiter');
  await resetRedisClient();
});

// Clean up after each test
afterEach(async () => {
  // Force cleanup of any remaining Redis connections
  const { resetRedisClient } = require('../src/middleware/rateLimiter');
  await resetRedisClient();
});

// Close database connection after all tests
afterAll(async () => {
  // Reset Redis client first
  const { resetRedisClient } = require('../src/middleware/rateLimiter');
  await resetRedisClient();
  
  if (database.isConnected()) {
    await database.disconnect();
  }
  
  if (mongoServer) {
    await mongoServer.stop();
  }
  
  if (redisServer) {
    await redisServer.stop();
  }
});

// Add custom matchers
expect.extend({
  toBeValidObjectId(received) {
    const pass = mongoose.Types.ObjectId.isValid(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid ObjectId`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid ObjectId`,
        pass: false,
      };
    }
  },
});

// Global test utilities
global.testUtils = {
  createTestUser: async (userData = {}) => {
    const User = require('../src/models/User');
    const defaultData = {
      name: 'Test User',
      email: 'test@example.com'
    };
    return await User.create({ ...defaultData, ...userData });
  },
  
  createTestMessage: async (userId, messageData = {}) => {
    const Message = require('../src/models/Message');
    const defaultData = {
      body: 'Test message',
      user: userId
    };
    return await Message.create({ ...defaultData, ...messageData });
  },
  
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};
