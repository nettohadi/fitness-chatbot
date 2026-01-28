/**
 * Simple in-memory rate limiter for serverless environments
 * For production at scale, consider using Redis or Upstash
 */

interface RateLimitRecord {
  count: number
  resetTime: number
}

// In-memory store (cleared on cold starts, which is acceptable for rate limiting)
const rateLimitStore = new Map<string, RateLimitRecord>()

// Clean up old entries periodically to prevent memory leaks
const CLEANUP_INTERVAL = 60 * 1000 // 1 minute
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return

  lastCleanup = now
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number
  /** Time window in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean
  /** Number of requests remaining in the window */
  remaining: number
  /** Time in ms until the rate limit resets */
  resetIn: number
  /** Total limit for the window */
  limit: number
}

/**
 * Check if a request should be rate limited
 * @param key Unique identifier for the rate limit (e.g., IP + endpoint)
 * @param config Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  cleanup()

  const now = Date.now()
  const record = rateLimitStore.get(key)

  // No existing record or expired window - create new
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetIn: config.windowMs,
      limit: config.maxRequests,
    }
  }

  // Existing record - check limit
  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: record.resetTime - now,
      limit: config.maxRequests,
    }
  }

  // Increment count
  record.count++
  rateLimitStore.set(key, record)

  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetIn: record.resetTime - now,
    limit: config.maxRequests,
  }
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiters = {
  /** OTP requests: 5 per 15 minutes per phone number */
  otp: (phoneNumber: string) =>
    checkRateLimit(`otp:${phoneNumber}`, {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
    }),

  /** Debug API: 30 per minute per token */
  debug: (token: string) =>
    checkRateLimit(`debug:${token}`, {
      maxRequests: 30,
      windowMs: 60 * 1000, // 1 minute
    }),

  /** Webhook: 100 per minute per chat ID (protect against spam) */
  webhook: (chatId: string) =>
    checkRateLimit(`webhook:${chatId}`, {
      maxRequests: 100,
      windowMs: 60 * 1000, // 1 minute
    }),

  /** Login attempts: 5 per 15 minutes per email */
  login: (email: string) =>
    checkRateLimit(`login:${email.toLowerCase()}`, {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
    }),

  /** OTP verification: 5 attempts per 5 minutes per phone */
  otpVerify: (phoneNumber: string) =>
    checkRateLimit(`otp-verify:${phoneNumber}`, {
      maxRequests: 5,
      windowMs: 5 * 60 * 1000, // 5 minutes
    }),

  /** API general: 60 per minute per IP */
  api: (ip: string) =>
    checkRateLimit(`api:${ip}`, {
      maxRequests: 60,
      windowMs: 60 * 1000, // 1 minute
    }),
}

/**
 * Get rate limit headers for HTTP response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(result.resetIn / 1000).toString(),
  }
}
