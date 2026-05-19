export class RateLimitError extends Error {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Too many requests. Please wait a moment and try again.");
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitBucket>();

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  return (
    forwardedFor ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

export function enforceRateLimit(input: {
  request: Request;
  action: string;
  limit: number;
  windowMs: number;
  userId?: string;
}): void {
  const now = Date.now();
  const identity = input.userId ? `user:${input.userId}` : `ip:${getClientIp(input.request)}`;
  const key = `${input.action}:${identity}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + input.windowMs });
    return;
  }

  if (current.count >= input.limit) {
    throw new RateLimitError(Math.max(1, Math.ceil((current.resetAt - now) / 1000)));
  }

  current.count += 1;

  for (const [bucketKey, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(bucketKey);
    }
  }
}
