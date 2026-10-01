import rateLimit from 'express-rate-limit';

/**
 * Production Rate Limiters for FindIt AI
 * Prevents brute-force authentication, API flooding, AI abuse, and spam.
 */

// General API Rate Limiter
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600, // 600 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP. Please try again after a few minutes.'
  }
});

// Authentication Rate Limiter (Brute-force protection)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 registration/login attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: {
    error: 'Too many authentication attempts. Please try again after 15 minutes.'
  }
});

// AI & Vision Analysis Rate Limiter (Protects expensive Gemini / ML operations)
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 AI queries/verifications per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'AI search and analysis rate limit reached. Please wait a moment before trying again.'
  }
});

// Content Creation Rate Limiter (Spam protection for Lost/Found reports)
export const itemCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 35, // 35 item posts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Item creation rate limit reached. Please wait before submitting more reports.'
  }
});

// Claims Submission Rate Limiter
export const claimLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 35, // 35 claims per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Claim submission limit reached. Please wait before submitting more claims.'
  }
});
