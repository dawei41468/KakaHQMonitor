import './env';

import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { apiRateLimit, securityHeaders } from "./security";
import { checkPaymentOverdueAlerts, resolveCompletedPaymentAlerts, checkOverdueOrdersAlerts, resolveCompletedOverdueAlerts, checkStuckOrdersAlerts } from "./alert-checker";

const app = express();
app.use(securityHeaders);
app.use(apiRateLimit);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

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

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
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
    log(`serving on port ${port}`);

    // Set up periodic payment alert checking
    // In development: check every 5 minutes for testing
    // In production: should be daily (24 * 60 * 60 * 1000)
    const checkInterval = app.get("env") === "development" ? 5 * 60 * 1000 : 24 * 60 * 60 * 1000;

    setInterval(async () => {
      try {
        log('Running scheduled alert checks...');
        await checkPaymentOverdueAlerts();
        await resolveCompletedPaymentAlerts();
        await checkOverdueOrdersAlerts();
        await checkStuckOrdersAlerts();
        await resolveCompletedOverdueAlerts();
        log('Scheduled alert checks completed');
      } catch (error) {
        log(`Scheduled alert checks failed: ${error}`);
      }
    }, checkInterval);

    log(`Payment alert checking scheduled every ${checkInterval / (60 * 1000)} minutes`);
  });
})();
