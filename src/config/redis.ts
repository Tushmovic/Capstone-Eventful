import { createClient } from 'redis';
import { logger } from '../utils/logger';

// Your Redis Cloud URL (with default as username)
const REDIS_URL = process.env.REDIS_URL || 'redis://default:XGaFFHOaY0cDPg6S5lNyDV2jz4jfbnAI@redis-18506.c341.af-south-1-1.ec2.cloud.redislabs.com:18506';

class RedisClient {
  private client: any;
  private isConnected = false;
  private connectionAttempts = 0;
  private maxAttempts = 3;

  constructor() {
    this.initializeRedisClient();
  }

  private initializeRedisClient(): void {
    try {
      // Check if URL contains 'rediss://' for SSL/TLS (Redis Cloud usually uses SSL)
      const useTLS = REDIS_URL.startsWith('rediss://') || REDIS_URL.includes('cloud.redislabs.com');
      
      // If URL doesn't start with redis:// or rediss://, prepend it
      let formattedUrl = REDIS_URL;
      if (!formattedUrl.startsWith('redis://') && !formattedUrl.startsWith('rediss://')) {
        formattedUrl = `rediss://${formattedUrl}`; // Use rediss for SSL
      }

      logger.info(`Initializing Redis client for Cloud Redis: ${formattedUrl.replace(/\/\/[^:]+:[^@]+@/, '//*****:*****@')}`);

      this.client = createClient({
        url: formattedUrl,
        socket: {
          connectTimeout: 15000, // 15 seconds for cloud
          tls: useTLS,
          rejectUnauthorized: false, // Allow self-signed certificates
          reconnectStrategy: (retries: number) => {
            if (retries > this.maxAttempts) {
              logger.error(`Redis Cloud connection failed after ${this.maxAttempts} attempts`);
              return false;
            }
            const delay = Math.min(retries * 500, 5000);
            logger.warn(`Redis Cloud reconnection attempt ${retries}, retrying in ${delay}ms`);
            return delay;
          }
        }
      });

      this.setupEventListeners();
    } catch (error: any) {
      logger.error(`Failed to initialize Redis Cloud client: ${error.message}`);
    }
  }

  private setupEventListeners(): void {
    this.client.on('connect', () => {
      this.isConnected = true;
      this.connectionAttempts = 0;
      logger.info('✅ Redis Cloud client connected');
    });

    this.client.on('ready', () => {
      logger.info('✅ Redis Cloud client ready');
    });

    this.client.on('error', (error: Error) => {
      this.isConnected = false;
      logger.error(`❌ Redis Cloud client error: ${error.message}`);
    });

    this.client.on('end', () => {
      this.isConnected = false;
      logger.warn('Redis Cloud client disconnected');
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis Cloud client reconnecting...');
    });
  }

  async connect(): Promise<boolean> {
    if (this.isConnected) {
      return true;
    }

    try {
      this.connectionAttempts++;
      logger.info(`Connecting to Redis Cloud (attempt ${this.connectionAttempts}/${this.maxAttempts})...`);
      
      await this.client.connect();
      this.isConnected = true;
      
      // Test the connection
      const pong = await this.client.ping();
      logger.info(`✅ Redis Cloud connection successful: ${pong}`);
      
      return true;
    } catch (error: any) {
      this.isConnected = false;
      logger.error(`❌ Redis Cloud connection failed: ${error.message}`);
      
      if (this.connectionAttempts < this.maxAttempts) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.connect();
      }
      
      logger.error('Max connection attempts reached for Redis Cloud');
      return false;
    }
  }

  async ping(): Promise<string> {
    try {
      if (!this.isConnected) {
        const connected = await this.connect();
        if (!connected) {
          throw new Error('Redis Cloud not connected');
        }
      }
      return await this.client.ping();
    } catch (error: any) {
      logger.error(`Redis Cloud ping failed: ${error.message}`);
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
      logger.error(`Redis Cloud get error for key "${key}": ${error.message}`);
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
      logger.error(`Redis Cloud set error for key "${key}": ${error.message}`);
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
      logger.error(`Redis Cloud delete error for key "${key}": ${error.message}`);
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
      logger.error(`Redis Cloud flushAll error: ${error.message}`);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Redis Cloud client disconnected');
      }
    } catch (error: any) {
      logger.error(`Redis Cloud disconnect error: ${error.message}`);
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