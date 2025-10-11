import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { storage } from '../storage.js';
import { db } from '../db.js';
import { auditLogs } from '@shared/schema';
import { lte } from 'drizzle-orm';

describe('Audit Logging System', () => {
  beforeAll(async () => {
    // Ensure database is ready for tests
    await db.execute('SELECT 1');
  });

  afterAll(async () => {
    // Clean up test audit logs
    await db.delete(auditLogs).where(lte(auditLogs.timestamp, new Date()));
  });

  describe('Audit Log Creation', () => {
    it('should create audit log entries', async () => {
      const beforeCount = await storage.getAuditLogs();

      await storage.createAuditLog({
        userId: 'test-user-123',
        action: 'login',
        entityType: 'user',
        entityId: 'test-user-123',
        ipAddress: '192.168.1.100',
        oldValues: null,
        newValues: { status: 'active' },
        changesDiff: { status: { old: null, new: 'active' } },
        sessionId: 'session-123'
      });

      const afterCount = await storage.getAuditLogs();
      expect(afterCount.items.length).toBe(beforeCount.items.length + 1);
    });

    it('should store all required audit fields', async () => {
      const testData = {
        userId: 'test-user-456',
        action: 'create',
        entityType: 'order',
        entityId: 'order-123',
        ipAddress: '10.0.0.1',
        oldValues: null,
        newValues: { status: 'created' },
        changesDiff: { status: { old: null, new: 'created' } },
        sessionId: 'session-456'
      };

      const auditLog = await storage.createAuditLog(testData);

      expect(auditLog.userId).toBe(testData.userId);
      expect(auditLog.action).toBe(testData.action);
      expect(auditLog.entityType).toBe(testData.entityType);
      expect(auditLog.entityId).toBe(testData.entityId);
      expect(auditLog.ipAddress).toBe(testData.ipAddress);
      expect(auditLog.oldValues).toEqual(testData.oldValues);
      expect(auditLog.newValues).toEqual(testData.newValues);
      expect(auditLog.changesDiff).toEqual(testData.changesDiff);
      expect(auditLog.timestamp).toBeInstanceOf(Date);
    });

    it('should handle complex audit data', async () => {
      const complexOldValues = {
        status: 'pending',
        items: [{ name: 'item1', quantity: 1 }],
        totalValue: '100.00'
      };

      const complexNewValues = {
        status: 'approved',
        items: [{ name: 'item1', quantity: 2 }],
        totalValue: '200.00'
      };

      const auditLog = await storage.createAuditLog({
        userId: 'test-user-complex',
        action: 'update',
        entityType: 'order',
        entityId: 'complex-order-123',
        ipAddress: '192.168.1.50',
        oldValues: complexOldValues,
        newValues: complexNewValues,
        changesDiff: {
          status: { old: 'pending', new: 'approved' },
          items: { old: complexOldValues.items, new: complexNewValues.items },
          totalValue: { old: '100.00', new: '200.00' }
        },
        sessionId: 'complex-session'
      });

      expect(auditLog.oldValues).toEqual(complexOldValues);
      expect(auditLog.newValues).toEqual(complexNewValues);
      expect(auditLog.changesDiff).toBeDefined();
    });
  });

  describe('Audit Log Retrieval', () => {
    beforeEach(async () => {
      // Create test audit logs
      const testLogs = [
        {
          userId: 'user-1',
          action: 'login',
          entityType: 'user',
          entityId: 'user-1',
          ipAddress: '192.168.1.10',
          oldValues: null,
          newValues: { status: 'active' },
          changesDiff: { status: { old: null, new: 'active' } },
          sessionId: 'session-1'
        },
        {
          userId: 'user-2',
          action: 'create',
          entityType: 'order',
          entityId: 'order-1',
          ipAddress: '192.168.1.20',
          oldValues: null,
          newValues: { amount: 1000 },
          changesDiff: { amount: { old: null, new: 1000 } },
          sessionId: 'session-2'
        },
        {
          userId: 'user-1',
          action: 'update',
          entityType: 'order',
          entityId: 'order-1',
          ipAddress: '192.168.1.10',
          oldValues: { status: 'pending' },
          newValues: { status: 'approved' },
          changesDiff: { status: { old: 'pending', new: 'approved' } },
          sessionId: 'session-1'
        }
      ];

      for (const log of testLogs) {
        await storage.createAuditLog(log);
      }
    });

    it('should retrieve all audit logs', async () => {
      const result = await storage.getAuditLogs();
      expect(result.items.length).toBeGreaterThan(0);
      expect(result.total).toBeGreaterThan(0);
      expect(result.items[0]).toHaveProperty('userId');
      expect(result.items[0]).toHaveProperty('action');
      expect(result.items[0]).toHaveProperty('timestamp');
    });

    it('should filter by user ID', async () => {
      const result = await storage.getAuditLogs({ userId: 'user-1' });
      expect(result.items.length).toBeGreaterThan(0);
      result.items.forEach(log => {
        expect(log.userId).toBe('user-1');
      });
    });

    it('should filter by action', async () => {
      const result = await storage.getAuditLogs({ action: 'login' });
      expect(result.items.length).toBeGreaterThan(0);
      result.items.forEach(log => {
        expect(log.action).toBe('login');
      });
    });

    it('should filter by entity type', async () => {
      const result = await storage.getAuditLogs({ entityType: 'order' });
      expect(result.items.length).toBeGreaterThan(0);
      result.items.forEach(log => {
        expect(log.entityType).toBe('order');
      });
    });

    it('should filter by date range', async () => {
      const yesterday = new Date(Date.now() - 86400000);
      const tomorrow = new Date(Date.now() + 86400000);

      const result = await storage.getAuditLogs({
        dateFrom: yesterday,
        dateTo: tomorrow
      });

      expect(result.items.length).toBeGreaterThan(0);
      result.items.forEach(log => {
        expect(log.timestamp.getTime()).toBeGreaterThanOrEqual(yesterday.getTime());
        expect(log.timestamp.getTime()).toBeLessThanOrEqual(tomorrow.getTime());
      });
    });

    it('should support pagination', async () => {
      const result = await storage.getAuditLogs({ limit: 2, offset: 0 });
      expect(result.items.length).toBeLessThanOrEqual(2);

      const result2 = await storage.getAuditLogs({ limit: 2, offset: 2 });
      expect(result2.items.length).toBeLessThanOrEqual(2);

      // Should get different results
      const firstIds = result.items.map(log => log.id);
      const secondIds = result2.items.map(log => log.id);
      expect(firstIds).not.toEqual(secondIds);
    });

    it('should sort by timestamp descending', async () => {
      const result = await storage.getAuditLogs();
      expect(result.items.length).toBeGreaterThan(1);

      for (let i = 0; i < result.items.length - 1; i++) {
        expect(result.items[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          result.items[i + 1].timestamp.getTime()
        );
      }
    });
  });

  describe('Audit Log Retention', () => {
    it('should purge old logs', async () => {
      const cutoffDate = new Date(Date.now() - 86400000); // 1 day ago

      // Create an old log
      await storage.createAuditLog({
        userId: 'old-user',
        action: 'old_action',
        entityType: 'test',
        entityId: 'old-entity',
        ipAddress: '127.0.0.1',
        oldValues: { old: true },
        newValues: null,
        changesDiff: null,
        sessionId: 'old-session'
      });

      const beforeCount = await storage.getAuditLogs();

      const deletedCount = await storage.purgeOldLogs(cutoffDate);

      const afterCount = await storage.getAuditLogs();

      expect(deletedCount).toBeGreaterThan(0);
      expect(afterCount.items.length).toBeLessThan(beforeCount.items.length);
    });

    it('should not delete recent logs', async () => {
      const cutoffDate = new Date(Date.now() - 3600000); // 1 hour ago

      // Create a recent log
      await storage.createAuditLog({
        userId: 'recent-user',
        action: 'recent_action',
        entityType: 'test',
        entityId: 'recent-entity',
        ipAddress: '127.0.0.1',
        oldValues: null,
        newValues: { recent: true },
        changesDiff: { recent: { old: null, new: true } },
        sessionId: 'recent-session'
      });

      const beforeCount = await storage.getAuditLogs();

      const deletedCount = await storage.purgeOldLogs(cutoffDate);

      const afterCount = await storage.getAuditLogs();

      // Recent log should still exist
      expect(afterCount.items.length).toBe(beforeCount.items.length - deletedCount);
    });
  });

  describe('Audit Log Security', () => {
    it('should prevent SQL injection in audit data', async () => {
      const maliciousData = {
        malicious: "'; DROP TABLE audit_logs; --",
        nested: {
          injection: "UNION SELECT * FROM users --"
        }
      };

      const auditLog = await storage.createAuditLog({
        userId: 'test-user-safe',
        action: 'test_injection',
        entityType: 'security_test',
        entityId: 'injection-test',
        ipAddress: '127.0.0.1',
        oldValues: maliciousData,
        newValues: null,
        changesDiff: null,
        sessionId: 'safe-session'
      });

      expect(auditLog.oldValues).toEqual(maliciousData);

      // Verify the table still exists and data is intact
      const result = await storage.getAuditLogs({ userId: 'test-user-safe' });
      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should handle large audit data objects', async () => {
      const largeData = {
        largeArray: Array.from({ length: 100 }, (_, i) => ({ index: i, data: 'x'.repeat(10) })),
        largeString: 'x'.repeat(1000),
        nestedObjects: Array.from({ length: 10 }, () => ({
          property1: 'value1',
          property2: 'value2',
          array: [1, 2, 3, 4, 5]
        }))
      };

      const auditLog = await storage.createAuditLog({
        userId: 'test-user-large',
        action: 'large_payload',
        entityType: 'performance_test',
        entityId: 'large-test',
        ipAddress: '127.0.0.1',
        oldValues: null,
        newValues: largeData,
        changesDiff: { largeData: { old: null, new: largeData } },
        sessionId: 'large-session'
      });

      expect(auditLog.newValues).toEqual(largeData);
    });
  });
});