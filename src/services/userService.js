const User = require('../models/User');
const logger = require('../utils/logger');
const { ValidationError, NotFoundError, ConflictError } = require('../utils/errors');

class UserService {
  async createUser(userData) {
    try {
      const { name, email } = userData;

      // Validate input
      if (!name || !email) {
        throw new ValidationError('Name and email are required');
      }

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        throw new ConflictError('User with this email already exists');
      }

      // Create new user
      const user = new User({
        name: name.trim(),
        email: email.toLowerCase().trim()
      });

      const savedUser = await user.save();
      
      logger.info('User created successfully', {
        userId: savedUser._id,
        email: savedUser.email,
        name: savedUser.name
      });

      return savedUser;
    } catch (error) {
      if (error.name === 'ValidationError') {
        throw new ValidationError(error.message);
      }
      if (error instanceof ConflictError || error instanceof ValidationError) {
        throw error;
      }
      
      logger.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  async getUserById(userId) {
    try {
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const user = await User.findById(userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      
      logger.error('Error fetching user by ID:', error);
      throw new Error('Failed to fetch user');
    }
  }

  async getUserByEmail(email) {
    try {
      if (!email) {
        throw new ValidationError('Email is required');
      }

      const user = await User.findByEmail(email).populate({
        path: 'messages',
        options: { sort: { createdAt: -1 }, limit: 20 }
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      return user;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      
      logger.error('Error fetching user by email:', error);
      throw new Error('Failed to fetch user');
    }
  }

  async getAllUsers(options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;
      
      const users = await User.find({})
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(Math.min(limit, 100)); // Cap at 100

      return users;
    } catch (error) {
      logger.error('Error fetching all users:', error);
      throw new Error('Failed to fetch users');
    }
  }

  async updateUser(userId, updateData) {
    try {
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const { name, email } = updateData;
      const updates = {};

      if (name !== undefined) {
        if (!name || name.trim().length < 2) {
          throw new ValidationError('Name must be at least 2 characters long');
        }
        updates.name = name.trim();
      }

      if (email !== undefined) {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          throw new ValidationError('Please provide a valid email address');
        }
        
        // Check if email is already taken by another user
        const existingUser = await User.findOne({ 
          email: email.toLowerCase().trim(),
          _id: { $ne: userId }
        });
        
        if (existingUser) {
          throw new ConflictError('Email address is already taken');
        }
        
        updates.email = email.toLowerCase().trim();
      }

      if (Object.keys(updates).length === 0) {
        throw new ValidationError('No valid update data provided');
      }

      const user = await User.findByIdAndUpdate(
        userId, 
        updates, 
        { new: true, runValidators: true }
      );

      if (!user) {
        throw new NotFoundError('User not found');
      }

      logger.info('User updated successfully', {
        userId: user._id,
        updates: Object.keys(updates)
      });

      return user;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError || error instanceof ConflictError) {
        throw error;
      }
      
      logger.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  async deleteUser(userId) {
    try {
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Note: In a real application, you might want to handle cascade deletion
      // of messages or implement soft deletion instead
      await User.findByIdAndDelete(userId);

      logger.info('User deleted successfully', {
        userId: userId,
        email: user.email
      });

      return true;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      
      logger.error('Error deleting user:', error);
      throw new Error('Failed to delete user');
    }
  }
}

module.exports = new UserService();