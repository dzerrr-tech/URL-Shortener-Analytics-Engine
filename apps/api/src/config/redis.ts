import Redis from 'ioredis';

export const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      retryStrategy: (times) => Math.min(times * 50, 2000),
    })
  : new Redis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

redis.on('connect', () => console.log('Successfully connected to Redis!'));
redis.on('error', (err) => console.error('Redis connection error:', err));