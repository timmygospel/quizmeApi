/**
 * DashboardCache
 *
 * Thin Redis cache layer for dashboard analytics read endpoints.
 * Falls back to a no-op (cache miss every time) when Redis is unavailable.
 *
 * TTLs:
 *  - ACTIVE sessions  → 15 seconds  (data changes frequently during live quiz)
 *  - COMPLETED sessions → 5 minutes (data is immutable once session ends)
 *
 * DDIA principle applied: read-through cache — callers provide a loader
 * function that is only invoked on a cache miss.
 */

import { redis } from "../redis/redisClient";

const TTL_ACTIVE_S = 15;
const TTL_COMPLETED_S = 300;

function cacheKey(eventCode: string, endpoint: string): string {
    return `dashboard:${eventCode}:${endpoint}`;
}

export async function cachedDashboard<T>(
    eventCode: string,
    endpoint: string,
    sessionStatus: string | undefined,
    loader: () => Promise<T>,
): Promise<T> {
    if (!redis) return loader();

    const key = cacheKey(eventCode, endpoint);
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as T;

    const result = await loader();

    const ttl =
        sessionStatus === "COMPLETED" ? TTL_COMPLETED_S : TTL_ACTIVE_S;
    await redis.set(key, JSON.stringify(result), "EX", ttl);

    return result;
}

export async function invalidateDashboardCache(eventCode: string): Promise<void> {
    if (!redis) return;
    const pattern = `dashboard:${eventCode}:*`;
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
}
