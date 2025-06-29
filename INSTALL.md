# Message Board API - Installation & Setup Guide

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- Git

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy the example environment file and update it with your settings:
```bash
cp .env.example .env
```

Update the `.env` file with your MongoDB connection string:
```env
MONGODB_URI=mongodb://localhost:27017/messageboard
```

### 3. Start MongoDB
If using local MongoDB:
```bash
mongod
```

Or use MongoDB Atlas by updating the `MONGODB_URI` in your `.env` file.

### 4. Seed the Database (Optional)
```bash
npm run seed
```

### 5. Start the Server
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

### 6. Access the API
- GraphQL Playground: http://localhost:4000/graphql
- Health Check: http://localhost:4000/health

## Docker Setup (Alternative)

### Using Docker Compose
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop services
docker-compose down
```

## Sample GraphQL Operations

### Create a User
```graphql
mutation {
  createUser(name: "John Doe", email: "john@example.com") {
    id
    name
    email
    createdAt
    postCount
  }
}
```

### Post a Message
```graphql
mutation {
  postMessage(userId: "USER_ID_HERE", body: "Hello, world!") {
    message {
      id
      body
      createdAt
      user {
        name
      }
    }
    rateLimitInfo {
      isLimited
      remainingRequests
    }
  }
}
```

### Get All Users
```graphql
query {
  users {
    id
    name
    email
    postCount
    createdAt
  }
}
```

### Get All Messages
```graphql
query {
  messages {
    id
    body
    createdAt
    user {
      name
      email
    }
    previousMessage {
      id
    }
    nextMessage {
      id
    }
  }
}
```

### Get Messages by User
```graphql
query {
  messagesByUser(userId: "USER_ID_HERE") {
    id
    body
    createdAt
    previousMessage {
      id
    }
    nextMessage {
      id
    }
  }
}
```

### Check Rate Limit Status
```graphql
query {
  rateLimitStatus(userId: "USER_ID_HERE") {
    isLimited
    remainingRequests
    resetTime
    windowMs
  }
}
```

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Rate Limiting

The API enforces a rate limit of **10 messages per user per hour**. When this limit is reached:
- New message posts will be rejected
- The response will include rate limit information
- Users must wait until the hour window resets

## API Features

✅ **User Management**
- Create, read, update, delete users
- Email validation and uniqueness

✅ **Message System**
- Post messages up to 1000 characters
- Automatic message linking (previous/next)
- Query messages by user or get all messages

✅ **Rate Limiting**
- 10 messages per user per hour
- Rate limit status checking
- Automatic cleanup of expired limits

✅ **Security**
- Input validation and sanitization
- CORS protection
- Security headers (Helmet)
- Request logging

✅ **GraphQL API**
- Type-safe queries and mutations
- Introspection and playground (development)
- Custom scalar types (Date)

✅ **Monitoring**
- Health check endpoint
- Comprehensive logging
- Error tracking

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `mongod`
- Check connection string in `.env`
- Verify network connectivity

### Port Already in Use
- Change the `PORT` in `.env` file
- Kill process using port 4000: `lsof -ti:4000 | xargs kill -9`

### Permission Errors
- Ensure proper file permissions
- Run with appropriate user privileges

## Production Deployment

1. Set `NODE_ENV=production` in environment
2. Use a production MongoDB instance
3. Set strong JWT secret
4. Configure appropriate CORS origins
5. Set up proper logging and monitoring
6. Use process manager (PM2) or Docker

## Support

For issues or questions:
1. Check the logs in the `logs/` directory
2. Verify environment configuration
3. Ensure all dependencies are installed
4. Check MongoDB connection

## License

MIT License - see README.md for full details.
