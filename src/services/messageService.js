const Message = require('../models/Message');
const User = require('../models/User');
const logger = require('../utils/logger');
const { messageRateLimiter } = require('../middleware/rateLimiter');
const { ValidationError, NotFoundError, RateLimitError } = require('../utils/errors');

class MessageService {
  async postMessage(userId, body) {
    try {
      // Validate input
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      if (!body) {
        throw new ValidationError('Message body is required');
      }

      if (body.trim().length === 0) {
        throw new ValidationError('Message body cannot be empty');
      }

      if (body.length > 1000) {
        throw new ValidationError('Message body cannot exceed 1000 characters');
      }

      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Check rate limit and record request atomically to prevent race conditions
      const rateLimitResult = await messageRateLimiter.checkAndRecordRequest(userId);
      if (rateLimitResult.isLimited) {
        // Log rate limit hit with detailed information
        logger.warn('Rate limit exceeded for message posting', {
          userId: userId,
          userName: user.name,
          userEmail: user.email,
          currentRequests: rateLimitResult.currentCount,
          maxRequests: 10,
          resetTime: rateLimitResult.resetTime,
          remainingRequests: rateLimitResult.remainingRequests,
          windowMs: rateLimitResult.windowMs,
          action: 'postMessage',
          timestamp: new Date().toISOString()
        });

        throw new RateLimitError(
          'Rate limit exceeded. Maximum 10 messages per hour.',
          rateLimitResult.resetTime,
          rateLimitResult.remainingRequests
        );
      }

      // Create message
      const message = new Message({
        body: body.trim(),
        user: userId
      });

      const savedMessage = await message.save();
      
      // Populate user information
      await savedMessage.populate('user', 'name email');
      await savedMessage.populate('previousMessage', 'body createdAt');

      // Get updated rate limit status
      const updatedRateLimitStatus = await messageRateLimiter.checkRateLimit(userId);

      // Log warning if user is approaching rate limit (80% capacity)
      if (updatedRateLimitStatus.remainingRequests <= 2) {
        logger.warn('User approaching rate limit', {
          userId: userId,
          userName: user.name,
          userEmail: user.email,
          remainingRequests: updatedRateLimitStatus.remainingRequests,
          maxRequests: 10,
          usagePercentage: ((10 - updatedRateLimitStatus.remainingRequests) / 10 * 100).toFixed(1),
          resetTime: updatedRateLimitStatus.resetTime,
          action: 'postMessage',
          timestamp: new Date().toISOString()
        });
      }

      logger.info('Message posted successfully', {
        messageId: savedMessage._id,
        userId: userId,
        userName: user.name,
        userEmail: user.email,
        bodyLength: body.length,
        remainingPosts: updatedRateLimitStatus.remainingRequests,
        totalUserPosts: user.postCount + 1, // Will be incremented by the model middleware
        action: 'postMessage',
        timestamp: new Date().toISOString()
      });

      return {
        message: savedMessage,
        rateLimitInfo: updatedRateLimitStatus,
        success: true
      };

    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof RateLimitError) {
        // For rate limit errors, still return rate limit info
        if (error instanceof RateLimitError) {
          const rateLimitStatus = await messageRateLimiter.checkRateLimit(userId);
          
          // Log the rate limit error response
          logger.error('Rate limit error response sent to client', {
            userId: userId,
            error: error.message,
            rateLimitInfo: rateLimitStatus,
            action: 'postMessage',
            timestamp: new Date().toISOString()
          });

          return {
            message: null,
            rateLimitInfo: rateLimitStatus,
            success: false,
            error: error.message
          };
        }
        throw error;
      }
      
      logger.error('Error posting message:', error);
      throw new Error('Failed to post message');
    }
  }

  async getMessageById(messageId) {
    try {
      if (!messageId) {
        throw new ValidationError('Message ID is required');
      }

      const message = await Message.findById(messageId)
        .populate('user', 'name email')
        .populate('previousMessage', 'body createdAt')
        .populate('nextMessage', 'body createdAt');

      if (!message) {
        throw new NotFoundError('Message not found');
      }

      return message;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      
      logger.error('Error fetching message by ID:', error);
      throw new Error('Failed to fetch message');
    }
  }

  async getAllMessages(options = {}) {
    try {
      const { limit = 100, offset = 0, startDate, endDate, userId } = options;
      
      let query = {};
      
      // Filter by user if specified
      if (userId) {
        query.user = userId;
      }

      // Filter by date range if specified
      if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) {
          query.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          query.createdAt.$lte = new Date(endDate);
        }
      }

      const messages = await Message.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(Math.min(limit, 100)) // Cap at 100
        .populate('user', 'name email')
        .populate('previousMessage', 'body createdAt')
        .populate('nextMessage', 'body createdAt');

      return messages;
    } catch (error) {
      logger.error('Error fetching all messages:', error);
      throw new Error('Failed to fetch messages');
    }
  }

  async getMessagesByUser(userId, options = {}) {
    try {
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      const { limit = 50, offset = 0 } = options;

      const messages = await Message.getMessagesByUser(userId, {
        limit: Math.min(limit, 100), // Cap at 100
        offset,
        sortOrder: -1 // Most recent first
      });

      return messages;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      
      logger.error('Error fetching messages by user:', error);
      throw new Error('Failed to fetch user messages');
    }
  }

  async getRecentMessages(hours = 24, limit = 50) {
    try {
      const messages = await Message.getRecentMessages(
        hours, 
        Math.min(limit, 100) // Cap at 100
      );

      return messages;
    } catch (error) {
      logger.error('Error fetching recent messages:', error);
      throw new Error('Failed to fetch recent messages');
    }
  }

  async updateMessage(messageId, newBody) {
    try {
      if (!messageId) {
        throw new ValidationError('Message ID is required');
      }

      if (!newBody) {
        throw new ValidationError('New body is required');
      }

      if (newBody.trim().length === 0) {
        throw new ValidationError('Message body cannot be empty');
      }

      if (newBody.length > 1000) {
        throw new ValidationError('Message body cannot exceed 1000 characters');
      }

      const message = await Message.findByIdAndUpdate(
        messageId,
        { body: newBody.trim() },
        { new: true, runValidators: true }
      )
        .populate('user', 'name email')
        .populate('previousMessage', 'body createdAt')
        .populate('nextMessage', 'body createdAt');

      if (!message) {
        throw new NotFoundError('Message not found');
      }

      logger.info('Message updated successfully', {
        messageId: message._id,
        userId: message.user._id,
        newBodyLength: newBody.length
      });

      return message;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      
      logger.error('Error updating message:', error);
      throw new Error('Failed to update message');
    }
  }

  async deleteMessage(messageId) {
    try {
      if (!messageId) {
        throw new ValidationError('Message ID is required');
      }

      const message = await Message.findById(messageId);
      if (!message) {
        throw new NotFoundError('Message not found');
      }

      // Handle message linking before deletion
      if (message.previousMessage && message.nextMessage) {
        // Update previous message to point to next message
        await Message.findByIdAndUpdate(
          message.previousMessage,
          { nextMessage: message.nextMessage }
        );
        
        // Update next message to point to previous message
        await Message.findByIdAndUpdate(
          message.nextMessage,
          { previousMessage: message.previousMessage }
        );
      } else if (message.previousMessage) {
        // Update previous message to have no next message
        await Message.findByIdAndUpdate(
          message.previousMessage,
          { nextMessage: null }
        );
      } else if (message.nextMessage) {
        // Update next message to have no previous message
        await Message.findByIdAndUpdate(
          message.nextMessage,
          { previousMessage: null }
        );
      }

      // Decrement user's post count
      await User.findByIdAndUpdate(
        message.user,
        { $inc: { postCount: -1 } }
      );

      await Message.findByIdAndDelete(messageId);

      logger.info('Message deleted successfully', {
        messageId: messageId,
        userId: message.user
      });

      return true;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      
      logger.error('Error deleting message:', error);
      throw new Error('Failed to delete message');
    }
  }

  async getRateLimitStatus(userId) {
    try {
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const rateLimitStatus = await messageRateLimiter.getUserStatus(userId);
      
      return {
        isLimited: rateLimitStatus.isLimited,
        remainingRequests: rateLimitStatus.remainingRequests,
        resetTime: rateLimitStatus.resetTime,
        windowMs: rateLimitStatus.windowMs,
        currentCount: rateLimitStatus.currentCount
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      
      logger.error('Error getting rate limit status:', error);
      throw new Error('Failed to get rate limit status');
    }
  }

  async getMessageStats(userId = null) {
    try {
      if (userId) {
        // Get stats for specific user
        const user = await User.findById(userId);
        if (!user) {
          throw new NotFoundError('User not found');
        }

        const stats = await Message.getUserMessageStats(userId);
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const messagesInLastHour = await Message.countDocuments({
          user: userId,
          createdAt: { $gte: oneHourAgo }
        });

        const messagesInLastDay = await Message.countDocuments({
          user: userId,
          createdAt: { $gte: oneDayAgo }
        });

        return {
          totalMessages: stats[0]?.totalMessages || 0,
          avgMessageLength: stats[0]?.avgMessageLength || 0,
          messagesInLastHour,
          messagesInLastDay,
          firstMessage: stats[0]?.firstMessage || null,
          lastMessage: stats[0]?.lastMessage || null
        };
      } else {
        // Get global message stats
        const stats = await Message.getMessageStats();
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const messagesInLastHour = await Message.countDocuments({
          createdAt: { $gte: oneHourAgo }
        });

        const messagesInLastDay = await Message.countDocuments({
          createdAt: { $gte: oneDayAgo }
        });

        return {
          totalMessages: stats.totalMessages,
          avgMessageLength: stats.avgMessageLength,
          messagesInLastHour,
          messagesInLastDay,
          oldestMessage: stats.oldestMessage,
          newestMessage: stats.newestMessage
        };
      }
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      
      logger.error('Error getting message stats:', error);
      throw new Error('Failed to get message statistics');
    }
  }
}

module.exports = new MessageService();
