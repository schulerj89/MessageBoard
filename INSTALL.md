# Message Board API - Installation & Setup Guide

**🐳 This application is designed to run with Docker and includes all necessary services (MongoDB, Redis, Node.js API) via Docker Compose for a hassle-free setup experience.**

## 🚀 Quick Start (Recommended)

### Prerequisites
- **Docker Desktop** (includes Docker Compose) - [Download here](https://www.docker.com/products/docker-desktop/)
- **Git**

### 1. Clone and Start All Services
```bash
git clone <repository-url>
cd MessageBoard

# Start all services in background
docker-compose up -d
```

### 2. Verify Services Are Running
```bash
# Check all containers are running
docker-compose ps

# View API logs to confirm startup
docker-compose logs -f app
```

### 3. Access the Application
- **🎮 GraphQL Playground**: http://localhost:4000/graphql
- **💚 Health Check**: http://localhost:4000/health

### 4. Optional: Start with Development Monitoring
```bash
# Include MongoDB and Redis web interfaces
docker-compose --profile dev up -d

# Access monitoring tools:
# - 🍃 MongoDB UI: http://localhost:8081 (admin/admin123)
# - 🔴 Redis UI: http://localhost:8082
```

### 5. Stop Services When Done
```bash
# Stop and remove containers
docker-compose down

# Stop and remove containers + volumes (complete cleanup)
docker-compose down -v
```

## 🧪 Testing

**⚠️ CRITICAL: Docker must be running for tests to work!**

Tests use in-memory MongoDB and Redis instances that require Docker to create temporary containers.

```bash
# 1. Ensure Docker Desktop is running
docker --version

# 2. Install dependencies (one-time setup)
npm install

# 3. Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode for development
npm run test:watch
```

### 🐳 Why Docker is Required for Tests
- Tests use **`mongodb-memory-server`** and **`redis-memory-server`** packages
- These create **isolated Docker containers** for each test run
- Ensures **clean, predictable test environments** without affecting your development databases
- **Automatic cleanup** after tests complete
- **No manual database setup** required

## 🐳 Docker Services Overview

The application stack includes:

| Service | Purpose | Port | UI Access |
|---------|---------|------|-----------|
| **app** | Node.js API | 4000 | http://localhost:4000/graphql |
| **mongo** | MongoDB Database | 27017 | - |
| **redis** | Cache & Rate Limiting | 6379 | - |
| **mongo-express** | MongoDB UI (dev only) | 8081 | http://localhost:8081 |
| **redis-commander** | Redis UI (dev only) | 8082 | http://localhost:8082 |

### Service Dependencies
- **app** depends on **mongo** and **redis**
- **mongo-express** depends on **mongo**
- **redis-commander** depends on **redis**

### Data Persistence
- MongoDB data: `mongo-data` volume
- Redis data: `redis-data` volume
- Application logs: `./logs` directory (host-mounted)

## 🔧 Environment Configuration

The Docker setup includes optimized environment variables:

```env
# Container Network Configuration
MONGODB_URI=mongodb://mongo:27017/messageboard
REDIS_URL=redis://redis:6379

# Application Settings
NODE_ENV=development
PORT=4000
JWT_SECRET=your_production_jwt_secret_here

# Rate Limiting (Redis-based)
RATE_LIMIT_WINDOW_MS=3600000     # 1 hour window
RATE_LIMIT_MAX_REQUESTS=10       # 10 messages per user per hour
RATE_LIMIT_STORAGE=redis         # Use Redis for rate limiting

# Security
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=info
```

## 🛠️ Local Development (Alternative)

**⚠️ Note**: The Docker approach is strongly recommended as it:
- Ensures consistent environments
- Includes all required services
- Simplifies setup and troubleshooting
- Matches production deployment

If you need to develop without Docker:

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local installation or Atlas)
- Redis (local installation)
- Git

### Setup Steps
```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with local database connections:
# MONGODB_URI=mongodb://localhost:27017/messageboard
# REDIS_URL=redis://localhost:6379
```

### Start Local Services
```bash
# Terminal 1: Start MongoDB
mongod

# Terminal 2: Start Redis
redis-server

# Terminal 3: Start API
npm run dev
```

## 📊 Database Seeding

### Option 1: Docker Exec (Recommended)
```bash
# Seed database in running container
docker-compose exec app npm run seed
```

### Option 2: Local Seeding
```bash
# Only if running locally without Docker
npm run seed
```

