// In-memory sliding-window rate limiter.
// Bounded store + proactive eviction so long-running processes don't leak.
// For horizontal scaling, replace with Redis.

interface RateLimitEntry {
  timestamps: number[];
  lastSeen: number;
}

const MAX_ENTRIES = 50_000; // hard cap — evicts oldest if exceeded
const IDLE_EVICT_MS = 30 * 60 * 1000; // entry is discarded 30min after last hit
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

const store = new Map<string, RateLimitEntry>();

function evictIdle() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.lastSeen > IDLE_EVICT_MS) {
      store.delete(key);
    }
  }
}

function enforceMaxSize() {
  if (store.size <= MAX_ENTRIES) return;
  // Evict oldest (insertion order) until under cap
  const overflow = store.size - MAX_ENTRIES;
  let i = 0;
  for (const key of store.keys()) {
    if (i++ >= overflow) break;
    store.delete(key);
  }
}

// Only schedule the interval once in long-lived processes
declare global {
  // eslint-disable-next-line no-var
  var __rateLimitCleanup: NodeJS.Timeout | undefined;
}
if (!globalThis.__rateLimitCleanup) {
  globalThis.__rateLimitCleanup = setInterval(evictIdle, CLEANUP_INTERVAL_MS);
  // Don't hold the event loop open just for cleanup
  globalThis.__rateLimitCleanup.unref?.();
}

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export const RATE_LIMITS = {
  login: { windowMs: 15 * 60 * 1000, maxRequests: 10 } as RateLimitConfig,
  api: { windowMs: 60 * 1000, maxRequests: 60 } as RateLimitConfig,
  ai: { windowMs: 60 * 1000, maxRequests: 10 } as RateLimitConfig,
  passwordReset: { windowMs: 60 * 60 * 1000, maxRequests: 3 } as RateLimitConfig,
};

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [], lastSeen: now };
    store.set(key, entry);
    enforceMaxSize();
  }

  // Drop timestamps outside the window (in place — no new array)
  const windowStart = now - config.windowMs;
  let write = 0;
  for (let read = 0; read < entry.timestamps.length; read++) {
    if (entry.timestamps[read] >= windowStart) {
      entry.timestamps[write++] = entry.timestamps[read];
    }
  }
  entry.timestamps.length = write;
  entry.lastSeen = now;

  if (entry.timestamps.length >= config.maxRequests) {
    const oldestInWindow = entry.timestamps[0];
    const resetMs = oldestInWindow + config.windowMs - now;
    return { allowed: false, remaining: 0, resetMs };
  }

  entry.timestamps.push(now);

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
