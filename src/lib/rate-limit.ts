// In-memory sliding window rate limiter
// For production with multiple instances, replace with Redis-based implementation

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < 60000 * 15);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

export const RATE_LIMITS = {
  login: { windowMs: 15 * 60 * 1000, maxRequests: 10 } as RateLimitConfig,
  api: { windowMs: 60 * 1000, maxRequests: 60 } as RateLimitConfig,
  ai: { windowMs: 60 * 1000, maxRequests: 10 } as RateLimitConfig,
  passwordReset: { windowMs: 60 * 60 * 1000, maxRequests: 3 } as RateLimitConfig,
};

export function checkRateLimit(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const entry = store.get(key) || { timestamps: [] };

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((t) => now - t < config.windowMs);

  if (entry.timestamps.length >= config.maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const resetMs = oldestInWindow + config.windowMs - now;
    return { allowed: false, remaining: 0, resetMs };
  }

  entry.timestamps.push(now);
  store.set(key, entry);

  return {
    allowed: true,
    remaining: config.maxRequests - entry.timestamps.length,
    resetMs: config.windowMs,
  };
}

export function getRateLimitHeaders(remaining: number, resetMs: number): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(resetMs / 1000)),
  };
}
