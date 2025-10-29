import './env';

import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { apiRateLimit, securityHeaders } from "./security";
import { checkPaymentOverdueAlerts, resolveCompletedPaymentAlerts, checkOverdueOrdersAlerts, resolveCompletedOverdueAlerts, checkStuckOrdersAlerts } from "./alert-checker";
import { storage } from "./storage";
import { db } from "./db";
import * as cron from "node-cron";
import { logger } from "./logger";
import { setTimeout as sleep } from "timers/promises";
import { sql } from 'drizzle-orm';
import { notificationService } from './notifications';
import fs from 'fs';
import path from 'path';

/**
 * Run all alert checks with retry logic and error handling
 */
async function runAlertChecks() {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      logger.info('Running scheduled alert checks...');
      await checkPaymentOverdueAlerts();
      await resolveCompletedPaymentAlerts();
      await checkOverdueOrdersAlerts();
      await checkStuckOrdersAlerts();
      await resolveCompletedOverdueAlerts();
      logger.info('Scheduled alert checks completed successfully');
      return; // Success, exit retry loop
    } catch (error) {
      attempt++;
      const isLastAttempt = attempt >= maxRetries;
      const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Exponential backoff, max 30s

      logger.error(`Scheduled alert checks failed (attempt ${attempt}/${maxRetries})`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        attempt,
        maxRetries
      });

      if (isLastAttempt) {
        logger.error('All retry attempts exhausted. Alert checks will be retried in next scheduled run.');
        return;
      }

      logger.warn(`Retrying alert checks in ${backoffDelay}ms...`, { attempt, backoffDelay });
      await sleep(backoffDelay);
    }
  }
}

export const app = express();
app.use(securityHeaders);
app.use(apiRateLimit);
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: Error | unknown, req: Request, res: Response, _next: NextFunction) => {
    const isError = err instanceof Error;
    const status = (isError && 'status' in err && typeof err.status === 'number') ? err.status :
                   (isError && 'statusCode' in err && typeof err.statusCode === 'number') ? err.statusCode : 500;
    const message = (isError && err.message) || "Internal Server Error";

    // Log the error with context
    logger.error('Request error', {
      error: isError ? err.message : String(err),
      stack: isError ? err.stack : undefined,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      status
    });

    // Don't expose internal error details in production
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const responseMessage = isDevelopment ? message : "Internal Server Error";

    res.status(status).json({
      message: responseMessage,
      ...(isDevelopment && isError && { stack: err.stack })
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 3000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '3000', 10);
  server.listen(port, () => {
    logger.info(`Server started successfully`, {
      port,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform
    });

    // Set up periodic alert checking with cron jobs
    // In development: check every 5 minutes for testing
    // In production: check hourly at the top of each hour
    const cronExpression = app.get("env") === "development" ? '*/5 * * * *' : '0 * * * *';

    cron.schedule(cronExpression, async () => {
      await runAlertChecks();
    });

    logger.info(`Alert checking scheduled with cron: ${cronExpression} (${app.get("env") === "development" ? 'every 5 minutes' : 'hourly'})`);

    // Set up audit log retention - run monthly on the 1st at midnight
    cron.schedule('0 0 1 * *', async () => {
      try {
        logger.info('Running audit log retention cleanup...');
        const cutoffDate = new Date();
        cutoffDate.setFullYear(cutoffDate.getFullYear() - 1); // 1 year ago
        const deletedCount = await storage.purgeOldLogs(cutoffDate);
        logger.info(`Audit log retention completed. Deleted ${deletedCount} old logs.`);
        if (deletedCount > 0) {
          await notificationService.sendAlertNotification(
            process.env.ADMIN_EMAIL || 'admin@example.com',
            'Audit Log Purge Completed',
            'Monthly Audit Log Cleanup',
            `Deleted ${deletedCount} logs older than 1 year.`,
            'low'
          );
        }
      } catch (error) {
        logger.error('Audit log retention failed', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      }
    });

    logger.info('Audit log retention scheduled monthly on the 1st at midnight');

    // Set up audit log monitoring - run daily at midnight
    cron.schedule('0 0 * * *', async () => {
      try {
        // DB size
        const dbResult = await db.execute(sql`SELECT pg_size_pretty(pg_total_relation_size('audit_logs')) AS size;`);
        const dbSize = dbResult.rows[0].size as string;
        logger.info(`[MONITOR] Audit DB size: ${dbSize}`);

        // File size (sum audit logs)
        const logsDir = path.join(process.cwd(), 'logs');
        let fileSize = '0B';
        if (fs.existsSync(logsDir)) {
          const files = fs.readdirSync(logsDir).filter(f => f.startsWith('audit-') && (f.endsWith('.log') || f.endsWith('.log.gz')));
          const totalBytes = files.reduce((sum, f) => sum + fs.statSync(path.join(logsDir, f)).size, 0);
          fileSize = `${(totalBytes / (1024 * 1024)).toFixed(2)}MB`;
        }
        logger.info(`[MONITOR] Audit file size: ${fileSize}`);

        // Alert if thresholds exceeded (customize: e.g., 100MB DB, 500MB files)
        if (dbSize.includes('> 100MB') || fileSize.includes('> 500')) {
          await notificationService.sendAlertNotification(
            process.env.ADMIN_EMAIL || 'admin@example.com',
            'Audit Log Size Alert',
            'High Audit Log Volume',
            `DB: ${dbSize}, Files: ${fileSize}. Review retention/purge.`,
            'high'
          );
          logger.warn('[ALERT] Audit size threshold exceeded');
        }
      } catch (error) {
        logger.error('[MONITOR ERROR]', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
      }
    });

    logger.info('Audit log monitoring scheduled daily at midnight');
  });
})();
