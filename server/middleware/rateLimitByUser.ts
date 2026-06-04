import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import rateLimit from 'express-rate-limit';

/**
 * Bhagyoday Cloud ERP - Per-User Rate Limiting
 * Limits requests based on Firebase UID instead of just IP.
 */

export const rateLimitByUser = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Limit each user to 100 requests per minute
  keyGenerator: (req: any) => {
    const uid = (req as AuthRequest).user?.uid;
    if (uid) return uid;
    // Standard express-rate-limit logic for IP fallback
    return req.ip || req.headers['x-forwarded-for'] || 'unknown';
  },
  validate: { 
    default: false
  }, // Disable validations in this proxy environment
  handler: (req: any, res: Response) => {
    res.status(429).json({
      error: "Rate limit exceeded",
      retryAfter: 60,
      userId: (req as AuthRequest).user?.uid
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});
