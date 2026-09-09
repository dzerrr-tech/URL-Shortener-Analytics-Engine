import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';

export const rateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const key = `rate_limit:${ip}`;
  const LIMIT = 20; // Max 20 request per menit per IP
  const WINDOW_IN_SECONDS = 60;

  try {
    const currentRequests = await redis.incr(key);

    if (currentRequests === 1) {
      await redis.expire(key, WINDOW_IN_SECONDS);
    }

    if (currentRequests > LIMIT) {
      return res.status(429).json({
        message: 'Terlalu banyak permintaan. Silakan coba lagi dalam beberapa saat.',
      });
    }

    next();
  } catch (error) {
    console.error('Rate Limiter Error:', error);
    next(); // Tetap jalankan request jika Redis bermasalah
  }
};