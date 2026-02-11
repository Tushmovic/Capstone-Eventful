import { createClient } from 'redis';
import { logger } from '../utils/logger';

// Your Redis Cloud URL (with default as username)
const REDIS_URL = process.env.REDIS_URL || 'redis://default:XGaFFHOaY0cDPg6S5lNyDV2jz4jfbnAI@redis-18506.c341.af-south-1-1.ec2.cloud.redislabs.com:18506';

class RedisClient {
  public client: any;
  private isConnected = false;
  private connectionAttempts = 0;
  private maxAttempts = 3;
  private isConnecting = false;

  constructor() {
    this.initializeRedisClient();
  }

  private initializeRedisClient(): void {
    try {
      // Check if URL contains 'rediss://' for SSL/TLS
      let formattedUrl = REDIS_URL;
      
      // Ensure URL has proper protocol
      if (!formattedUrl.startsWith('redis://') && !formattedUrl.startsWith('rediss://')) {
        // Check if it looks like a Redis Cloud URL
        if (formattedUrl.includes('cloud.redislabs.com')) {
          formattedUrl = `rediss://${formattedUrl}`;
        } else {
          formattedUrl = `redis://${formattedUrl}`;
        }
      }

      logger.info(`Initializing Redis client: ${formattedUrl.replace(/\/\/[^:]+:[^@]+@/, '//*****:*****@')}`);

      this.client = createClient({
        url: formattedUrl,
        socket: {
          connectTimeout: 10000, // 10 seconds
          tls: formattedUrl.startsWith('rediss://'),
          rejectUnauthorized: false,
          reconnectStrategy: (retries: number) => {
            if (retries > 3) {
              logger.warn('Max Redis reconnection retries reached');
              return false;
            }
            return Math.min(retries * 100, 3000);
          }
        }
      });

      this.setupEventListeners();
    } catch (error: any) {
      logger.error(`Failed to initialize Redis client: ${error.message}`);
      this.client = null;
    }
  }

  private setupEventListeners(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      this.isConnected = true;
      this.isConnecting = false;
      this.connectionAttempts = 0;
      logger.info('✅ Redis connected');
    });

    this.client.on('ready', () => {
      logger.info('✅ Redis ready');
    });

    this.client.on('error', (error: Error) => {
      this.isConnected = false;
      logger.error(`❌ Redis error: ${error.message}`);
    });

    this.client.on('end', () => {
      this.isConnected = false;
      logger.warn('Redis disconnected');
    });
  }

  async connect(): Promise<boolean> {
    if (this.isConnected) return true;
    if (this.isConnecting) return false;
    if (!this.client) return false;

    try {
      this.isConnecting = true;
      this.connectionAttempts++;
      
      logger.info(`Connecting to Redis (attempt ${this.connectionAttempts}/${this.maxAttempts})...`);
      
      await this.client.connect();
      this.isConnected = true;
      this.isConnecting = false;
      
      // Test connection
      const pong = await this.client.ping();
      logger.info(`✅ Redis connection successful: ${pong}`);
      
      return true;
    } catch (error: any) {
      this.isConnected = false;
      this.isConnecting = false;
      logger.error(`❌ Redis connection failed: ${error.message}`);
      
      // Don't retry automatically - let the app start without Redis
      return false;
    }
  }

  async ping(): Promise<string> {
    try {
      if (!this.isConnected) {
        const connected = await this.connect();
        if (!connected) {
          return 'NOT_CONNECTED';
        }
      }
      return await this.client.ping();
    } catch (error: any) {
      logger.warn(`Redis ping failed: ${error.message}`);
      return 'ERROR';
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
      logger.warn(`Redis get failed for key "${key}": ${error.message}`);
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
      logger.warn(`Redis set failed for key "${key}": ${error.message}`);
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
      logger.warn(`Redis delete failed for key "${key}": ${error.message}`);
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
      logger.warn(`Redis flushAll failed: ${error.message}`);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.isConnected && this.client) {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Redis disconnected');
      }
    } catch (error: any) {
      logger.warn(`Redis disconnect error: ${error.message}`);
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