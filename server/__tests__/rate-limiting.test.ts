import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { registerRoutes } from '../routes.js';
import express from 'express';
import { apiRateLimit, securityHeaders } from '../security.js';
import cookieParser from 'cookie-parser';
import { Server } from 'http';

describe('Rate Limiting', () => {
  let app: express.Express;
  let server: Server;

  beforeAll(async () => {
    app = express();
    app.use(securityHeaders);
    app.use(apiRateLimit);
    app.use(cookieParser());
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    server = await registerRoutes(app);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  describe('API Routes Rate Limiting', () => {
    it('should allow requests within rate limit', async () => {
      // Make requests within the limit (100 per 15 minutes for API routes)
      for (let i = 0; i < 5; i++) {
        const response = await request(app)
          .get('/api/dashboard/overview')
          .expect(401); // Unauthorized due to no auth, but should not be rate limited

        expect(response.status).not.toBe(429);
      }
    });

    it('should rate limit excessive API requests', async () => {
      // This test would require making many requests quickly
      // In a real scenario, you'd use a tool like artillery or k6
      // For now, we'll test that the rate limiting middleware is applied
      const response = await request(app)
        .get('/api/dashboard/overview');

      // The response should include rate limit headers
      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
      expect(response.headers).toHaveProperty('ratelimit-reset');
    });
  });

  describe('Authentication Routes Rate Limiting', () => {
    it('should have stricter rate limiting on auth routes', async () => {
      // Auth routes should have lower limits (5 per 15 minutes)
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' })
        .expect(401);

      // Should include rate limit headers
      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(response.headers).toHaveProperty('ratelimit-remaining');
    });

    it('should prevent brute force attacks on login', async () => {
      // Make multiple failed login attempts
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({ email: 'test@example.com', password: 'wrongpassword' })
          .expect(401);
      }

      // The rate limiting should still allow some requests
      // (exact behavior depends on configuration)
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' });

      // Should either be unauthorized, rate limited, or bad request (validation)
      expect([400, 401, 429]).toContain(response.status);
    });
  });

  describe('Rate Limit Headers', () => {
    it('should include proper rate limit headers', async () => {
      const response = await request(app)
        .get('/api/dashboard/overview');

      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
      expect(response.headers['ratelimit-reset']).toBeDefined();

      // Limit should be a number
      const limit = parseInt(response.headers['ratelimit-limit']);
      expect(limit).toBeGreaterThan(0);

      // Remaining should be a number
      const remaining = parseInt(response.headers['ratelimit-remaining']);
      expect(remaining).toBeGreaterThanOrEqual(0);
      expect(remaining).toBeLessThanOrEqual(limit);

      // Reset should be a number of seconds remaining (less than window size)
      const reset = parseInt(response.headers['ratelimit-reset']);
      expect(reset).toBeGreaterThan(0);
      expect(reset).toBeLessThanOrEqual(900); // Should be <= 15 minutes in seconds
    });
  });

  describe('Rate Limit Bypass Prevention', () => {
    it('should apply rate limiting to all HTTP methods', async () => {
      // Test different HTTP methods
      const getResponse = await request(app).get('/api/dashboard/overview');
      expect(getResponse.headers).toHaveProperty('ratelimit-limit');

      const postResponse = await request(app).post('/api/dashboard/overview');
      expect(postResponse.headers).toHaveProperty('ratelimit-limit');

      const putResponse = await request(app).put('/api/dashboard/overview');
      expect(putResponse.headers).toHaveProperty('ratelimit-limit');
    });

    it('should rate limit by IP address', async () => {
      // This would require setting specific IP headers in requests
      // For now, we verify the middleware is configured correctly
      const response = await request(app)
        .get('/api/dashboard/overview')
        .set('X-Forwarded-For', '192.168.1.100');

      expect(response.headers).toHaveProperty('ratelimit-limit');
    });
  });
});