import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

let retryCount = 0;

const redisClient = new Redis(REDIS_URL, {
  retryStrategy(times: number) {
    if (times > 5) {
      console.error('❌ Redis: max retries reached, giving up');
      return null; // stop retrying
    }
    const delay = Math.min(times * 200, 2000); // exponential backoff, max 2s
    console.warn(`⚠️ Redis: reconnecting in ${delay}ms (attempt ${times})`);
    retryCount = times;
    return delay;
  },
  lazyConnect: true,
  enableOfflineQueue: false,
});

redisClient.on('connect', () => {
  retryCount = 0;
  console.log('✅ Redis connected');
});

redisClient.on('error', (err: Error) => {
  console.error('❌ Redis error:', err.message);
});

export { redisClient };

export async function cacheGet(key: string): Promise<string | null> {
  try {
    return await redisClient.get(key);
  } catch (err) {
    console.error('❌ cacheGet error:', (err as Error).message);
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: string,
  ttlSeconds: number
): Promise<void> {
  try {
    await redisClient.set(key, value, 'EX', ttlSeconds);
  } catch (err) {
    console.error('❌ cacheSet error:', (err as Error).message);
  }
}
