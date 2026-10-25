import { NextRequest } from 'next/server';

interface RateLimitTracker {
  count: number;
  resetAt: number;
}

const trackerMap = new Map<string, RateLimitTracker>();

// Clean up expired IP trackers every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, tracker] of trackerMap.entries()) {
    if (now > tracker.resetAt) {
      trackerMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function checkRateLimit(
  req: NextRequest,
  limit: number = 60,
  windowSeconds: number = 60
): { allowed: boolean; remaining: number; resetMs: number } {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1';

  const route = req.nextUrl.pathname;
  const key = `${ip}:${route}`;
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  let tracker = trackerMap.get(key);

  if (!tracker || now > tracker.resetAt) {
    tracker = { count: 1, resetAt: now + windowMs };
    trackerMap.set(key, tracker);
    return { allowed: true, remaining: limit - 1, resetMs: windowMs };
  }

  tracker.count += 1;

  if (tracker.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      resetMs: tracker.resetAt - now,
    };
  }

  return {
    allowed: true,
    remaining: limit - tracker.count,
    resetMs: tracker.resetAt - now,
  };
}
