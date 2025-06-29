# Message Board API

A GraphQL API for a simple message board application with user management and rate limiting.

## Features

- **User Management**: Create users with name and email
- **Message Posting**: Users can post messages with automatic linking (previous/next)
- **Rate Limiting**: Maximum 10 messages per user per hour
- **Security**: Input validation, rate limiting, and secure headers
- **Logging**: Comprehensive API operation logging
- **GraphQL API**: Modern GraphQL interface with introspection

## Tech Stack

- **Runtime**: Node.js 18
- **Framework**: Express.js
- **API**: GraphQL (Apollo Server)
- **Database**: MongoDB with Mongoose ODM
- **Cache/Rate Limiting**: Redis for atomic concurrent operations
- **Containerization**: Docker & Docker Compose

## 🚀 Quick Start with Docker

**Prerequisites:**
- **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd MessageBoard
   ```

### 2. Access the Application
- **🎮 GraphQL Playground**: http://localhost:4000/graphql
- **💚 Health Check**: http://localhost:4000/health

### 3. Stop Services
```bash
docker-compose down
```

## API Requirements

### User Properties
- Name
- Email
- Creation Date
- Number of Posts

### Message Properties
- Message Body
- Creation Date
- User
- Previous Posted Message
- Next Posted Message

### API Operations
- Create a User with Name and Email
- Post Messages for a User with Message Body
- List all Users
- List all Messages for all Users
- List Messages for a single User

### Rate Limiting
- Maximum 10 messages per user per hour
- API responses include rate limit status

## GraphQL Examples

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
├── docker-compose.yml          # Multi-service Docker setup
├── Dockerfile                  # Node.js app container
├── package.json               # Dependencies and scripts
├── src/
│   ├── server.js              # Main application entry
│   ├── config/                # Database and environment config
│   ├── models/                # User and Message schemas
│   ├── graphql/               # GraphQL schema and resolvers
│   ├── middleware/            # Rate limiting and security
│   ├── services/              # Business logic
│   └── utils/                 # Logging and error handling
└── tests/                     # Test suites
```

## Testing

**Docker must be running for tests:**

```bash
npm install
npm test
```

Tests use in-memory MongoDB and Redis instances via Docker containers.
