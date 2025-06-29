const mongoose = require('mongoose');
const environment = require('./environment');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      const mongoUri = environment.nodeEnv === 'test' 
        ? environment.mongodb.testUri 
        : environment.mongodb.uri;

      logger.info(`Connecting to MongoDB at ${mongoUri}...`);

      this.connection = await mongoose.connect(mongoUri, environment.mongodb.options);
      
      logger.info(`MongoDB connected: ${this.connection.connection.host}`);
      
      // Handle connection events
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });

      // Graceful shutdown
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      });

      return this.connection;
    } catch (error) {
      logger.error('MongoDB connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
    }
  }

  async clearDatabase() {
    if (environment.nodeEnv === 'test') {
      const collections = mongoose.connection.collections;
      for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
      }
      logger.info('Test database cleared');
    } else {
      throw new Error('Database clearing is only allowed in test environment');
    }
  }

  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  getConnectionState() {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    return states[mongoose.connection.readyState] || 'unknown';
  }
}

module.exports = new Database();
