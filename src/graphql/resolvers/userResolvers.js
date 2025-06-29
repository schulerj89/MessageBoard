const userService = require('../../services/userService');
const { handleGraphQLError } = require('../../utils/errors');
const logger = require('../../utils/logger');

const userResolvers = {
  Query: {
    // Get all users with optional filtering
    users: async (parent, args, context) => {
      try {
        const startTime = Date.now();
        const { filter = {} } = args;
        
        const users = await userService.getAllUsers(filter);
        
        const responseTime = Date.now() - startTime;
        logger.logGraphQLOperation('users', args, context, responseTime);
        
        return users;
      } catch (error) {
        logger.error('GraphQL users query error:', error);
        const handledError = handleGraphQLError(error);
        throw new Error(handledError.message);
      }
    },

    // Get user by ID
    user: async (parent, args, context) => {
      try {
        const startTime = Date.now();
        const { id } = args;
        
        const user = await userService.getUserById(id);
        
        const responseTime = Date.now() - startTime;
        logger.logGraphQLOperation('user', args, context, responseTime);
        
        return user;
      } catch (error) {
        logger.error('GraphQL user query error:', error);
        const handledError = handleGraphQLError(error);
        throw new Error(handledError.message);
      }
    },

    // Get user by email
    userByEmail: async (parent, args, context) => {
      try {
        const startTime = Date.now();
        const { email } = args;
        
        const user = await userService.getUserByEmail(email);
        
        const responseTime = Date.now() - startTime;
        logger.logGraphQLOperation('userByEmail', args, context, responseTime);
        
        return user;
      } catch (error) {
        logger.error('GraphQL userByEmail query error:', error);
        const handledError = handleGraphQLError(error);
        throw new Error(handledError.message);
      }
    },
  },

  Mutation: {
    // Create a new user
    createUser: async (parent, args, context) => {
      try {
        const startTime = Date.now();
        const { name, email } = args;
        
        const user = await userService.createUser({ name, email });
        
        const responseTime = Date.now() - startTime;
        logger.logGraphQLOperation('createUser', { name, email: '***' }, context, responseTime);
        
        return user;
      } catch (error) {
        logger.error('GraphQL createUser mutation error:', error);
        const handledError = handleGraphQLError(error);
        throw new Error(handledError.message);
      }
    },

    // Update an existing user
    updateUser: async (parent, args, context) => {
      try {
        const startTime = Date.now();
        const { id, name, email } = args;
        
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        
        const user = await userService.updateUser(id, updateData);
        
        const responseTime = Date.now() - startTime;
        logger.logGraphQLOperation('updateUser', { id, ...updateData }, context, responseTime);
        
        return user;
      } catch (error) {
        logger.error('GraphQL updateUser mutation error:', error);
        const handledError = handleGraphQLError(error);
        throw new Error(handledError.message);
      }
    },

    // Delete a user
    deleteUser: async (parent, args, context) => {
      try {
        const startTime = Date.now();
        const { id } = args;
        
        const result = await userService.deleteUser(id);
        
        const responseTime = Date.now() - startTime;
        logger.logGraphQLOperation('deleteUser', { id }, context, responseTime);
        
        return result;
      } catch (error) {
        logger.error('GraphQL deleteUser mutation error:', error);
        const handledError = handleGraphQLError(error);
        throw new Error(handledError.message);
      }
    }
  },

  // Field resolvers for User type
  User: {
    // Resolve messages for a user (with pagination)
    messages: async (parent, args, context) => {
      try {
        const Message = require('../../models/Message');
        const messages = await Message.getMessagesByUser(parent.id, {
          limit: 20, // Default limit
          sortOrder: -1 // Most recent first
        });
        return messages;
      } catch (error) {
        logger.error('Error resolving user messages:', error);
        return [];
      }
    }
  }
};

module.exports = userResolvers;
