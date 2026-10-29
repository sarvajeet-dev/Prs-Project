import { RATE_LIMITS } from "@/lib/config";

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}

class RateLimiter {
  private buckets: Map<
    string,
    RateLimitBucket
  > = new Map();

  private limits: Record<string, number>;

  private refillInterval =
    1000 * 60 * 60 * 24;

  constructor() {
    this.limits = {
      newsapi: RATE_LIMITS.newsapi,
      gnews: RATE_LIMITS.gnews,
      general:
        RATE_LIMITS.generalRequests * 86400,
    };
  }

  isAllowed(source: string): boolean {
    const limit = this.limits[source];

    if (!limit) {
      return true;
    }

    let bucket = this.buckets.get(source);

    if (!bucket) {
      bucket = {
        tokens: limit,
        lastRefill: Date.now(),
      };

      this.buckets.set(
        source,
        bucket
      );
    }

    const now = Date.now();
    const timeSinceRefill =
      now - bucket.lastRefill;

    if (
      timeSinceRefill >=
      this.refillInterval
    ) {
      bucket.tokens = limit;
      bucket.lastRefill = now;
    }

    if (bucket.tokens > 0) {
      bucket.tokens--;
      return true;
    }

    return false;
  }

  getRemainingTokens(source: string): number {
    const bucket =
      this.buckets.get(source);

    return bucket ? bucket.tokens : -1;
  }

  getResetTime(source: string): Date | null {
    const bucket =
      this.buckets.get(source);

    if (!bucket) {
      return null;
    }

    return new Date(
      bucket.lastRefill +
        this.refillInterval
    );
  }

  getStatus(): Record<
    string,
    {
      remaining: number;
      limit: number;
      resetAt: string;
    }
  > {
    const status: Record<
      string,
      {
        remaining: number;
        limit: number;
        resetAt: string;
      }
    > = {};

    for (const [
      source,
      limit,
    ] of Object.entries(
      this.limits
    )) {
      const remaining =
        this.getRemainingTokens(source);

      const resetAt =
        this.getResetTime(source);

      status[source] = {
        remaining,
        limit,
        resetAt:
          resetAt?.toISOString() ||
          "N/A",
      };
    }

    return status;
  }

  reset(): void {
    this.buckets.clear();
  }
}

export const rateLimiter =
  new RateLimiter();

export async function withRateLimit<T>(
  source: string,
  fn: () => Promise<T>,
  options?: {
    fallback?: T;
    delayMs?: number;
  }
): Promise<T> {
  if (!rateLimiter.isAllowed(source)) {
    console.warn(
      `[RateLimit] ${source} quota exhausted`
    );

    if (options?.fallback !== undefined) {
      return options.fallback;
    }

    throw new Error(
      `Rate limit exceeded for ${source}`
    );
  }

  if (options?.delayMs) {
    await new Promise((resolve) =>
      setTimeout(resolve, options.delayMs)
    );
  }

  return fn();
}
