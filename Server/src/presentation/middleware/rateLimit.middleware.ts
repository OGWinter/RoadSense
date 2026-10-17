import rateLimit from 'express-rate-limit';

const isProduction = process.env.NODE_ENV === 'production';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 20 : 500, // 20 in production, relaxed in development for test suites
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts. Please try again after 15 minutes.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429
    }
  }
});

export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 30 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Upload rate limit exceeded. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429
    }
  }
});

export const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: isProduction ? 200 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'API rate limit exceeded. Please slow down your requests.',
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429
    }
  }
});
