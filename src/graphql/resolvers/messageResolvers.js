const messageService = require('../../services/messageService');
const userService = require('../../services/userService');
const { handleGraphQLError } = require('../../utils/errors');
const logger = require('../../utils/logger');

const messageResolvers = {
  Query: {
    // Get all messages with optional filtering
    messages: async (parent, args, context) => {
      try {
        const startTime = Date.now();
        const { filter = {} } = args;
        
        const messages = await messageService.getAllMessages(filter);
        
        const responseTime = Date.now() - startTime;
        logger.logGraphQLOperation('messages', args, context, responseTime);
        
        return messages;
      } catch (error) {
        logger.error('GraphQL messages query error:', error);
        const handledError = handleGraphQLError(error);
        throw new Error(handledError.message);
      }
    },

    // Get message by ID
    message: async (parent, args, context) => {
      try {
        const startTime = Date.now();
        const { id } = args;
        
        const message = await messageService.getMessageById(id);
        
        const responseTime = Date.now() - startTime;
        logger.logGraphQLOperation('message', args, context, responseTime);
        
        return message;
      } catch (error) {
        logger.error('GraphQL message query error:', error);
        const handledError = handleGraphQLError(error);
        throw new Error(handledError.message);
      }
    },

    // Get messages by user ID
    messagesByUser: async (parent, args, context) => {
      try {
        const startTime = Date.now();
        const { userId, limit, offset } = args;
        
        const messages = await messageService.getMessagesByUser(userId, {
          limit: limit || 50,
          offset: offset || 0
        });
        
        const responseTime = Date.now() - startTime;
        logger.logGraphQLOperation('messagesByUser', args, context, responseTime);
        
        return messages;
      } catch (error) {
        logger.error('GraphQL messagesByUser query error:', error);
        const handledError = handleGraphQLError(error);
        throw new Error(handledError.message);
      }
    },

    // Get recent messages
    recentMessages: async (parent, args, context) => {
      try {
        const startTime = Date.now();
        const { hours = 24, limit = 50 } = args;
        
        const messages = await messageService.getRecentMessages(hours, limit);
        
        const responseTime = Date.now() - startTime;
        logger.logGraphQLOperation('recentMessages', args, context, responseTime);
        
        return messages;
      } catch (error) {
        logger.error('GraphQL recentMessages query error:', error);
        const handledError = handleGraphQLError(error);
        throw new Error(handledError.message);
      }
    },

    // Get rate limit status for a user
    rateLimitStatus: async (parent, args, context) => {
      try {
        const startTime = Date.now();
        const { userId } = args;
        
        const status = await messageService.getRateLimitStatus(userId);
        
        const responseTime = Date.now() - startTime;
        logger.logGraphQLOperation('rateLimitStatus', args, context, responseTime);
        
        return status;
      } catch (error) {
        logger.error('GraphQL rateLimitStatus query error:', error);
        const handledError = handleGraphQLError(error);
        throw new Error(handledError.message);
      }
    },

    // Get rate limit statistics
    rateLimitStats: async (parent, args, context) => {
      try {
        const startTime = Date.now();
        
        const stats = await messageService.getRateLimitStats();
        
        const responseTime = Date.now() - startTime;
        logger.logGraphQLOperation('rateLimitStats', args, context, responseTime);
        
        return stats;
      } catch (error) {
        logger.error('GraphQL rateLimitStats query error:', error);
        const handledError = handleGraphQLError(error);
        throw new Error(handledError.message);
      }
    },

    // Get message statistics
    messageStats: async (parent, args, context) => {
      try {
        const startTime = Date.now();
        const { userId } = args;
        
        const stats = await messageService.getMessageStats(userId);
        
        const responseTime = Date.now() - startTime;
        logger.logGraphQLOperation('messageStats', args, context, responseTime);
        
        return stats;
      } catch (error) {
        logger.error('GraphQL messageStats query error:', error);
        const handledError = handleGraphQLError(error);
        throw new Error(handledError.message);
      }
    },

    // Get system statistics
    systemStats: async (parent, args, context) => {
      try {
        const startTime = Date.now();
        
        const [userStats, messageStats] = await Promise.all([
          userService.getUserStats(),
          messageService.getMessageStats()
        ]);
        
        const responseTime = Date.now() - startTime;
        logger.logGraphQLOperation('systemStats', args, context, responseTime);
        
        return {
          userStats,
          messageStats
        };
      } catch (error) {
        logger.error('GraphQL systemStats query error:', error);
        const handledError = handleGraphQLError(error);
        throw new Error(handledError.message);
      }
    },

    // Health check
    health: async (parent, args, context) => {
      try {
        const database = require('../../config/database');
        const dbStatus = database.isConnected() ? 'connected' : 'disconnected';
        return `Server is running. Database: ${dbStatus}`;
      } catch (error) {
        logger.error('GraphQL health query error:', error);
        return 'Server is running with issues';
      }
    }
  },

  Mutation: {
    // Post a new message
    postMessage: async (parent, args, context) => {
      try {
        const startTime = Date.now();
        const { userId, body } = args;
        
        const result = await messageService.postMessage(userId, body);
        
        const responseTime = Date.now() - startTime;
        logger.logGraphQLOperation('postMessage', { userId, bodyLength: body?.length }, context, responseTime);
        
        return result;
      } catch (error) {
        logger.error('GraphQL postMessage mutation error:', error);
        const handledError = handleGraphQLError(error);
        throw new Error(handledError.message);
      }
    },

    // Update an existing message
    updateMessage: async (parent, args, context) => {
      try {
        const startTime = Date.now();
        const { id, body } = args;
        
        const message = await messageService.updateMessage(id, body);
        
        const responseTime = Date.now() - startTime;
        logger.logGraphQLOperation('updateMessage', { id, bodyLength: body?.length }, context, responseTime);
        
        return message;
      } catch (error) {
        logger.error('GraphQL updateMessage mutation error:', error);
        const handledError = handleGraphQLError(error);
        throw new Error(handledError.message);
      }
    },

    // Delete a message
    deleteMessage: async (parent, args, context) => {
      try {
        const startTime = Date.now();
        const { id } = args;
        
        const result = await messageService.deleteMessage(id);
        
        const responseTime = Date.now() - startTime;
        logger.logGraphQLOperation('deleteMessage', { id }, context, responseTime);
        
        return result;
      } catch (error) {
        logger.error('GraphQL deleteMessage mutation error:', error);
        const handledError = handleGraphQLError(error);
        throw new Error(handledError.message);
      }
    }
  },

  // Field resolvers for Message type
  Message: {
    // Ensure user is properly populated
    user: async (parent, args, context) => {
      try {
        if (parent.user && typeof parent.user === 'object' && parent.user.name) {
          return parent.user; // Already populated
        }
        
        // If user is just an ID, fetch the full user object
        const user = await userService.getUserById(parent.user);
        return user;
      } catch (error) {
        logger.error('Error resolving message user:', error);
        return null;
      }
    },

    // Ensure previousMessage is properly populated
    previousMessage: async (parent, args, context) => {
      try {
        if (!parent.previousMessage) return null;
        
        if (typeof parent.previousMessage === 'object' && parent.previousMessage.body) {
          return parent.previousMessage; // Already populated
        }
        
        // If previousMessage is just an ID, fetch the full message object
        const message = await messageService.getMessageById(parent.previousMessage);
        return message;
      } catch (error) {
        logger.error('Error resolving previous message:', error);
        return null;
      }
    },

    // Ensure nextMessage is properly populated
    nextMessage: async (parent, args, context) => {
      try {
        if (!parent.nextMessage) return null;
        
        if (typeof parent.nextMessage === 'object' && parent.nextMessage.body) {
          return parent.nextMessage; // Already populated
        }
        
        // If nextMessage is just an ID, fetch the full message object
        const message = await messageService.getMessageById(parent.nextMessage);
        return message;
      } catch (error) {
        logger.error('Error resolving next message:', error);
        return null;
      }
    }
  }
};

module.exports = messageResolvers;
