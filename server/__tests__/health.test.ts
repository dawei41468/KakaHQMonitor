import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import express from 'express';
import { registerRoutes } from '../routes.js';
import { storage } from '../storage.js';

describe('Health Check Endpoint', () => {
  let app: express.Express;

  beforeAll(async () => {
    // Create app without starting server
    app = express();
    app.use(express.json());
    await registerRoutes(app);
  });

  afterAll(async () => {
    // No server to close since we didn't start one
  });

  it('should return healthy status with database connectivity', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('message', 'OK');
    expect(response.body).toHaveProperty('checks.database', 'healthy');
    expect(['healthy', 'warning']).toContain(response.body.checks.memory);
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('timestamp');
    expect(typeof response.body.uptime).toBe('number');
    expect(response.body.uptime).toBeGreaterThan(0);
  });

  it('should handle database connection errors gracefully', async () => {
    // Mock storage function that health endpoint uses
    const originalGetAllUsers = storage.getAllUsers;
    storage.getAllUsers = jest.fn().mockRejectedValue(new Error('Database connection failed'));

    const response = await request(app)
      .get('/health')
      .expect(503);

    expect(response.body).toHaveProperty('message', 'Database connection failed');
    expect(response.body).toHaveProperty('checks.database', 'unhealthy');

    // Restore original function
    storage.getAllUsers = originalGetAllUsers;
  });

  it('should include memory usage information', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('checks.memory');
    expect(['healthy', 'warning']).toContain(response.body.checks.memory);
  });

  it('should respond within acceptable time limits', async () => {
    const startTime = Date.now();

    await request(app)
      .get('/health')
      .expect(200);

    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
  });
});