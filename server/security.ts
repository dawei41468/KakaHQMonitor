import rateLimit from 'express-rate-limit';
import Tokens from 'csrf';
import { Request, Response, NextFunction } from 'express';

// Rate limiting for auth endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many authentication attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiting
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit in development
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for non-API requests (static assets, Vite dev server)
    return !req.path.startsWith('/api');
  },
});

// CSRF protection
const tokens = new Tokens();

export function generateCsrfToken() {
  return tokens.create(process.env.CSRF_SECRET || 'csrf-secret-change-in-production');
}

export function validateCsrfToken(req: Request, res: Response, next: NextFunction) {
  const token = req.headers['x-csrf-token'] as string || req.body._csrf;

  if (!token) {
    return res.status(403).json({ error: 'CSRF token required' });
  }

  if (!tokens.verify(process.env.CSRF_SECRET || 'csrf-secret-change-in-production', token)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
}

// Security headers middleware
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // CORS headers (adjust origins as needed)
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');

  next();
}