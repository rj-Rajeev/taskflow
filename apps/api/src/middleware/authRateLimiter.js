import redis from "../lib/redis.js";

const WINDOW_SECONDS = 60;
const MAX_REQUESTS = 10;

export async function authRateLimiter(req, res, next) {
  try {
    const ip = req.ip;

    const key = `rate-limit:auth:${ip}`;

    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, WINDOW_SECONDS);
    }

    if (count > MAX_REQUESTS) {
      return res.status(429).json({
        success: false,
        message: "Too many authentication requests. Please try again later.",
        code: "AUTH_RATE_LIMIT_EXCEEDED",
      });
    }

    next();
  } catch (error) {
    console.error("Rate limiter error:", error);

    return res.status(503).json({
        success: false,
        message: "Rate limiter unavailable",
        code: "RATE_LIMITER_UNAVAILABLE",
    });
  }
}