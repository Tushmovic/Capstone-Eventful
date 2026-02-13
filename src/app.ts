import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { stream, logger } from './utils/logger';
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

    // Initialize in correct order
    this.initializeMiddlewares();
    this.initializeSwagger();
    this.initializeRoutes();
    this.initializeErrorHandling();
    
    // Start async initializations
    this.startServices();
  }

  private async startServices(): Promise<void> {
    try {
      await this.initializeDatabase();
    } catch (error) {
      logger.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    try {
      await this.initializeRedis();
    } catch (error) {
      logger.warn('Redis connection failed - continuing without cache');
    }

    this.startServer();
  }

  private async initializeDatabase(): Promise<void> {
    await connectDB();
    logger.info('✅ Database connected successfully');
  }

  private async initializeRedis(): Promise<void> {
    logger.info('🔗 Connecting to Redis Cloud...');
    
    try {
      const connected = await redisClient.connect();
      
      if (connected) {
        const pong = await redisClient.ping();
        logger.info(`✅ Redis Cloud connected: ${pong}`);
      } else {
        logger.warn('⚠️ Redis Cloud connection failed');
      }
    } catch (error: any) {
      logger.warn(`⚠️ Redis error: ${error.message}`);
    }
  }

  private initializeMiddlewares(): void {
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", "data:", "https:"],
          mediaSrc: ["'self'", "data:", "blob:"],
        },
      },
    }));
    
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    }));

    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    this.app.use(compression());

    if (redisClient.isReady()) {
      this.app.use(globalRateLimiter);
    }

    this.app.use(morgan('combined', { stream }));
    this.app.use('/uploads', express.static('uploads'));
  }

  private initializeSwagger(): void {
    if (process.env.NODE_ENV !== 'production') {
      this.app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
      this.app.get('/docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
      });
      logger.info(`📚 Swagger docs available at: http://localhost:${this.port}/docs`);
    }
  }

  private initializeRoutes(): void {
    // ✅ ROOT ROUTE - MUST COME FIRST
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        message: '🎭 Alaya Eventful API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
          docs: '/docs',
          health: '/health',
          api: '/api/v1'
        },
        documentation: 'https://github.com/Tushmovic/Capstone-Eventful'
      });
    });

    // Health check endpoint
    this.app.get('/health', async (req: Request, res: Response) => {
      const healthStatus: any = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
          database: 'connected',
          redis: redisClient.isReady() ? 'connected' : 'disconnected',
        },
        environment: process.env.NODE_ENV || 'development',
      };

      if (redisClient.isReady()) {
        try {
          const pong = await redisClient.ping();
          healthStatus.services.redis_ping = pong;
          healthStatus.services.redis_test = 'healthy';
        } catch (error: any) {
          healthStatus.services.redis_test = `error: ${error.message}`;
        }
      }

      res.status(200).json(healthStatus);
    });

    // API routes
    this.app.use('/api/v1', routes);

    // 404 handler - MUST BE LAST
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorMiddleware);
  }

  private startServer(): void {
    const server = this.app.listen(this.port, () => {
      logger.info(`
        🚀 Server running on port ${this.port}
        📚 API Documentation: http://localhost:${this.port}/docs
        🔗 Health Check: http://localhost:${this.port}/health
        🌍 Environment: ${process.env.NODE_ENV || 'development'}
        🗄️  Redis: ${redisClient.isReady() ? 'Connected ✅' : 'Disconnected ⚠️'}
        📊 Database: Connected ✅
      `);
    });

    process.on('SIGTERM', () => this.gracefulShutdown(server));
    process.on('SIGINT', () => this.gracefulShutdown(server));
    
    process.on('uncaughtException', (error: Error) => {
      logger.error(`❌ Uncaught Exception: ${error.message}`);
      logger.error(error.stack || '');
    });

    process.on('unhandledRejection', (reason: any) => {
      logger.error(`❌ Unhandled Rejection: ${reason}`);
    });
  }

  private async gracefulShutdown(server: any): Promise<void> {
    logger.info('👋 Received shutdown signal, closing server...');
    
    server.close(async () => {
      logger.info('✅ HTTP server closed');
      
      try {
        await redisClient.disconnect();
        logger.info('✅ Redis connection closed');
      } catch (error: any) {
        logger.warn(`⚠️ Error closing Redis: ${error.message}`);
      }
      
      process.exit(0);
    });

    setTimeout(() => {
      logger.error('❌ Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  }

  public listen(): void {
    logger.info('✅ App is initialized and ready');
  }
}

export default App;