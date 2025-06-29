# Message Board API

A GraphQL API built with Node.js, Express, and MongoDB for a simple message board application with user management and rate limiting.

## Features

- **User Management**: Create users with name and email
- **Message Posting**: Users can post messages with automatic linking (previous/next)
- **Rate Limiting**: Maximum 10 messages per user per hour
- **Security**: Input validation, rate limiting, and secure headers
- **Logging**: Comprehensive API operation logging
- **GraphQL API**: Modern GraphQL interface with introspection

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **API**: GraphQL (Apollo Server)
- **Database**: MongoDB with Mongoose ODM
- **Rate Limiting**: Express Rate Limit with MongoDB store
- **Security**: Helmet, express-validator
- **Logging**: Winston
- **Environment**: dotenv

## Database Schema

### User Model
```javascript
{
  _id: ObjectId,
  name: String (required, min: 2, max: 50),
  email: String (required, unique, validated),
  createdAt: Date (default: Date.now),
  postCount: Number (default: 0),
  lastPostAt: Date
}
```

### Message Model
```javascript
{
  _id: ObjectId,
  body: String (required, min: 1, max: 1000),
  user: ObjectId (ref: 'User', required),
  createdAt: Date (default: Date.now),
  previousMessage: ObjectId (ref: 'Message'),
  nextMessage: ObjectId (ref: 'Message')
}
```

## GraphQL Schema

### Types
```graphql
type User {
  id: ID!
  name: String!
  email: String!
  createdAt: String!
  postCount: Int!
  messages: [Message!]!
}

type Message {
  id: ID!
  body: String!
  user: User!
  createdAt: String!
  previousMessage: Message
  nextMessage: Message
}

type RateLimitInfo {
  isLimited: Boolean!
  remainingRequests: Int!
  resetTime: String
}

type MessageResponse {
  message: Message
  rateLimitInfo: RateLimitInfo!
}
```

### Queries
```graphql
type Query {
  # Get all users
  users: [User!]!
  
  # Get user by ID
  user(id: ID!): User
  
  # Get all messages
  messages: [Message!]!
  
  # Get messages by user ID
  messagesByUser(userId: ID!): [Message!]!
  
  # Get rate limit status for user
  rateLimitStatus(userId: ID!): RateLimitInfo!
}
```

### Mutations
```graphql
type Mutation {
  # Create a new user
  createUser(name: String!, email: String!): User!
  
  # Post a new message
  postMessage(userId: ID!, body: String!): MessageResponse!
}
```

## API Endpoints

### GraphQL Endpoint
- **URL**: `POST /graphql`
- **Playground**: `GET /graphql` (development only)

### Health Check
- **URL**: `GET /health`
- **Response**: Server status and database connection

## Rate Limiting

- **Limit**: 10 messages per user per hour
- **Storage**: MongoDB-based rate limit store
- **Response**: Rate limit information included in all message posting responses

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=4000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/messageboard
MONGODB_URI_TEST=mongodb://localhost:27017/messageboard_test

# Security
JWT_SECRET=your_jwt_secret_here
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_REQUESTS=10

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# CORS
CORS_ORIGIN=http://localhost:3000
```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd MessageBoard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB connection string and other config
   ```

4. **Start MongoDB**
   ```bash
   # If using local MongoDB
   mongod
   ```

5. **Run the application**
   ```bash
   # Development mode with hot reload
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Access the API**
   - GraphQL Playground: http://localhost:4000/graphql
   - Health Check: http://localhost:4000/health

## Example Usage

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
  postMessage(userId: "USER_ID", body: "Hello, world!") {
    message {
      id
      body
      createdAt
      user {
        name
      }
      previousMessage {
        id
      }
    }
    rateLimitInfo {
      isLimited
      remainingRequests
      resetTime
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
    createdAt
    postCount
  }
}
```

### Get Messages by User
```graphql
query {
  messagesByUser(userId: "USER_ID") {
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

## Project Structure

```
MessageBoard/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   └── environment.js
│   ├── models/
│   │   ├── User.js
│   │   └── Message.js
│   ├── graphql/
│   │   ├── typeDefs.js
│   │   ├── resolvers/
│   │   │   ├── userResolvers.js
│   │   │   ├── messageResolvers.js
│   │   │   └── index.js
│   │   └── schema.js
│   ├── middleware/
│   │   ├── rateLimiter.js
│   │   ├── security.js
│   │   └── logger.js
│   ├── services/
│   │   ├── userService.js
│   │   └── messageService.js
│   ├── utils/
│   │   ├── validation.js
│   │   └── errors.js
│   └── server.js
├── logs/
├── tests/
├── .env
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Security Features

- **Input Validation**: All inputs are validated using express-validator
- **Rate Limiting**: Prevents message spam with 10 messages/hour limit
- **Security Headers**: Helmet.js for security headers
- **Environment Variables**: Sensitive data stored in environment variables
- **Error Handling**: Comprehensive error handling without exposing internal details

## Logging

- **Winston Logger**: Structured logging with multiple levels
- **Request Logging**: All API requests are logged
- **Error Logging**: Errors are logged with stack traces
- **Performance Logging**: Response times and database operations

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Deployment

### Environment Setup
1. Set `NODE_ENV=production` in your environment
2. Configure your MongoDB connection string
3. Set appropriate CORS origins
4. Configure logging levels

### Docker Deployment
```bash
# Build Docker image
docker build -t messageboard-api .

# Run with Docker Compose
docker-compose up -d
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License.
