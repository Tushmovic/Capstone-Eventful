import { createClient } from 'redis';
import { logger } from '../utils/logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

class RedisClient {
  public client: any;
  private isConnected = false;
  private connectionAttempts = 0;
  private maxAttempts = 3;

  constructor() {
    this.initializeRedisClient();
  }

  private initializeRedisClient(): void {
    try {
      this.client = createClient({
        url: REDIS_URL,
        socket: {
          connectTimeout: 10000, // 10 seconds
          reconnectStrategy: (retries: number) => {
            if (retries > this.maxAttempts) {
              logger.error(`Redis connection failed after ${this.maxAttempts} attempts`);
              return false;
            }
            const delay = Math.min(retries * 100, 2000);
            logger.warn(`Redis reconnection attempt ${retries}, retrying in ${delay}ms`);
            return delay;
          }
        }
      });

      this.setupEventListeners();
    } catch (error: any) {
      logger.error(`Failed to initialize Redis client: ${error.message}`);
    }
  }

  private setupEventListeners(): void {
    this.client.on('connect', () => {
      this.isConnected = true;
      this.connectionAttempts = 0;
      logger.info('Redis client connected');
    });

    this.client.on('ready', () => {
      logger.info('Redis client ready');
    });

    this.client.on('error', (error: Error) => {
      this.isConnected = false;
      logger.error(`Redis client error: ${error.message}`);
    });

    this.client.on('end', () => {
      this.isConnected = false;
      logger.warn('Redis client disconnected');
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
    });
  }

  async connect(): Promise<boolean> {
    if (this.isConnected) {
      return true;
    }

    try {
      this.connectionAttempts++;
      logger.info(`Connecting to Redis (attempt ${this.connectionAttempts}/${this.maxAttempts})...`);
      
      await this.client.connect();
      this.isConnected = true;
      
      // Test the connection
      const pong = await this.client.ping();
      logger.info(`Redis connection successful: ${pong}`);
      
      return true;
    } catch (error: any) {
      this.isConnected = false;
      logger.error(`Redis connection failed: ${error.message}`);
      
      if (this.connectionAttempts < this.maxAttempts) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        return this.connect();
      }
      
      return false;
    }
  }

  async ping(): Promise<string> {
    try {
      if (!this.isConnected) {
        const connected = await this.connect();
        if (!connected) {
          throw new Error('Redis not connected');
        }
      }
      return await this.client.ping();
    } catch (error: any) {
      logger.error(`Redis ping failed: ${error.message}`);
      throw error;
    }
  }

  async get(key: string): Promise<any> {
    try {
      if (!this.isConnected) {
        const connected = await this.connect();
        if (!connected) {
          return null;
        }
      }
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error: any) {
      logger.error(`Redis get error for key "${key}": ${error.message}`);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      if (!this.isConnected) {
        const connected = await this.connect();
        if (!connected) {
          return false;
        }
      }
      const stringValue = JSON.stringify(value);
      if (ttl) {
        await this.client.set(key, stringValue, { EX: ttl });
      } else {
        await this.client.set(key, stringValue);
      }
      return true;
    } catch (error: any) {
      logger.error(`Redis set error for key "${key}": ${error.message}`);
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        const connected = await this.connect();
        if (!connected) {
          return false;
        }
      }
      await this.client.del(key);
      return true;
    } catch (error: any) {
      logger.error(`Redis delete error for key "${key}": ${error.message}`);
      return false;
    }
  }

  async flushAll(): Promise<boolean> {
    try {
      if (!this.isConnected) {
        const connected = await this.connect();
        if (!connected) {
          return false;
        }
      }
      await this.client.flushAll();
      return true;
    } catch (error: any) {
      logger.error(`Redis flushAll error: ${error.message}`);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Redis client disconnected');
      }
    } catch (error: any) {
      logger.error(`Redis disconnect error: ${error.message}`);
    }
  }

  isReady(): boolean {
    return this.isConnected;
  }

  getRawClient() {
    return this.client;
  }
}

// Create and export instance
export const redisClient = new RedisClient();