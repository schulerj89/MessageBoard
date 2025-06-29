// MongoDB initialization script for Docker
db = db.getSiblingDB('messageboard');

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ createdAt: -1 });
db.users.createIndex({ lastPostAt: -1 });

db.messages.createIndex({ user: 1, createdAt: -1 });
db.messages.createIndex({ createdAt: -1 });
db.messages.createIndex({ previousMessage: 1 });
db.messages.createIndex({ nextMessage: 1 });

// Create rate limit collection with TTL index
db.createCollection('rateLimits');
db.rateLimits.createIndex({ resetTime: 1 }, { expireAfterSeconds: 0 });

print('Database initialized with indexes');
