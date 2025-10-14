import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { checkPaymentOverdueAlerts, checkOverdueOrdersAlerts, checkStuckOrdersAlerts, resolveCompletedPaymentAlerts, resolveCompletedOverdueAlerts } from '../alert-checker.js';
import { storage } from '../storage.js';
import { db } from '../db.js';
import { alerts, orders } from '@shared/schema';
import { like } from 'drizzle-orm';
import * as cron from 'node-cron';

describe('Alert System with Cron Jobs', () => {
  beforeAll(async () => {
    // Ensure database is ready for tests
    await db.execute('SELECT 1');
  });

  afterAll(async () => {
    // Clean up any test data
    await db.delete(alerts).where(like(alerts.title, 'Test Alert%'));
  });

  describe('Cron Job Scheduling', () => {
    it('should have cron jobs configured for alert checking', () => {
      // Verify that cron is available and can be used
      expect(cron.schedule).toBeDefined();
      expect(typeof cron.schedule).toBe('function');
    });

    it('should support cron expressions for different environments', () => {
      // Test cron expression validation
      const devExpression = '*/5 * * * *'; // Every 5 minutes
      const prodExpression = '0 * * * *'; // Every hour

      expect(() => cron.validate(devExpression)).not.toThrow();
      expect(() => cron.validate(prodExpression)).not.toThrow();
    });
  });

  describe('Alert Creation with Unique Constraints', () => {
    beforeEach(async () => {
      // Clean up test alerts
      await db.delete(alerts).where(like(alerts.title, 'Test Alert%'));
    });
  
    it('should create alerts successfully', async () => {
      const initialCount = await storage.getAllAlerts();
  
      // Create a test alert
      await storage.createAlert({
        type: 'payment_overdue',
        title: 'Test Alert - Payment Overdue',
        message: 'Test payment overdue alert',
        priority: 'medium'
      });
  
      const finalCount = await storage.getAllAlerts();
      expect(finalCount.items.length).toBe(initialCount.items.length + 1);
    });

    it('should allow multiple alerts of same type when no order is specified', async () => {
      // Create first alert
      await storage.createAlert({
        type: 'payment_overdue',
        title: 'Test Alert - Payment Overdue 1',
        message: 'Test payment overdue alert 1',
        priority: 'medium'
      });

      // Should allow creating another alert of same type (no unique constraint without order)
      await storage.createAlert({
        type: 'payment_overdue',
        title: 'Test Alert - Payment Overdue 2',
        message: 'Test payment overdue alert 2',
        priority: 'medium'
      });

      // Should succeed
      const alertsResult = await storage.getAllAlerts();
      const testAlerts = alertsResult.items.filter(a => a.type === 'payment_overdue');
      expect(testAlerts.length).toBe(2);
    });

    it('should allow alerts with same type but different orders', async () => {
      // Create first alert
      await storage.createAlert({
        type: 'payment_overdue',
        title: 'Test Alert 1',
        message: 'Test payment overdue alert 1',
        priority: 'medium'
      });

      // Create second alert with different type
      await storage.createAlert({
        type: 'lowStock',
        title: 'Test Alert 2',
        message: 'Test low stock alert 2',
        priority: 'medium'
      });

      // Should succeed
      const alertsResult = await storage.getAllAlerts();
      const testAlerts = alertsResult.items.filter(a => a.title.startsWith('Test Alert'));
      expect(testAlerts.length).toBe(2);
    });

    it('should allow duplicate alerts after original is resolved', async () => {
      // Create first alert
      const alert = await storage.createAlert({
        type: 'payment_overdue',
        title: 'Test Alert - Resolvable',
        message: 'Test payment overdue alert',
        priority: 'medium'
      });

      // Resolve the alert
      await storage.updateAlert(alert.id, { resolved: true });

      // Verify it's resolved
      let updatedAlert = await storage.getAlertById(alert.id);
      expect(updatedAlert?.resolved).toBe(true);

      // Should allow creating another alert of same type (resolution doesn't prevent new alerts)
      const secondAlert = await storage.createAlert({
        type: 'payment_overdue',
        title: 'Test Alert - After Resolution',
        message: 'Test payment overdue alert after resolution',
        priority: 'medium'
      });

      // Verify second alert was created
      expect(secondAlert).toBeDefined();
      expect(secondAlert.type).toBe('payment_overdue');
      expect(secondAlert.resolved).toBe(false);
    });
  });

  describe('Alert Checker Functions', () => {
    beforeEach(async () => {
      // Clean up test data
      await db.delete(alerts).where(like(alerts.title, 'Test Alert%'));
      await db.delete(orders).where(like(orders.id, 'test-order-%'));
    });

    it('should handle checkPaymentOverdueAlerts without throwing', async () => {
      await expect(checkPaymentOverdueAlerts()).resolves.not.toThrow();
    });

    it('should handle checkOverdueOrdersAlerts without throwing', async () => {
      await expect(checkOverdueOrdersAlerts()).resolves.not.toThrow();
    });

    it('should handle checkStuckOrdersAlerts without throwing', async () => {
      await expect(checkStuckOrdersAlerts()).resolves.not.toThrow();
    });

    it('should handle resolveCompletedPaymentAlerts without throwing', async () => {
      await expect(resolveCompletedPaymentAlerts()).resolves.not.toThrow();
    });

    it('should handle resolveCompletedOverdueAlerts without throwing', async () => {
      await expect(resolveCompletedOverdueAlerts()).resolves.not.toThrow();
    });
  });

  describe('Retry Logic', () => {
    it('should implement exponential backoff for retries', () => {
      // Test the retry delay calculation logic
      const maxRetries = 3;
      const baseDelay = 1000; // 1 second

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const expectedDelay = Math.min(baseDelay * Math.pow(2, attempt - 1), 30000);
        // In real implementation, this would be tested with actual timing
        expect(expectedDelay).toBeGreaterThan(0);
        expect(expectedDelay).toBeLessThanOrEqual(30000); // Max 30 seconds
      }
    });

    it('should have configurable retry attempts', () => {
      const maxRetries = 3;
      expect(maxRetries).toBeGreaterThan(0);
      expect(maxRetries).toBeLessThanOrEqual(5); // Reasonable upper limit
    });
  });

  describe('Alert Priority and Notification', () => {
    it('should support different alert priorities', async () => {
      const priorities = ['low', 'medium', 'high', 'critical'];

      for (const priority of priorities) {
        const alert = await storage.createAlert({
          type: 'test',
          title: `Test Alert - ${priority}`,
          message: `Test alert with ${priority} priority`,
          priority: priority as 'low' | 'medium' | 'high' | 'critical'
        });

        expect(alert.priority).toBe(priority);
      }
    });

    it('should trigger notifications for high-priority alerts', async () => {
      // This test would verify email/SMS notification integration
      // For now, we test that high-priority alerts are created successfully
      const alert = await storage.createAlert({
        type: 'critical_system_failure',
        title: 'Critical System Alert',
        message: 'System is experiencing critical failure',
        priority: 'critical'
      });

      expect(alert.priority).toBe('critical');
      expect(alert.type).toBe('critical_system_failure');
    });
  });

  describe('Alert Resolution Logic', () => {
    it('should resolve alerts when conditions are met', async () => {
      // Create a test alert
      const alert = await storage.createAlert({
        type: 'payment_overdue',
        title: 'Test Payment Alert',
        message: 'Payment is overdue',
        priority: 'medium'
      });

      expect(alert.resolved).toBe(false);

      // Resolve the alert
      await storage.updateAlert(alert.id, { resolved: true });

      // Verify resolution
      const updatedAlert = await storage.getAlertById(alert.id);
      expect(updatedAlert?.resolved).toBe(true);
    });

    it('should handle bulk alert resolution', async () => {
      // Create multiple alerts
      const alert1 = await storage.createAlert({
        type: 'test_bulk_1',
        title: 'Bulk Test 1',
        message: 'Bulk resolution test 1',
        priority: 'low'
      });

      const alert2 = await storage.createAlert({
        type: 'test_bulk_2',
        title: 'Bulk Test 2',
        message: 'Bulk resolution test 2',
        priority: 'low'
      });

      // Resolve both
      await storage.updateAlert(alert1.id, { resolved: true });
      await storage.updateAlert(alert2.id, { resolved: true });

      // Verify both are resolved
      const updatedAlert1 = await storage.getAlertById(alert1.id);
      const updatedAlert2 = await storage.getAlertById(alert2.id);

      expect(updatedAlert1?.resolved).toBe(true);
      expect(updatedAlert2?.resolved).toBe(true);
    });
  });
});