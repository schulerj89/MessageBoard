const User = require('../src/models/User');
const userService = require('../src/services/userService');

describe('User Model and Service', () => {
  describe('User Model', () => {
    it('should create a user with valid data', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com'
      };

      const user = new User(userData);
      await user.save();

      expect(user._id).toBeValidObjectId();
      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
      expect(user.postCount).toBe(0);
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should validate email format', async () => {
      const userData = {
        name: 'John Doe',
        email: 'invalid-email'
      };

      const user = new User(userData);
      
      await expect(user.save()).rejects.toThrow();
    });

    it('should require name and email', async () => {
      const user = new User({});
      
      await expect(user.save()).rejects.toThrow();
    });

    it('should enforce unique email constraint', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com'
      };

      // Create first user
      const user1 = new User(userData);
      await user1.save();

      // Try to create second user with same email
      const user2 = new User(userData);
      await expect(user2.save()).rejects.toThrow();
    });
  });

  describe('User Service', () => {
    it('should create a user successfully', async () => {
      const userData = {
        name: 'Jane Doe',
        email: 'jane@example.com'
      };

      const user = await userService.createUser(userData);

      expect(user._id).toBeValidObjectId();
      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
    });

    it('should get user by ID', async () => {
      const testUser = await global.testUtils.createTestUser();
      
      const user = await userService.getUserById(testUser._id);
      
      expect(user._id.toString()).toBe(testUser._id.toString());
      expect(user.name).toBe(testUser.name);
    });

    it('should get all users', async () => {
      await global.testUtils.createTestUser({ name: 'User 1', email: 'user1@example.com' });
      await global.testUtils.createTestUser({ name: 'User 2', email: 'user2@example.com' });
      
      const users = await userService.getAllUsers();
      
      expect(users).toHaveLength(2);
    });

    it('should update user successfully', async () => {
      const testUser = await global.testUtils.createTestUser();
      
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com'
      };
      
      const updatedUser = await userService.updateUser(testUser._id, updateData);
      
      expect(updatedUser.name).toBe(updateData.name);
      expect(updatedUser.email).toBe(updateData.email);
    });

    it('should delete user successfully', async () => {
      const testUser = await global.testUtils.createTestUser();
      
      const result = await userService.deleteUser(testUser._id);
      
      expect(result).toBe(true);
      
      // Verify user is deleted
      await expect(userService.getUserById(testUser._id))
        .rejects.toThrow('User not found');
    });
  });
});
