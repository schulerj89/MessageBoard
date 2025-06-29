const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters long'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid email address'
    ]
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  postCount: {
    type: Number,
    default: 0,
    min: [0, 'Post count cannot be negative']
  },
  lastPostAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for messages
userSchema.virtual('messages', {
  ref: 'Message',
  localField: '_id',
  foreignField: 'user'
});

// Index for performance
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to update timestamps
userSchema.pre('save', function(next) {
  if (this.isNew) {
    this.createdAt = new Date();
  }
  next();
});

// Instance methods
userSchema.methods.incrementPostCount = function() {
  this.postCount += 1;
  this.lastPostAt = new Date();
  return this.save();
};

userSchema.methods.getPostsInLastHour = function() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  return mongoose.model('Message').countDocuments({
    user: this._id,
    createdAt: { $gte: oneHourAgo }
  });
};

userSchema.methods.canPost = async function() {
  const postsInLastHour = await this.getPostsInLastHour();
  return postsInLastHour < 10; // Rate limit: 10 posts per hour
};

userSchema.methods.getRemainingPosts = async function() {
  const postsInLastHour = await this.getPostsInLastHour();
  return Math.max(0, 10 - postsInLastHour);
};

// Static methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.getActiveUsers = function(days = 30) {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.find({ lastPostAt: { $gte: date } }).sort({ lastPostAt: -1 });
};

// Error handling
userSchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    next(new Error('Email address is already registered'));
  } else {
    next(error);
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
