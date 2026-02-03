import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';

export const cacheMiddleware = (ttl: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Don't cache auth endpoints
    if (req.path.includes('/auth') || req.path.includes('/payments')) {
      return next();
    }

    const key = `cache:${req.originalUrl}`;

    try {
      // Try to get from cache
      const cachedData = await redisClient.get(key);
      
      if (cachedData) {
        logger.debug(`Cache hit for key: ${key}`);
        return res.json(cachedData);
      }

      // Store original send function
      const originalJson = res.json.bind(res);
      
      // Override res.json to cache the response
      res.json = function(data: any) {
        // Cache the response
        redisClient.set(key, data, ttl).catch((error) => {
          logger.error(`Cache set error: ${error}`);
        });
        
        // Call original send
        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error(`Cache middleware error: ${error}`);
      next();
    }
  };
};

export const clearCache = async (pattern: string = '*') => {
  try {
    // Use KEYS command (for production, consider SCAN for large datasets)
    const keys = await redisClient.client.sendCommand(['KEYS', `cache:${pattern}`]) as string[];
    if (keys && keys.length > 0) {
      await redisClient.client.del(keys);
      logger.info(`Cleared ${keys.length} cache entries for pattern: ${pattern}`);
    }
  } catch (error) {
    logger.error(`Clear cache error: ${error}`);
  }
};

// Helper to generate cache key for specific resources
export const generateCacheKey = (prefix: string, id: string, suffix?: string) => {
  return `cache:${prefix}:${id}${suffix ? `:${suffix}` : ''}`;
};

// Clear cache by pattern middleware
export const clearCacheByPattern = (pattern: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await clearCache(pattern);
      next();
    } catch (error) {
      logger.error(`Clear cache by pattern error: ${error}`);
      next();
    }
  };
};