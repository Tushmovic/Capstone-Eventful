import { createClient } from 'redis';
import { logger } from '../utils/logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

class RedisClient {
  public client: any;
  private isConnected = false;

  constructor() {
    // Create Redis client without explicit typing to avoid issues
    this.client = createClient({
      url: REDIS_URL,
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis client connected');
    });

    this.client.on('error', (error: Error) => {
      this.isConnected = false;
      logger.error(`Redis client error: ${error.message}`);
    });

    this.client.on('end', () => {
      this.isConnected = false;
      logger.warn('Redis client disconnected');
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  async get(key: string): Promise<any> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error: any) {
      logger.error(`Redis get error: ${error.message}`);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const stringValue = JSON.stringify(value);
      if (ttl) {
        await this.client.setEx(key, ttl, stringValue);
      } else {
        await this.client.set(key, stringValue);
      }
    } catch (error: any) {
      logger.error(`Redis set error: ${error.message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error: any) {
      logger.error(`Redis delete error: ${error.message}`);
    }
  }

  async flushAll(): Promise<void> {
    try {
      await this.client.flushAll();
    } catch (error: any) {
      logger.error(`Redis flushAll error: ${error.message}`);
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      this.isConnected = false;
    } catch (error: any) {
      logger.error(`Redis disconnect error: ${error.message}`);
    }
  }

  isReady(): boolean {
    return this.isConnected;
  }

  // Method to get raw client for rate-limit-redis
  getRawClient() {
    return this.client;
  }
}

export const redisClient = new RedisClient();