## 🎮 Sample GraphQL Operations

**Access the GraphQL Playground at http://localhost:4000/graphql** (ensure Docker containers are running)

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

## 🚦 Rate Limiting

The API enforces a rate limit of **10 messages per user per hour**. When this limit is reached:
- New message posts will be rejected
- The response will include rate limit information
- Users must wait until the hour window resets

## Container Management

### Useful Docker Commands
```bash
# View running services
docker-compose ps

# View logs for specific service
docker-compose logs app
docker-compose logs mongo
docker-compose logs redis

# Restart a specific service
docker-compose restart app

# Rebuild and restart (after code changes)
docker-compose up --build app

# Clean restart (rebuild everything)
docker-compose down
docker-compose up --build

# Execute commands in running container
docker-compose exec app npm run seed
docker-compose exec app npm test
docker-compose exec mongo mongosh messageboard

# View container resource usage
docker stats
```

## Troubleshooting

### Docker Issues
- **Port conflicts**: Change ports in docker-compose.yml
- **Permission errors**: Ensure Docker has file system access
- **Memory issues**: Increase Docker memory allocation
- **Build failures**: Clear Docker cache: `docker system prune`

### Database Connection Issues
- **MongoDB**: Check mongo container logs: `docker-compose logs mongo`
- **Redis**: Check redis container logs: `docker-compose logs redis`
- **Network**: Ensure containers are on same network: `docker network ls`

### Application Issues
- **API not responding**: Check app logs: `docker-compose logs app`
- **GraphQL errors**: Verify database connections in logs
- **Rate limiting issues**: Check Redis connection and data

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

## 🚀 Heroku Deployment

**⚠️ Critical**: Your current H10 crash is likely due to missing MongoDB/Redis services. Here's how to fix it:

### 1. Add Required Services
```bash
# Add MongoDB add-on (choose one)
heroku addons:create mongolab:sandbox --app messages-test-app-ad6292b67931
# OR use MongoDB Atlas
heroku addons:create mongodb-atlas:M0 --app messages-test-app-ad6292b67931

# Add Redis add-on
heroku addons:create heroku-redis:mini --app messages-test-app-ad6292b67931
```

### 2. Set Critical Environment Variables
```bash
# Set production mode
heroku config:set NODE_ENV=production --app messages-test-app-ad6292b67931

# Set strong JWT secret (REQUIRED)
heroku config:set JWT_SECRET="$(openssl rand -base64 32)" --app messages-test-app-ad6292b67931

# Set CORS origin for your frontend
heroku config:set CORS_ORIGIN="https://your-frontend-domain.com" --app messages-test-app-ad6292b67931

# Set logging level for production
heroku config:set LOG_LEVEL=warn --app messages-test-app-ad6292b67931
```

### 3. Verify Configuration
```bash
# Check all environment variables are set
heroku config --app messages-test-app-ad6292b67931

# Should show:
# MONGODB_URI=mongodb://... (set by add-on)
# REDIS_URL=redis://... (set by add-on)
# JWT_SECRET=... (manually set)
# NODE_ENV=production
```

### 4. Deploy and Test
```bash
# Restart the application
heroku restart --app messages-test-app-ad6292b67931

# Check logs for startup
heroku logs --tail --app messages-test-app-ad6292b67931

# Test health endpoint
curl https://messages-test-app-ad6292b67931.herokuapp.com/health

# Test GraphQL endpoint
curl https://messages-test-app-ad6292b67931.herokuapp.com/graphql
```

### 🔧 Troubleshooting H10 Errors

The H10 error means your app crashed. Common causes:

1. **Missing database connections** (most likely your issue):
   ```bash
   # Check if add-ons are active
   heroku addons --app messages-test-app-ad6292b67931
   ```

2. **Missing JWT_SECRET**:
   ```bash
   # Set a secure JWT secret
   heroku config:set JWT_SECRET="your-secure-secret-here" --app messages-test-app-ad6292b67931
   ```

3. **Check detailed error logs**:
   ```bash
   # View recent logs
   heroku logs --app messages-test-app-ad6292b67931
   
   # View real-time logs
   heroku logs --tail --app messages-test-app-ad6292b67931
   ```

4. **Application startup issues**:
   ```bash
   # Check if Procfile is correct
   cat Procfile
   # Should show: web: node src/server.js
   
   # Scale app if needed
   heroku ps:scale web=1 --app messages-test-app-ad6292b67931
   ```

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
