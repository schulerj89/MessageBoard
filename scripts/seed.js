const mongoose = require('mongoose');
const User = require('../src/models/User');
const Message = require('../src/models/Message');
const database = require('../src/config/database');
const logger = require('../src/utils/logger');

const sampleUsers = [
  {
    name: 'Alice Johnson',
    email: 'alice@example.com'
  },
  {
    name: 'Bob Smith',
    email: 'bob@example.com'
  },
  {
    name: 'Charlie Brown',
    email: 'charlie@example.com'
  },
  {
    name: 'Diana Wilson',
    email: 'diana@example.com'
  },
  {
    name: 'Eve Davis',
    email: 'eve@example.com'
  }
];

const sampleMessages = [
  'Welcome to the message board! 👋',
  'This is a sample message to demonstrate the API functionality.',
  'You can post messages up to 1000 characters long.',
  'Rate limiting ensures no more than 10 messages per hour per user.',
  'Messages are automatically linked to show conversation flow.',
  'GraphQL provides a flexible API for querying data.',
  'The system supports both user and message management.',
  'All operations are logged for monitoring and debugging.',
  'Security headers and CORS are properly configured.',
  'The database uses MongoDB with Mongoose ODM.',
  'Feel free to explore the API using GraphQL Playground!',
  'Check out the health endpoint for system status.',
  'Users can be created, updated, and deleted.',
  'Messages maintain references to previous and next messages.',
  'The API includes comprehensive error handling.'
];

async function seedDatabase() {
  try {
    logger.info('Starting database seeding...');

    // Connect to database
    await database.connect();

    // Clear existing data
    await User.deleteMany({});
    await Message.deleteMany({});
    logger.info('Cleared existing data');

    // Create users
    logger.info('Creating sample users...');
    const users = [];
    for (const userData of sampleUsers) {
      const user = new User(userData);
      await user.save();
      users.push(user);
      logger.info(`Created user: ${user.name} (${user.email})`);
    }

    // Create messages
    logger.info('Creating sample messages...');
    let messageIndex = 0;
    
    for (let i = 0; i < sampleMessages.length; i++) {
      const user = users[i % users.length]; // Distribute messages among users
      const messageBody = sampleMessages[i];
      
      const message = new Message({
        body: messageBody,
        user: user._id
      });
      
      await message.save();
      
      // Add some delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 100));
      
      logger.info(`Created message by ${user.name}: "${messageBody.substring(0, 50)}..."`);
    }

    // Display summary
    const userCount = await User.countDocuments();
    const messageCount = await Message.countDocuments();
    
    logger.info('Database seeding completed!');
    logger.info(`Created ${userCount} users and ${messageCount} messages`);
    
    // Display user stats
    for (const user of users) {
      const updatedUser = await User.findById(user._id);
      logger.info(`${updatedUser.name}: ${updatedUser.postCount} messages`);
    }

  } catch (error) {
    logger.error('Error seeding database:', error);
    throw error;
  } finally {
    await database.disconnect();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
