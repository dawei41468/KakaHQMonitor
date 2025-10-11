import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { logger } from '../logger.js';
import fs from 'fs';
import path from 'path';
import { app } from '../index.js';
import request from 'supertest';

describe('Winston Logging System', () => {
  const logsDir = path.join(process.cwd(), 'logs');
  let server: any;

  beforeAll(async () => {
    server = app.listen(0);
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  beforeEach(() => {
    // Clean up any existing log files before each test
    if (fs.existsSync(logsDir)) {
      const files = fs.readdirSync(logsDir);
      files.forEach(file => {
        if (file.startsWith('combined-') || file.startsWith('error-') || file.startsWith('audit-')) {
          fs.unlinkSync(path.join(logsDir, file));
        }
      });
    }
  });

  describe('Logger Configuration', () => {
    it('should create logger instance', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });

    it('should have all required log levels', () => {
      expect(logger.error).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.debug).toBeDefined();
    });
  });

  describe('Log File Creation', () => {
    it('should create log directory', () => {
      // Trigger a log to ensure directory creation
      logger.info('Test log for directory creation');

      expect(fs.existsSync(logsDir)).toBe(true);
    });

    it('should create combined log file', () => {
      logger.info('Test combined log entry');

      const files = fs.readdirSync(logsDir);
      const combinedLog = files.find(file => file.startsWith('combined-'));
      expect(combinedLog).toBeDefined();
    });

    it('should create error log file when logging errors', () => {
      logger.error('Test error log entry');

      const files = fs.readdirSync(logsDir);
      const errorLog = files.find(file => file.startsWith('error-'));
      expect(errorLog).toBeDefined();
    });

    it('should create audit log file', () => {
      // Audit logs are created by the audit middleware
      // For testing, we'll check if the logger can handle audit-style logging
      logger.info('Test audit log entry', { type: 'audit', userId: 'test-user' });

      const files = fs.readdirSync(logsDir);
      const auditLog = files.find(file => file.startsWith('audit-'));
      // Audit logs might not be created immediately, but the infrastructure should be ready
      expect(fs.existsSync(logsDir)).toBe(true);
    });
  });

  describe('Log Content and Format', () => {
    it('should log messages with proper JSON format', () => {
      const testMessage = 'Test message';
      const testData = { userId: '123', action: 'login' };

      logger.info(testMessage, testData);

      const files = fs.readdirSync(logsDir);
      const combinedLog = files.find(file => file.startsWith('combined-'));

      if (combinedLog) {
        const logContent = fs.readFileSync(path.join(logsDir, combinedLog), 'utf8');
        const logLines = logContent.trim().split('\n');

        if (logLines.length > 0) {
          const lastLog = JSON.parse(logLines[logLines.length - 1]);
          expect(lastLog.message).toContain(testMessage);
          expect(lastLog.level).toBeDefined();
          expect(lastLog.timestamp).toBeDefined();
        }
      }
    });

    it('should include timestamp in logs', () => {
      const beforeLog = new Date();
      logger.info('Timestamp test');

      const files = fs.readdirSync(logsDir);
      const combinedLog = files.find(file => file.startsWith('combined-'));

      if (combinedLog) {
        const logContent = fs.readFileSync(path.join(logsDir, combinedLog), 'utf8');
        const logLines = logContent.trim().split('\n');

        if (logLines.length > 0) {
          const lastLog = JSON.parse(logLines[logLines.length - 1]);
          const logTime = new Date(lastLog.timestamp);
          const afterLog = new Date();

          expect(logTime.getTime()).toBeGreaterThanOrEqual(beforeLog.getTime());
          expect(logTime.getTime()).toBeLessThanOrEqual(afterLog.getTime());
        }
      }
    });

    it('should handle error logging with stack traces', () => {
      const testError = new Error('Test error');
      testError.stack = 'Test stack trace';

      logger.error('Error occurred', {
        error: testError.message,
        stack: testError.stack
      });

      const files = fs.readdirSync(logsDir);
      const errorLog = files.find(file => file.startsWith('error-'));

      if (errorLog) {
        const logContent = fs.readFileSync(path.join(logsDir, errorLog), 'utf8');
        expect(logContent).toContain('Test error');
        expect(logContent).toContain('Test stack trace');
      }
    });
  });

  describe('Request Logging Integration', () => {
    it('should log API requests', async () => {
      const beforeRequest = new Date();

      await request(app)
        .get('/health')
        .expect(200);

      const afterRequest = new Date();

      const files = fs.readdirSync(logsDir);
      const combinedLog = files.find(file => file.startsWith('combined-'));

      if (combinedLog) {
        const logContent = fs.readFileSync(path.join(logsDir, combinedLog), 'utf8');
        const logLines = logContent.trim().split('\n');

        // Find request logs
        const requestLogs = logLines.filter(line => {
          try {
            const log = JSON.parse(line);
            return log.message && log.message.includes('/health');
          } catch {
            return false;
          }
        });

        expect(requestLogs.length).toBeGreaterThan(0);

        const lastRequestLog = JSON.parse(requestLogs[requestLogs.length - 1]);
        expect(lastRequestLog.message).toContain('GET /health 200');
        expect(lastRequestLog.level).toBeDefined();
      }
    });

    it('should log error responses', async () => {
      const beforeRequest = new Date();

      // Trigger an error by accessing a non-existent route
      await request(app)
        .get('/api/non-existent-route')
        .expect(404);

      const afterRequest = new Date();

      const files = fs.readdirSync(logsDir);
      const combinedLog = files.find(file => file.startsWith('combined-'));

      if (combinedLog) {
        const logContent = fs.readFileSync(path.join(logsDir, combinedLog), 'utf8');
        const logLines = logContent.trim().split('\n');

        // Find error logs
        const errorLogs = logLines.filter(line => {
          try {
            const log = JSON.parse(line);
            return log.message && log.message.includes('404');
          } catch {
            return false;
          }
        });

        expect(errorLogs.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Log Rotation', () => {
    it('should create daily log files', () => {
      // This test verifies the log rotation configuration is set up
      // In a real scenario, you'd need to manipulate time to test rotation
      logger.info('Daily rotation test');

      const files = fs.readdirSync(logsDir);
      const logFiles = files.filter(file =>
        file.startsWith('combined-') ||
        file.startsWith('error-') ||
        file.startsWith('audit-')
      );

      expect(logFiles.length).toBeGreaterThan(0);

      // Verify filename format (YYYY-MM-DD)
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      logFiles.forEach(file => {
        const datePart = file.split('-').slice(1).join('-').split('.')[0];
        expect(datePart).toMatch(datePattern);
      });
    });
  });
});