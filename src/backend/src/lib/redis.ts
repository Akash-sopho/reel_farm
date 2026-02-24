import { createClient } from 'redis';

type RedisClient = ReturnType<typeof createClient>;

let redisClient: RedisClient | null = null;

/**
 * Create and connect to Redis client
 */
export async function createRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  const client = createClient({
    socket: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },
  });

  client.on('error', (err: Error) => {
    console.error('[REDIS] Client error:', err);
  });

  await client.connect();
  redisClient = client;
  return client;
}

/**
 * Get existing Redis client (must call createRedisClient first)
 */
export function getRedisClient() {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call createRedisClient() first.');
  }
  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedisClient() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
