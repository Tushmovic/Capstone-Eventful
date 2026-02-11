import App from './app';
import { logger } from './utils/logger';

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const PORT = parseInt(process.env.PORT || '5000', 10);

// Create server instance
const app = new App(PORT);

// Don't call app.listen() - server starts automatically in constructor
logger.info(`🚀 App initializing on port ${PORT}...`);

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error(`❌ Uncaught Exception: ${error.message}`);
  logger.error(error.stack || '');
  // Don't exit immediately - let the app try to recover
  // Only exit if it's a critical error
  if (error.message.includes('database') || error.message.includes('Mongo')) {
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error(`❌ Unhandled Rejection at: ${promise}`);
  logger.error(`Reason: ${reason}`);
  // Don't exit - just log it
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('👋 SIGTERM received. Waiting for graceful shutdown...');
  // Let the app handle shutdown via its own gracefulShutdown method
});

process.on('SIGINT', () => {
  logger.info('👋 SIGINT received. Waiting for graceful shutdown...');
  // Let the app handle shutdown via its own gracefulShutdown method
});

// Export app for testing if needed
export default app;