
import rateLimit from 'express-rate-limit';

// Apply rate limiting to verification requests to prevent abuse.
// This configuration allows 10 requests per minute from the same IP.
export const verificationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after a minute.',
  },
});