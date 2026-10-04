import { Redis } from "@upstash/redis";

const hasRedis = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

export const redis = hasRedis
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// Throttling warning logs
let loggedFallbackWarning = false;

// In-memory local cache fallback for development without Upstash keys
const localMemoryCache = new Map<string, { value: any; expires: number }>();

export async function getCache<T>(key: string): Promise<T | null> {
  if (redis) {
    try {
      return await redis.get<T>(key);
    } catch (e) {
      console.error("Upstash Redis Read Error, falling back to memory:", e);
    }
  } else if (!loggedFallbackWarning) {
    console.warn("Upstash Redis credentials missing. Using local in-memory cache.");
    loggedFallbackWarning = true;
  }
  
  const cached = localMemoryCache.get(key);
  if (cached) {
    if (cached.expires > Date.now()) {
      return cached.value as T;
    }
    localMemoryCache.delete(key);
  }
  return null;
}

export async function setCache(key: string, value: any, ttlSeconds: number = 300): Promise<void> {
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
      return;
    } catch (e) {
      console.error("Upstash Redis Write Error, writing to memory:", e);
    }
  }

  localMemoryCache.set(key, {
    value,
    expires: Date.now() + ttlSeconds * 1000,
  });
}

export async function invalidateCache(key: string): Promise<void> {
  if (redis) {
    try {
      await redis.del(key);
      return;
    } catch (e) {
      console.error("Upstash Redis Delete Error, deleting from memory:", e);
    }
  }
  localMemoryCache.delete(key);
}

// Cache keys utility
export function getEnrollmentKey(studentId: string, courseId: string): string {
  return `student:${studentId}:course:${courseId}:enrollment`;
}

export function getUnlockedLecturesKey(studentId: string, courseId: string): string {
  return `student:${studentId}:course:${courseId}:unlocked_lectures`;
}
