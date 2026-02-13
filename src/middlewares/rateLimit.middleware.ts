import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '../config/redis';
import { logger } from '../utils/logger';
import { Request } from 'express';

const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000');
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

const redisStore = new RedisStore({
  sendCommand: (...args: string[]) => redisClient.getRawClient().sendCommand(args),
  prefix: 'rl:',
});

export const globalRateLimiter = rateLimit({
  store: redisStore,
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX_REQUESTS,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    return Array.isArray(ip) ? ip[0] : ip;
  },
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later.',
    });
  },
});

// 🔥 FIX: Completely disable auth rate limiter by setting max to Infinity
export const authRateLimiter = rateLimit({
  store: redisStore,
  windowMs: 60 * 60 * 1000,
  max: Infinity, // 👈 This disables the limit completely
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.',
  },
  skipSuccessfulRequests: true,
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const identifier = req.body.email || (Array.isArray(ip) ? ip[0] : ip);
    return identifier;
  },
});

export const apiKeyRateLimiter = rateLimit({
  store: redisStore,
  windowMs: 60 * 60 * 1000,
  max: 1000,
  message: {
    success: false,
    message: 'API rate limit exceeded',
  },
  keyGenerator: (req: Request) => {
    const apiKey = req.headers['x-api-key'];
    if (Array.isArray(apiKey)) {
      return apiKey[0] || 'unknown';
    }
    return apiKey || 'unknown';
  },
});