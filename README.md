# Message Board API

**A fully containerized GraphQL API built with Node.js, Express, MongoDB, and Redis for a simple message board application with user management and rate limiting.**

**🐳 This application is designed to run with Docker and includes all necessary services via Docker Compose for consistent, hassle-free setup and deployment.**

## Features

- **User Management**: Create users with name and email
- **Message Posting**: Users can post messages with automatic linking (previous/next)
- **Rate Limiting**: Maximum 10 messages per user per hour using Redis
- **Security**: Input validation, rate limiting, and secure headers
- **Logging**: Comprehensive API operation logging
- **GraphQL API**: Modern GraphQL interface with introspection
- **Containerized**: Full Docker setup with MongoDB, Redis, and optional monitoring tools

## Tech Stack

- **Runtime**: Node.js 18 (Alpine Linux container)
- **Framework**: Express.js
- **API**: GraphQL (Apollo Server)
- **Database**: MongoDB 6 with Mongoose ODM
- **Cache/Rate Limiting**: Redis 7 with IORedis client
- **Security**: Helmet, express-validator, CORS
- **Logging**: Winston with daily rotation
- **Containerization**: Docker & Docker Compose
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

## 🚀 Quick Start with Docker (Recommended)

**Prerequisites:**
- **Docker Desktop** (includes Docker Compose) - [Download here](https://www.docker.com/products/docker-desktop/)
- **Git**

### 1. Clone and Start All Services
```bash
git clone <repository-url>
cd MessageBoard

# Start all services (MongoDB, Redis, Node.js API)
docker-compose up -d
```

### 2. Verify Everything is Running
```bash
# Check all services are running
docker-compose ps

# View API logs
docker-compose logs -f app
```

### 3. Access the Application
- **🎮 GraphQL Playground**: http://localhost:4000/graphql
- **💚 Health Check**: http://localhost:4000/health

### 4. Optional: Start with Development Tools
```bash
# Include MongoDB and Redis web interfaces
docker-compose --profile dev up -d

# Access monitoring tools:
# - 🍃 MongoDB UI: http://localhost:8081 (admin/admin123)
# - 🔴 Redis UI: http://localhost:8082
```

### 5. Stop Services
```bash
# Stop and remove containers
docker-compose down

# Complete cleanup (removes volumes too)
docker-compose down -v
```

## ⚡ Why Docker?

- **🔧 Zero Configuration**: No need to install MongoDB, Redis, or manage versions
- **🏠 Consistent Environment**: Same setup across development, testing, and production
- **🚀 Quick Setup**: One command gets everything running
- **📦 Isolated Services**: No conflicts with your local system
- **🔄 Easy Reset**: Clean state with `docker-compose down -v`

## 🐳 Docker Services Overview

The application runs as a multi-container setup with these services:

| Service | Purpose | Port | Container | UI Access |
|---------|---------|------|-----------|-----------|
| **🚀 app** | Node.js API Server | 4000 | `node:18-alpine` | [GraphQL Playground](http://localhost:4000/graphql) |
| **🍃 mongo** | MongoDB Database | 27017 | `mongo:6-focal` | - |
| **🔴 redis** | Cache & Rate Limiting | 6379 | `redis:7-alpine` | - |
| **🌐 mongo-express** | MongoDB Web UI (dev) | 8081 | `mongo-express` | [MongoDB UI](http://localhost:8081) |
| **🔧 redis-commander** | Redis Web UI (dev) | 8082 | `rediscommander` | [Redis UI](http://localhost:8082) |

### 🔄 Service Dependencies
- **app** → depends on **mongo** + **redis**
- **mongo-express** → depends on **mongo** (dev profile only)
- **redis-commander** → depends on **redis** (dev profile only)

### 💾 Data Persistence
- **MongoDB data**: `mongo-data` Docker volume
- **Redis data**: `redis-data` Docker volume (with LRU eviction)
- **Application logs**: `./logs/` directory (host-mounted)

### 🔧 Useful Docker Commands
```bash
# View all services status
docker-compose ps

# View logs for specific service
docker-compose logs -f app
docker-compose logs -f mongo
docker-compose logs -f redis

# Restart a specific service
docker-compose restart app

# Rebuild after code changes
docker-compose up --build app

# Execute commands in running containers
docker-compose exec app npm run seed
docker-compose exec mongo mongosh messageboard

# Clean restart everything
docker-compose down && docker-compose up --build
```

## 🔐 Environment Configuration

The Docker setup includes optimized environment variables configured in `docker-compose.yml`:

```env
# 🌐 Container Network Configuration
MONGODB_URI=mongodb://mongo:27017/messageboard
REDIS_URL=redis://redis:6379

# ⚡ Application Settings
NODE_ENV=development
PORT=4000
JWT_SECRET=your_production_jwt_secret_here

# 🚦 Rate Limiting (Redis-based)
RATE_LIMIT_WINDOW_MS=3600000     # 1 hour window
RATE_LIMIT_MAX_REQUESTS=10       # 10 messages per user per hour
RATE_LIMIT_STORAGE=redis         # Use Redis for rate limiting

# 🔒 Security
CORS_ORIGIN=http://localhost:3000

# 📝 Logging
LOG_LEVEL=info
```

### 🚨 Production Environment Variables
For production deployment, ensure these are properly configured:
```env
NODE_ENV=production
JWT_SECRET=your_strong_production_secret_here
MONGODB_URI=mongodb://your-production-mongo/messageboard
REDIS_URL=redis://your-production-redis:6379
CORS_ORIGIN=https://your-frontend-domain.com
LOG_LEVEL=warn
```

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
├── docker-compose.yml          # Multi-service Docker setup
├── Dockerfile                  # Node.js app container
├── package.json               # Dependencies and scripts
├── INSTALL.md                 # Detailed setup instructions
├── README.md                  # This file
├── src/
│   ├── server.js              # Main application entry
│   ├── config/
│   │   ├── database.js        # MongoDB connection
│   │   └── environment.js     # Environment variables
│   ├── models/
│   │   ├── User.js            # User schema
│   │   └── Message.js         # Message schema
│   ├── graphql/
│   │   ├── typeDefs.js        # GraphQL type definitions
│   │   ├── schema.js          # Combined GraphQL schema
│   │   └── resolvers/         # Query/mutation resolvers
│   ├── middleware/
│   │   ├── rateLimiter.js     # Redis-based rate limiting
│   │   └── security.js        # Security headers & validation
│   ├── services/
│   │   ├── userService.js     # User business logic
│   │   └── messageService.js  # Message business logic
│   └── utils/
│       ├── logger.js          # Winston logging setup
│       └── errors.js          # Custom error handling
├── tests/                     # Test suites
├── logs/                      # Application logs
└── scripts/
    ├── mongo-init.js          # MongoDB initialization
    └── seed.js                # Database seeding
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

## 🧪 Testing

**⚠️ CRITICAL: Docker must be running for tests to work!**

The test suite uses in-memory MongoDB and Redis instances that require Docker to create temporary containers.

### Quick Test Commands
```bash
# 1. Ensure Docker Desktop is running
docker --version

# 2. Install dependencies (one-time setup)
npm install

# 3. Run all tests
npm test

# Run tests with detailed coverage report
npm run test:coverage

# Run tests in watch mode (for development)
npm run test:watch
```

### 🐳 Why Docker is Required for Tests
- Tests use **`mongodb-memory-server`** and **`redis-memory-server`** packages
- These create **isolated Docker containers** for each test run
- Ensures **clean, predictable test environments**
- **No interference** with your development or production databases
- **Automatic cleanup** after tests complete

### 🚨 If Tests Fail
1. **Check Docker is running**: `docker ps` should show Docker daemon is active
2. **Restart Docker Desktop** if needed
3. **Clear test containers**: `docker container prune -f`
4. **Ensure sufficient disk space** for containers

### Test Coverage
- ✅ User creation and validation
- ✅ Message posting and linking
- ✅ Rate limiting functionality
- ✅ GraphQL query and mutation testing
- ✅ Error handling and edge cases

## 🛠️ Local Development (Alternative to Docker)

**Note: Docker approach is strongly recommended** for consistency and ease of setup.

If you need to develop without Docker:

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local installation or Atlas)
- Redis (local installation)

### Setup
```bash
# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your local MongoDB and Redis connections

# Start MongoDB and Redis locally (separate terminals)
mongod
redis-server

# Run in development mode
npm run dev
```

### ⚠️ Limitations of Local Development
- **Manual setup** of MongoDB and Redis required
- **Version compatibility** issues possible
- **Environment inconsistencies** between team members
- **Tests still require Docker** to be running
- **No built-in monitoring tools**

## 🚀 Production Deployment

### 🐳 Docker Production Setup
The application is production-ready with Docker:

```bash
# Production deployment
export NODE_ENV=production

# Start production services (no dev tools)
docker-compose up -d

# Or build and deploy custom image
docker build -t messageboard-api:latest .
docker tag messageboard-api:latest your-registry/messageboard-api:latest
docker push your-registry/messageboard-api:latest
```

### 🚀 Heroku Deployment

**⚠️ Important**: This application requires MongoDB and Redis. Here's how to deploy to Heroku:

#### 1. Add Required Add-ons
```bash
# Add MongoDB (choose one)
heroku addons:create mongolab:sandbox  # Free tier
# OR
heroku addons:create mongodb-atlas:M0  # MongoDB Atlas free tier

# Add Redis
heroku addons:create heroku-redis:mini  # Free tier
```

#### 2. Set Environment Variables
```bash
# Set production environment
heroku config:set NODE_ENV=production

# Set a strong JWT secret
heroku config:set JWT_SECRET="your-super-secure-random-string-here"

# Set CORS origin for your frontend
heroku config:set CORS_ORIGIN="https://your-frontend-domain.com"

# Set rate limiting (optional - defaults are fine)
heroku config:set RATE_LIMIT_WINDOW_MS=3600000
heroku config:set RATE_LIMIT_MAX_REQUESTS=10

# Set logging level
heroku config:set LOG_LEVEL=warn
```

#### 3. Deploy
```bash
# Deploy the application
git push heroku main

# Check logs if issues occur
heroku logs --tail
```

#### 4. Verify Deployment
```bash
# Check application status
heroku ps

# Test the health endpoint
curl https://your-app-name.herokuapp.com/health

# Access GraphQL endpoint
# Visit https://your-app-name.herokuapp.com/graphql
```

### 🔧 Troubleshooting Heroku H10 Errors

If you're seeing H10 "App crashed" errors:

1. **Check logs for detailed error messages**:
   ```bash
   heroku logs --tail --app your-app-name
   ```

2. **Verify all environment variables are set**:
   ```bash
   heroku config --app your-app-name
   ```
   
   Required variables:
   - `MONGODB_URI` (automatically set by MongoDB add-on)
   - `REDIS_URL` (automatically set by Redis add-on)
   - `JWT_SECRET` (must be manually set)
   - `NODE_ENV=production`

3. **Check add-ons are provisioned**:
   ```bash
   heroku addons --app your-app-name
   ```

4. **Common fixes**:
   ```bash
   # Restart the application
   heroku restart --app your-app-name
   
   # Check if build succeeded
   heroku releases --app your-app-name
   
   # Scale up if needed
   heroku ps:scale web=1 --app your-app-name
   ```

### ✅ Production Checklist
- [ ] Set strong `JWT_SECRET` (use environment variable)
- [ ] Configure production MongoDB instance (Atlas, etc.)
- [ ] Configure production Redis instance (AWS ElastiCache, etc.)
- [ ] Set appropriate `CORS_ORIGIN` for your frontend domain
- [ ] Configure logging level (`warn` or `error` for production)
- [ ] Set up log aggregation (ELK stack, CloudWatch, etc.)
- [ ] Configure health monitoring and alerts
- [ ] Set up SSL/TLS termination (nginx, load balancer)
- [ ] Configure automated backup strategies
- [ ] Set resource limits in Docker compose/Kubernetes
- [ ] Configure horizontal scaling if needed

## 🔧 Troubleshooting

### 🐳 Docker Issues
- **Port conflicts**: If ports are in use, modify them in `docker-compose.yml`
- **Permission errors**: Ensure Docker Desktop has file system access permissions
- **Memory issues**: Increase Docker memory allocation in Docker Desktop settings
- **Build failures**: Clear Docker cache: `docker system prune -a`
- **Container won't start**: Check logs: `docker-compose logs <service-name>`

### 🗄️ Database Connection Issues
- **MongoDB not connecting**: 
  - Check mongo container: `docker-compose logs mongo`
  - Verify network: `docker network ls`
  - Try restarting: `docker-compose restart mongo`
- **Redis not connecting**: 
  - Check redis container: `docker-compose logs redis`
  - Verify Redis is responding: `docker-compose exec redis redis-cli ping`

### 🧪 Test Issues
- **Tests failing**: 
  1. Verify Docker is running: `docker ps`
  2. Check Docker daemon is accessible
  3. Ensure sufficient disk space for test containers
  4. Try restarting Docker Desktop
  5. Clear test containers: `docker container prune -f`

### 🚀 Application Issues
- **API not responding**: 
  - Check app container: `docker-compose logs app`
  - Verify all dependencies started: `docker-compose ps`
  - Check port binding: `docker-compose port app 4000`
- **GraphQL errors**: Review application logs for database connection status
- **Rate limiting issues**: Verify Redis connection and data persistence

### 🔄 Common Solutions
```bash
# Complete restart
docker-compose down && docker-compose up -d

# Rebuild everything
docker-compose down && docker-compose up --build

# Clean slate (removes all data)
docker-compose down -v && docker-compose up -d

# Check resource usage
docker stats

# Free up space
docker system prune -a --volumes
```

## 📚 Additional Resources
- **Docker Compose Documentation**: https://docs.docker.com/compose/
- **GraphQL Playground Guide**: https://github.com/graphql/graphql-playground
- **MongoDB Docker Hub**: https://hub.docker.com/_/mongo
- **Redis Docker Hub**: https://hub.docker.com/_/redis

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. **Ensure Docker is running** for tests
5. Add tests for new features: `npm test`
6. Ensure all tests pass: `npm run test:coverage`
7. Commit your changes: `git commit -m 'Add amazing feature'`
8. Push to the branch: `git push origin feature/amazing-feature`
9. Submit a pull request

### Development Workflow
```bash
# Start development environment
docker-compose --profile dev up -d

# Make your changes in src/

# Run tests (Docker must be running)
npm test

# Check logs
docker-compose logs -f app
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**🔗 Quick Links:**
- [GraphQL Playground](http://localhost:4000/graphql) (after `docker-compose up -d`)
- [MongoDB UI](http://localhost:8081) (admin/admin123, with dev profile)
- [Redis UI](http://localhost:8082) (with dev profile)
- [Health Check](http://localhost:4000/health)
