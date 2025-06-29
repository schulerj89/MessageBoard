const mongoose = require('mongoose');
const { Schema } = mongoose;

const messageSchema = new Schema({
  body: {
    type: String,
    required: [true, 'Message body is required'],
    trim: true,
    minlength: [1, 'Message cannot be empty'],
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  previousMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  nextMessage: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
messageSchema.index({ user: 1, createdAt: -1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ previousMessage: 1 });
messageSchema.index({ nextMessage: 1 });

// Pre-save middleware to handle message linking and user validation
messageSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      // Validate that the user exists
      const User = mongoose.model('User');
      const userExists = await User.findById(this.user);
      if (!userExists) {
        const error = new Error('Referenced user does not exist');
        error.name = 'ValidationError';
        return next(error);
      }

      // Find the latest message from the same user
      const latestMessage = await this.constructor
        .findOne({ user: this.user })
        .sort({ createdAt: -1 });

      if (latestMessage) {
        // Link this message to the previous one
        this.previousMessage = latestMessage._id;
        
        // Update the previous message to point to this one
        await this.constructor.findByIdAndUpdate(
          latestMessage._id,
          { nextMessage: this._id }
        );
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Post-save middleware to update user's post count
messageSchema.post('save', async function(doc) {
  try {
    const User = mongoose.model('User');
    await User.findByIdAndUpdate(
      doc.user,
      { 
        $inc: { postCount: 1 },
        lastPostAt: new Date()
      }
    );
  } catch (error) {
    console.error('Error updating user post count:', error);
  }
});

// Instance methods
messageSchema.methods.getPreviousMessages = function(limit = 10) {
  return this.constructor
    .find({ 
      user: this.user,
      createdAt: { $lt: this.createdAt }
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'name email');
};

messageSchema.methods.getNextMessages = function(limit = 10) {
  return this.constructor
    .find({ 
      user: this.user,
      createdAt: { $gt: this.createdAt }
    })
    .sort({ createdAt: 1 })
    .limit(limit)
    .populate('user', 'name email');
};

// Static methods
messageSchema.statics.getMessagesByUser = function(userId, options = {}) {
  const { limit = 50, offset = 0, sortOrder = -1 } = options;
  
  return this.find({ user: userId })
    .sort({ createdAt: sortOrder })
    .skip(offset)
    .limit(limit)
    .populate('user', 'name email')
    .populate('previousMessage', 'body createdAt')
    .populate('nextMessage', 'body createdAt');
};

messageSchema.statics.getAllMessages = function(options = {}) {
  const { limit = 100, offset = 0, sortOrder = -1 } = options;
  
  return this.find({})
    .sort({ createdAt: sortOrder })
    .skip(offset)
    .limit(limit)
    .populate('user', 'name email')
    .populate('previousMessage', 'body createdAt')
    .populate('nextMessage', 'body createdAt');
};

messageSchema.statics.getRecentMessages = function(hours = 24, limit = 50) {
  const timeThreshold = new Date(Date.now() - hours * 60 * 60 * 1000);
  
  return this.find({ createdAt: { $gte: timeThreshold } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('user', 'name email');
};

messageSchema.statics.getMessageStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalMessages: { $sum: 1 },
        avgMessageLength: { $avg: { $strLenCP: '$body' } },
        oldestMessage: { $min: '$createdAt' },
        newestMessage: { $max: '$createdAt' }
      }
    }
  ]);
  
  return stats[0] || {
    totalMessages: 0,
    avgMessageLength: 0,
    oldestMessage: null,
    newestMessage: null
  };
};

messageSchema.statics.getUserMessageStats = function(userId) {
  return this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$user',
        totalMessages: { $sum: 1 },
        avgMessageLength: { $avg: { $strLenCP: '$body' } },
        firstMessage: { $min: '$createdAt' },
        lastMessage: { $max: '$createdAt' }
      }
    }
  ]);
};

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
