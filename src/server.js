const express = require('express');
const { ApolloServer } = require('apollo-server-express');
const environment = require('./config/environment');
const database = require('./config/database');
const schema = require('./graphql/schema');
const logger = require('./utils/logger');
const { setupSecurity, setupErrorHandling, setupHealthCheck } = require('./middleware/security');
const { apiLimiter } = require('./middleware/rateLimiter');

async function startServer() {
  try {
    logger.info('Loading environment configuration...', process.env);
    // Connect to database
    await database.connect();
    logger.info('Database connected successfully');

    // Create Express app
    const app = express();

    // Setup security middleware
    setupSecurity(app);

    // Setup health check endpoint
    setupHealthCheck(app);

    // Apply general API rate limiting
    app.use('/graphql', apiLimiter); // Apply rate limiting for GraphQL endpoint

    logger.info(`Starting server in ${environment.nodeEnv} mode...`);

    // Create Apollo Server
    const server = new ApolloServer({
      schema,
      introspection: environment.graphql.introspection,
      // Configure landing page for Apollo Server v3
      plugins: [
        // Landing page configuration
        environment.nodeEnv === 'development'
          ? require('apollo-server-core').ApolloServerPluginLandingPageGraphQLPlayground({
              settings: {
                'schema.polling.enable': false,
                'editor.theme': 'dark',
                'editor.fontSize': 14,
                'editor.fontFamily': '"Source Code Pro", "Consolas", "Inconsolata", "Droid Sans Mono", "Monaco", monospace',
                'request.credentials': 'include',
              },
            })
          : require('apollo-server-core').ApolloServerPluginLandingPageDisabled(),        
      ],
      context: ({ req, res }) => {
        return {
          req,
          res,
          // Add any context data here (user info, etc.)
        };
      },
      formatError: (error) => {
        // Log GraphQL errors
        logger.error('GraphQL Error:', {
          message: error.message,
          locations: error.locations,
          path: error.path,
          extensions: error.extensions
        });

        // Return formatted error
        return {
          message: error.message,
          code: error.extensions?.code || 'GRAPHQL_ERROR',
          locations: error.locations,
          path: error.path
        };
      },
      formatResponse: (response, { request, context }) => {
        // Log successful operations
        const operationName = request.operationName || 'Unknown';
        const variables = request.variables || {};
        
        logger.info('GraphQL Operation completed', {
          operationName,
          variableCount: Object.keys(variables).length,
          hasErrors: !!response.errors,
          dataSize: response.data ? JSON.stringify(response.data).length : 0
        });

        return response;
      }
    });

    // Start Apollo Server
    await server.start();

    // Apply Apollo GraphQL middleware
    server.applyMiddleware({ 
      app, 
      path: '/graphql',
      cors: environment.nodeEnv === 'development' ? {
        origin: [
          'http://localhost:3000',
          'http://localhost:4000',
          'https://studio.apollographql.com',
          'https://cdn.jsdelivr.net',
          'https://unpkg.com'
        ],
        credentials: true,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Apollo-Require-Preflight']
      } : false // Use security middleware CORS in production
    });

    // Setup error handling (must be last)
    setupErrorHandling(app);

    // Start HTTP server
    const httpServer = app.listen(environment.port, () => {
      logger.info(`🚀 Server ready at http://localhost:${environment.port}${server.graphqlPath}`);
      logger.info(`📊 Health check available at http://localhost:${environment.port}/health`);
      
      if (environment.graphql.playground) {
        logger.info(`🎮 GraphQL Playground available at http://localhost:${environment.port}${server.graphqlPath}`);
      }
      
      logger.info(`Environment: ${environment.nodeEnv}`);
      logger.info(`Database: ${environment.mongodb.uri}`);
      logger.info(`Rate limiting: ${environment.rateLimit.maxRequests} requests per ${environment.rateLimit.windowMs}ms`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      try {
        // Stop accepting new connections
        httpServer.close(async () => {
          logger.info('HTTP server closed');
          
          try {
            // Stop Apollo Server
            await server.stop();
            logger.info('Apollo Server stopped');
            
            // Close database connection
            await database.disconnect();
            logger.info('Database connection closed');
            
            logger.info('Graceful shutdown completed');
            process.exit(0);
          } catch (error) {
            logger.error('Error during graceful shutdown:', error);
            process.exit(1);
          }
        });
        
        // Force shutdown after 30 seconds
        setTimeout(() => {
          logger.error('Graceful shutdown timeout. Force exiting...');
          process.exit(1);
        }, 30000);
        
      } catch (error) {
        logger.error('Error during graceful shutdown:', error);
        process.exit(1);
      }
    };

    // Handle termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      gracefulShutdown('unhandledRejection');
    });

    return { app, server, httpServer };

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  startServer().catch((error) => {
    logger.error('Server startup failed:', error);
    process.exit(1);
  });
}

module.exports = { startServer };
