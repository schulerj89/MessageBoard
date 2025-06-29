const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');
const environment = require('../config/environment');
const logger = require('../utils/logger');

// Redis client for rate limiting
let redisClient;

const createRedisClient = () => {
  if (!redisClient) {
    try {
      // Use test Redis URL if in test environment and it's set
      const redisUrl = process.env.NODE_ENV === 'test' && process.env.REDIS_URL_TEST 
        ? process.env.REDIS_URL_TEST 
        : environment.redis.url;
        
      logger.info(`Creating Redis client with URL: ${redisUrl}`);
      redisClient = new Redis(redisUrl, environment.redis.options);
      
      redisClient.on('error', (error) => {
        logger.error('Redis connection error:', error);
      });
      
      redisClient.on('connect', () => {
        logger.info('Connected to Redis for rate limiting');
      });
      
      redisClient.on('ready', () => {
        logger.info('Redis client ready');
      });
    } catch (error) {
      logger.error('Failed to create Redis client:', error);
      redisClient = null;
    }
  }
  return redisClient;
};

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress;
  },
  handler: (req, res, next, options) => {
    logger.warn('API Rate limit reached', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.path
    });
    
    res.status(options.statusCode).json({
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Simple Redis-based rate limiter for messages
class MessageRateLimiter {
  constructor() {
    this.windowMs = environment.rateLimit.windowMs;
    this.maxRequests = environment.rateLimit.maxRequests;
    this.redis = null; // Initialize as null, will be created lazily
  }

  // Get or create Redis client
  getRedisClient() {
    if (!this.redis) {
      this.redis = createRedisClient();
    }
    return this.redis;
  }

  // Generate Redis key for user rate limiting
  getKey(userId) {
    const windowStart = Math.floor(Date.now() / this.windowMs);
    return `rate_limit:user:${userId}:${windowStart}`;
  }

  async checkAndRecordRequest(userId) {
    const redis = this.getRedisClient();
    if (!redis) {
      logger.warn('Redis client not available, allowing request');
      return {
        isLimited: false,
        remainingRequests: this.maxRequests - 1,
        resetTime: new Date(Date.now() + this.windowMs),
        windowMs: this.windowMs,
        currentCount: 1,
        success: true
      };
    }

    try {
      const key = this.getKey(userId);
      const ttlSeconds = Math.ceil(this.windowMs / 1000);
      
      // Use Lua script for atomic check-and-increment
      const luaScript = `
        local key = KEYS[1]
        local max_requests = tonumber(ARGV[1])
        local ttl_seconds = tonumber(ARGV[2])
        
        local current = redis.call('GET', key)
        if current and tonumber(current) >= max_requests then
          local ttl = redis.call('TTL', key)
          return {tonumber(current), 1, ttl}  -- {count, is_limited, ttl}
        end
        
        local new_count = redis.call('INCR', key)
        if new_count == 1 then
          -- First request, set expiration
          redis.call('EXPIRE', key, ttl_seconds)
        end
        local ttl = redis.call('TTL', key)
        
        local is_limited = new_count > max_requests and 1 or 0
        return {new_count, is_limited, ttl}
      `;
      
      const result = await redis.eval(luaScript, 1, key, this.maxRequests, ttlSeconds);
      const [currentCount, isLimitedFlag, ttl] = result;
      const isLimited = isLimitedFlag === 1;
      const remainingRequests = Math.max(0, this.maxRequests - currentCount);
      
      // Calculate reset time based on TTL (time remaining until key expires)
      const resetTime = new Date(Date.now() + (ttl * 1000));
      
      if (isLimited) {
        logger.warn('Rate limit exceeded', {
          userId,
          currentCount,
          maxRequests: this.maxRequests,
          windowMs: this.windowMs
        });
      }
      
      return {
        isLimited,
        remainingRequests,
        resetTime,
        windowMs: this.windowMs,
        currentCount,
        success: !isLimited
      };
    } catch (error) {
      logger.error(error);
    }

    // Fallback: allow request if Redis fails
    return {
      isLimited: false,
      remainingRequests: this.maxRequests - 1,
      resetTime: new Date(Date.now() + this.windowMs),
      windowMs: this.windowMs,
      currentCount: 1,
      success: true
    };
  }

  async checkRateLimit(userId) {
    const redis = this.getRedisClient();
    if (!redis) {
      return {
        isLimited: false,
        remainingRequests: this.maxRequests,
        resetTime: new Date(Date.now() + this.windowMs),
        windowMs: this.windowMs,
        currentCount: 0
      };
    }

    try {
      const key = this.getKey(userId);
      const currentCount = await redis.get(key) || 0;
      const isLimited = currentCount >= this.maxRequests;
      const remainingRequests = Math.max(0, this.maxRequests - currentCount);
      
      // Calculate reset time based on TTL (time remaining until key expires)
      const ttl = await redis.ttl(key);
      const resetTime = ttl > 0 ? new Date(Date.now() + (ttl * 1000)) : new Date(Date.now() + this.windowMs);
      
      return {
        isLimited,
        remainingRequests,
        resetTime,
        windowMs: this.windowMs,
        currentCount: parseInt(currentCount)
      };
    } catch (error) {
      logger.error('Redis rate limit check error:', error);
      return {
        isLimited: false,
        remainingRequests: this.maxRequests,
        resetTime: new Date(Date.now() + this.windowMs),
        windowMs: this.windowMs,
        currentCount: 0
      };
    }
  }

  async resetUserLimit(userId) {
    const redis = this.getRedisClient();
    if (!redis) {
      logger.warn('Redis client not available for reset');
      return;
    }

    try {
      const key = this.getKey(userId);
      await redis.del(key);
      logger.info(`Rate limit reset for user: ${userId}`);
    } catch (error) {
      logger.error(`Error resetting rate limit for user ${userId}:`, error);
    }
  }

  async getUserStatus(userId) {
    return this.checkRateLimit(userId);
  }
}

// Create singleton instance
const messageRateLimiter = new MessageRateLimiter();

// Function to reset Redis client (useful for tests)
const resetRedisClient = async () => {
  try {
    if (redisClient) {
      await redisClient.quit();
      redisClient = null;
    }
    // Also reset the instance's Redis client
    if (messageRateLimiter && messageRateLimiter.redis) {
      await messageRateLimiter.redis.quit();
      messageRateLimiter.redis = null;
    }
  } catch (error) {
    // Ignore connection errors during cleanup
    redisClient = null;
    if (messageRateLimiter) {
      messageRateLimiter.redis = null;
    }
  }
};

module.exports = {
  apiLimiter,
  messageRateLimiter,
  MessageRateLimiter,
  resetRedisClient
};
