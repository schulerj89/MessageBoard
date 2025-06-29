const Message = require('../src/models/Message');
const User = require('../src/models/User');
const messageService = require('../src/services/messageService');
const { messageRateLimiter } = require('../src/middleware/rateLimiter');

describe('Message Model and Service', () => {
  let testUser;

  beforeEach(async () => {
    // Create a test user for each test
    testUser = await global.testUtils.createTestUser({
      name: 'Test User',
      email: 'testuser@example.com'
    });

    // Reset rate limiter for the test user
    await messageRateLimiter.resetUserLimit(testUser._id);
  });

  afterEach(async () => {
    // Clean up any pending timeouts or intervals
    if (global.gc) {
      global.gc();
    }
  });

  describe('Message Model', () => {
    it('should create a message with valid data', async () => {
      const messageData = {
        body: 'This is a test message',
        user: testUser._id
      };

      const message = new Message(messageData);
      await message.save();

      expect(message._id).toBeValidObjectId();
      expect(message.body).toBe(messageData.body);
      expect(message.user.toString()).toBe(testUser._id.toString());
      expect(message.createdAt).toBeInstanceOf(Date);
    });

    it('should require body and user', async () => {
      const message = new Message({});
      
      await expect(message.save()).rejects.toThrow();
    });

    it('should validate body length', async () => {
      const longBody = 'a'.repeat(1001); // Exceeds 1000 character limit
      const message = new Message({
        body: longBody,
        user: testUser._id
      });
      
      await expect(message.save()).rejects.toThrow();
    });

    it('should trim whitespace from body', async () => {
      const messageData = {
        body: '  This message has extra spaces  ',
        user: testUser._id
      };

      const message = new Message(messageData);
      await message.save();

      expect(message.body).toBe('This message has extra spaces');
    });

    it('should not allow empty or whitespace-only body', async () => {
      const message1 = new Message({
        body: '',
        user: testUser._id
      });

      const message2 = new Message({
        body: '   ',
        user: testUser._id
      });
      
      await expect(message1.save()).rejects.toThrow();
      await expect(message2.save()).rejects.toThrow();
    });

    it('should validate user reference', async () => {
      const invalidUserId = '507f1f77bcf86cd799439011'; // Valid ObjectId format but non-existent
      const message = new Message({
        body: 'Test message',
        user: invalidUserId
      });
      
      await expect(message.save()).rejects.toThrow();
    });

    it('should handle message linking correctly', async () => {
      // Create first message
      const message1 = await Message.create({
        body: 'First message',
        user: testUser._id
      });

      // Create second message (should link to first)
      const message2 = await Message.create({
        body: 'Second message',
        user: testUser._id
      });

      // Reload messages to check linking
      const reloadedMessage1 = await Message.findById(message1._id);
      const reloadedMessage2 = await Message.findById(message2._id);

      expect(reloadedMessage2.previousMessage?.toString()).toBe(message1._id.toString());
      expect(reloadedMessage1.nextMessage?.toString()).toBe(message2._id.toString());
    });

    it('should increment user post count on save', async () => {
      const initialPostCount = testUser.postCount;

      await Message.create({
        body: 'Test message',
        user: testUser._id
      });

      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.postCount).toBe(initialPostCount + 1);
    });
  });

  describe('Message Service', () => {
    it('should post a message successfully', async () => {
      const messageBody = 'This is a test message from service';
      
      const result = await messageService.postMessage(testUser._id, messageBody);
      
      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.message.body).toBe(messageBody);
      expect(result.message.user._id.toString()).toBe(testUser._id.toString());
      expect(result.rateLimitInfo).toBeDefined();
      expect(result.rateLimitInfo.remainingRequests).toBe(9); // 10 - 1
    });

    it('should validate required fields', async () => {
      await expect(messageService.postMessage(null, 'Test message'))
        .rejects.toThrow('User ID is required');
      
      await expect(messageService.postMessage(testUser._id, null))
        .rejects.toThrow('Message body is required');
      
      await expect(messageService.postMessage(testUser._id, ''))
        .rejects.toThrow('Message body is required');
      
      await expect(messageService.postMessage(testUser._id, '   '))
        .rejects.toThrow('Message body cannot be empty');
    });

    it('should validate message length', async () => {
      const longMessage = 'a'.repeat(1001);
      
      await expect(messageService.postMessage(testUser._id, longMessage))
        .rejects.toThrow('Message body cannot exceed 1000 characters');
    });

    it('should validate user existence', async () => {
      const nonExistentUserId = '507f1f77bcf86cd799439011';
      
      await expect(messageService.postMessage(nonExistentUserId, 'Test message'))
        .rejects.toThrow('User not found');
    });

    it('should enforce rate limiting', async () => {
      const messageBody = 'Rate limit test message';
      
      // Post 10 messages (hit the rate limit)
      for (let i = 0; i < 10; i++) {
        await messageService.postMessage(testUser._id, `${messageBody} ${i + 1}`);
      }
      
      // 11th message should be rate limited
      const result = await messageService.postMessage(testUser._id, 'This should be rate limited');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
      expect(result.rateLimitInfo.isLimited).toBe(true);
      expect(result.rateLimitInfo.remainingRequests).toBe(0);
    });

    it('should provide rate limit warnings when approaching limit', async () => {
      // Post 8 messages (80% of 10)
      for (let i = 0; i < 8; i++) {
        await messageService.postMessage(testUser._id, `Message ${i + 1}`);
      }
      
      // 9th message should trigger warning logging
      const result = await messageService.postMessage(testUser._id, 'Message 9');
      
      expect(result.success).toBe(true);
      expect(result.rateLimitInfo.remainingRequests).toBe(1);
    });

    it('should get message by ID', async () => {
      const testMessage = await global.testUtils.createTestMessage(testUser._id, {
        body: 'Test message for retrieval'
      });
      
      const retrievedMessage = await messageService.getMessageById(testMessage._id);
      
      expect(retrievedMessage._id.toString()).toBe(testMessage._id.toString());
      expect(retrievedMessage.body).toBe('Test message for retrieval');
      expect(retrievedMessage.user._id.toString()).toBe(testUser._id.toString());
    });

    it('should handle non-existent message ID', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      
      await expect(messageService.getMessageById(nonExistentId))
        .rejects.toThrow('Message not found');
    });

    it('should get all messages with pagination', async () => {
      // Create multiple messages
      for (let i = 0; i < 5; i++) {
        await global.testUtils.createTestMessage(testUser._id, {
          body: `Test message ${i + 1}`
        });
      }
      
      const messages = await messageService.getAllMessages({ limit: 3, offset: 0 });
      
      expect(messages).toHaveLength(3);
      expect(messages[0].body).toContain('Test message');
    });

    it('should get messages by user', async () => {
      // Create another user and messages
      const anotherUser = await global.testUtils.createTestUser({
        name: 'Another User',
        email: 'another@example.com'
      });
      
      // Create messages for both users
      await global.testUtils.createTestMessage(testUser._id, { body: 'User 1 message' });
      await global.testUtils.createTestMessage(anotherUser._id, { body: 'User 2 message' });
      
      const userMessages = await messageService.getMessagesByUser(testUser._id);
      
      expect(userMessages).toHaveLength(1);
      expect(userMessages[0].body).toBe('User 1 message');
      expect(userMessages[0].user._id.toString()).toBe(testUser._id.toString());
    });

    it('should get recent messages', async () => {
      // Create messages with different timestamps
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      const recentDate = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago
      
      // Create old message
      const oldMessage = new Message({
        body: 'Old message',
        user: testUser._id,
        createdAt: oldDate
      });
      await oldMessage.save();
      
      // Create recent message
      const recentMessage = new Message({
        body: 'Recent message',
        user: testUser._id,
        createdAt: recentDate
      });
      await recentMessage.save();
      
      const recentMessages = await messageService.getRecentMessages(24, 10);
      
      expect(recentMessages).toHaveLength(1);
      expect(recentMessages[0].body).toBe('Recent message');
    });

    it('should update message successfully', async () => {
      const testMessage = await global.testUtils.createTestMessage(testUser._id, {
        body: 'Original message'
      });
      
      const updatedMessage = await messageService.updateMessage(
        testMessage._id,
        'Updated message content'
      );
      
      expect(updatedMessage.body).toBe('Updated message content');
      expect(updatedMessage._id.toString()).toBe(testMessage._id.toString());
    });

    it('should validate update data', async () => {
      const testMessage = await global.testUtils.createTestMessage(testUser._id);
      
      await expect(messageService.updateMessage(testMessage._id, null))
        .rejects.toThrow('New body is required');
      
      await expect(messageService.updateMessage(testMessage._id, ''))
        .rejects.toThrow('New body is required');
      
      await expect(messageService.updateMessage(testMessage._id, 'a'.repeat(1001)))
        .rejects.toThrow('Message body cannot exceed 1000 characters');
    });

    it('should delete message successfully', async () => {
      const testMessage = await global.testUtils.createTestMessage(testUser._id, {
        body: 'Message to delete'
      });
      
      const result = await messageService.deleteMessage(testMessage._id);
      
      expect(result).toBe(true);
      
      await expect(messageService.getMessageById(testMessage._id))
        .rejects.toThrow('Message not found');
    });

    it('should handle message linking when deleting', async () => {
      // Create three linked messages
      const message1 = await global.testUtils.createTestMessage(testUser._id, { body: 'Message 1' });
      const message2 = await global.testUtils.createTestMessage(testUser._id, { body: 'Message 2' });
      const message3 = await global.testUtils.createTestMessage(testUser._id, { body: 'Message 3' });
      
      // Delete middle message
      await messageService.deleteMessage(message2._id);
      
      // Check that message1 and message3 are now linked
      const updatedMessage1 = await Message.findById(message1._id);
      const updatedMessage3 = await Message.findById(message3._id);
      
      expect(updatedMessage1.nextMessage?.toString()).toBe(message3._id.toString());
      expect(updatedMessage3.previousMessage?.toString()).toBe(message1._id.toString());
    });

    it('should get rate limit status', async () => {
      // Post a few messages
      await messageService.postMessage(testUser._id, 'Message 1');
      await messageService.postMessage(testUser._id, 'Message 2');
      
      const status = await messageService.getRateLimitStatus(testUser._id);
      
      expect(status.isLimited).toBe(false);
      expect(status.remainingRequests).toBe(8); // 10 - 2
      expect(status.windowMs).toBeDefined();
      expect(status.resetTime).toBeInstanceOf(Date);
    });

    it('should get message statistics', async () => {
      // Create some messages
      await global.testUtils.createTestMessage(testUser._id, { body: 'Short' });
      await global.testUtils.createTestMessage(testUser._id, { body: 'A longer message with more content' });
      
      const stats = await messageService.getMessageStats(testUser._id);
      
      expect(stats.totalMessages).toBe(2);
      expect(stats.avgMessageLength).toBeGreaterThan(0);
      expect(stats.firstMessage).toBeInstanceOf(Date);
      expect(stats.lastMessage).toBeInstanceOf(Date);
    });

    it('should get global message statistics', async () => {
      // Create messages for multiple users
      const anotherUser = await global.testUtils.createTestUser({
        name: 'Another User',
        email: 'another@example.com'
      });
      
      await global.testUtils.createTestMessage(testUser._id, { body: 'User 1 message' });
      await global.testUtils.createTestMessage(anotherUser._id, { body: 'User 2 message' });
      
      const stats = await messageService.getMessageStats();
      
      expect(stats.totalMessages).toBe(2);
      expect(stats.avgMessageLength).toBeGreaterThan(0);
      expect(stats.oldestMessage).toBeInstanceOf(Date);
      expect(stats.newestMessage).toBeInstanceOf(Date);
    });
  });

  describe('Rate Limiter Integration', () => {
    it('should persist rate limit data across service calls', async () => {
      // Post some messages
      await messageService.postMessage(testUser._id, 'Message 1');
      await messageService.postMessage(testUser._id, 'Message 2');
      await messageService.postMessage(testUser._id, 'Message 3');
      
      // Check rate limit status
      const status = await messageService.getRateLimitStatus(testUser._id);
      expect(status.remainingRequests).toBe(7);
      
      // Post another message
      await messageService.postMessage(testUser._id, 'Message 4');
      
      // Status should be updated
      const updatedStatus = await messageService.getRateLimitStatus(testUser._id);
      expect(updatedStatus.remainingRequests).toBe(6);
    });

    it('should handle concurrent message posting', async () => {
      // Reset rate limiter first to ensure clean state
      await messageRateLimiter.resetUserLimit(testUser._id);
      
      // Post messages sequentially to avoid race conditions in tests
      const results = [];
      for (let i = 0; i < 3; i++) {
        const result = await messageService.postMessage(testUser._id, `Sequential message ${i + 1}`);
        results.push(result);
      }
      
      // All should succeed since we're under the limit
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      // Rate limit should reflect all messages
      const status = await messageService.getRateLimitStatus(testUser._id);
      expect(status.remainingRequests).toBe(7); // 10 - 3
      expect(status.currentCount).toBe(3); // 3 requests recorded
    });

    it('should handle truly concurrent requests without race conditions', async () => {
      // Reset rate limiter first to ensure clean state
      await messageRateLimiter.resetUserLimit(testUser._id);
      
      // Verify clean state
      const initialStatus = await messageService.getRateLimitStatus(testUser._id);
      expect(initialStatus.currentCount).toBe(0);
      expect(initialStatus.remainingRequests).toBe(10);
      
      // Create multiple truly concurrent message posting attempts
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(messageService.postMessage(testUser._id, `Concurrent message ${i + 1}`));
      }
      
      const results = await Promise.all(promises);
      
      // All should succeed since we're under the limit with atomic Redis operations
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
      
      // Rate limit should reflect exactly the messages we posted (no race conditions)
      const status = await messageService.getRateLimitStatus(testUser._id);
      
      // With atomic Redis operations, we should have exactly 5 requests recorded
      expect(status.currentCount).toBe(5); // Exactly 5 requests recorded
      expect(status.remainingRequests).toBe(5); // Exactly 5 remaining
      expect(status.currentCount + status.remainingRequests).toBe(10); // Should total exactly 10
    });

    it('should enforce rate limits correctly under high concurrency', async () => {
      // Reset rate limiter first to ensure clean state
      await messageRateLimiter.resetUserLimit(testUser._id);
      
      // Try to post 15 messages concurrently (should only allow 10)
      const promises = [];
      for (let i = 0; i < 15; i++) {
        promises.push(
          messageService.postMessage(testUser._id, `Stress test message ${i + 1}`)
            .catch(error => ({ error: error.message, success: false }))
        );
      }
      
      const results = await Promise.all(promises);
      
      // Count successful and failed requests
      const successful = results.filter(r => r.success === true);
      const failed = results.filter(r => r.success === false);
      
      // Should have exactly 10 successful and 5 failed
      expect(successful.length).toBe(10);
      expect(failed.length).toBe(5);
      
      // All failures should be rate limit errors
      failed.forEach(result => {
        expect(result.error).toContain('Rate limit exceeded');
      });
      
      // Final status should show exactly 10 requests and 0 remaining
      const status = await messageService.getRateLimitStatus(testUser._id);
      
      expect(status.currentCount).toBe(10);
      expect(status.remainingRequests).toBe(0);
    });
  });
});
