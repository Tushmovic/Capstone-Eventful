import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { stream, logger } from './utils/logger'; // ADDED logger import
import { errorMiddleware } from './middlewares/error.middleware';
import { globalRateLimiter } from './middlewares/rateLimit.middleware';
import routes from './routes';
import { connectDB } from './config/database';
import { redisClient } from './config/redis';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';

class App {
  public app: Application;
  public port: number;

  constructor(port: number) {
    this.app = express();
    this.port = port;

    this.initializeDatabase();
    this.initializeRedis();
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeSwagger();
  }

  private async initializeDatabase(): Promise<void> {
    try {
      await connectDB();
      logger.info('Database connected successfully');
    } catch (error: any) {
      logger.error(`Database connection failed: ${error.message}`);
      throw error; // Database is critical, so we should fail
    }
  }

  private async initializeRedis(): Promise<void> {
    try {
      await redisClient.connect();
      // Test the connection
      const pong = await redisClient.ping();
      logger.info(`Redis connected successfully: ${pong}`);
    } catch (error: any) {
      logger.error(`Redis connection failed: ${error.message}`);
      logger.warn('Application will run without Redis caching');
      // Don't throw - Redis is not critical for basic functionality
    }
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression
    this.app.use(compression());

    // Rate limiting
    this.app.use(globalRateLimiter);

    // Logging
    this.app.use(morgan('combined', { stream }));

    // Static files
    this.app.use('/uploads', express.static('uploads'));
  }

  private initializeRoutes(): void {
// Health check endpoint
this.app.get('/health', async (req: Request, res: Response) => {
  try {
    const redisStatus = redisClient.isReady() ? 'connected' : 'disconnected';
    
    // Test Redis connection if it says it's ready
    let redisTest = 'unknown';
    if (redisClient.isReady()) {
      try {
        const pong = await redisClient.ping();
        redisTest = pong === 'PONG' ? 'healthy' : 'unhealthy';
      } catch {
        redisTest = 'unhealthy';
      }
    }
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: 'connected',
        redis: redisStatus,
        redis_test: redisTest,
      },
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});
    // API routes
    this.app.use('/api/v1', routes);

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
      });
    });
  }

  private initializeSwagger(): void {
    if (process.env.NODE_ENV !== 'production') {
      this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
      this.app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
      });
    }
  }

  private initializeErrorHandling(): void {
    this.app.use(errorMiddleware);
  }

  public listen(): void {
    this.app.listen(this.port, () => {
      logger.info(`
        🚀 Server running on port ${this.port}
        📚 API Documentation: http://localhost:${this.port}/api-docs
        🔗 Health Check: http://localhost:${this.port}/health
        🌍 Environment: ${process.env.NODE_ENV || 'development'}
        🗄️  Redis: ${redisClient.isReady() ? 'Connected ✅' : 'Disconnected ⚠️'}
      `);
    });
  }
}

export default App;