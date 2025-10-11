# Kaka HQ Monitoring Web App - Production Hardening and Internal LAN Deployment Guide

Date: October 11, 2025

This document provides targeted hardening recommendations for the order management and alert systems (focus areas for initial release), general robustness suggestions for the application, and step-by-step guidance for deploying the app on your company's internal LAN. Since this is an internal network deployment (not cloud-based), emphasis is on self-hosted setup, security within a trusted network, and reliability for production use. The app is built with Node.js/Express (backend), React/Vite (frontend), and PostgreSQL (database via Neon or self-hosted).

## 1. Hardening the Order Management System

The order management system (handled in `server/routes.ts` and `server/storage.ts`) is core to the initial release. Current implementation supports CRUD operations, status updates, payment tracking, attachments, and document generation. To make it "rock hard" for production:

### Key Vulnerabilities and Fixes
- **Input Validation and Sanitization**:
  - Current: Uses Zod schemas (e.g., `insertOrderSchema`) for parsing, but some routes (e.g., `/api/orders/:id`) accept partial updates without full validation.
  - Hardening:
    - Enforce strict Zod validation on all updates. For example, in `/api/orders/:id`, validate `orderData` against a partial schema before applying.
    - Sanitize file uploads (attachments): Limit file types (e.g., PDF, DOCX, images) and sizes (<10MB) in `multer` or equivalent (add if missing). Scan for malware using ClamAV integration.
    - Prevent injection: Drizzle ORM handles SQL safely, but add `zod-validation-error` for user-friendly errors.

- **Concurrency and Race Conditions**:
  - Current: No optimistic locking; multiple users could update the same order simultaneously.
  - Hardening:
    - Add version/timestamp checks in `updateOrder`: Include `updatedAt` in WHERE clause to detect conflicts. Return 409 Conflict if stale.
    - Use database transactions for multi-step operations (e.g., status update + alert creation) in `storage.ts`:
      ```typescript
      await db.transaction(async (tx) => {
        await tx.update(orders).set({ status }).where(eq(orders.id, id));
        // Create alert if needed
      });
      ```

- **Document Generation Reliability**:
  - Current: PDF/DOCX generation in routes can fail (e.g., libreoffice-convert errors); no fallback.
  - Hardening:
    - Wrap generation in try-catch with fallbacks (e.g., log error, return plain text summary).
    - Offload to background job (e.g., Bull Queue with Redis) for large contracts to avoid blocking API.
    - Limit concurrent generations (e.g., semaphore) to prevent resource exhaustion.

- **Audit Trail and Immutability**:
  - Current: Basic `updatedAt`, no history.
  - Hardening:
    - Add `orderHistory` JSONB field to log changes (e.g., `{ timestamp, userId, oldStatus, newStatus }`).
    - For deletions, soft-delete (add `deletedAt` column) instead of hard delete.

- **Performance**:
  - Current: `getAllOrders()` fetches all; pagination exists but not always used.
  - Hardening:
    - Enforce pagination (default limit 50) and indexing on `orders` (e.g., on `status`, `dealerId`, `createdAt`).
    - Cache frequent queries (e.g., dashboard metrics) with Redis (add `ioredis` dependency).

### Implementation Priority
1. Add transaction wrapping to critical updates (high impact, low effort).
2. Enhance validation and error handling (essential for robustness).
3. Implement audit logging (for compliance in internal use).

## 2. Hardening the Alert System

The alert system (`server/alert-checker.ts`, routes in `routes.ts`) polls for issues like overdue payments, stuck orders, and low stock. It's scheduled in `index.ts`. For production reliability:

### Key Vulnerabilities and Fixes
- **Idempotency and Duplicates**:
  - Current: Checks for existing alerts before creation, but race conditions could create duplicates during concurrent runs.
  - Hardening:
    - Use unique constraints on alerts (e.g., composite key: `relatedOrderId + type + resolved=false` in schema).
    - In `checkPaymentOverdueAlerts`, use UPSERT or check within a transaction.

- **Scheduling Reliability**:
  - Current: `setInterval` in `index.ts` (every 1 hour?); no persistence if server restarts.
  - Hardening:
    - Replace with cron job (e.g., `node-cron`): `cron.schedule('0 * * * *', checkAllAlerts);` for hourly runs.
    - Add retry logic (exponential backoff) for failed checks; log to file/database.
    - Run as separate process (e.g., PM2 cluster) to isolate from API server.

- **Alert Accuracy**:
  - Current: Logic in `alert-checker.ts` uses simple date diffs; no business rules (e.g., weekends/holidays).
  - Hardening:
    - Integrate `date-fns` for working days calculation in overdue checks.
    - Add configurable thresholds via `applicationSettings` table (e.g., payment due days).
    - Auto-resolve logic (`resolveCompletedPaymentAlerts`) should run after every status/payment update, not just scheduled.

- **Notification Delivery**:
  - Current: Alerts stored in DB, displayed in UI; no external notifications.
  - Hardening:
    - Integrate email/SMS (e.g., Nodemailer for SMTP, Twilio for SMS) on high-priority alert creation.
    - WebSocket (add `ws` or Socket.io) for real-time push to connected users.

- **Scalability**:
  - Current: Fetches all orders/materials each run; inefficient for large datasets.
  - Hardening:
    - Use indexed queries and limit fetches (e.g., only orders updated since last check via `updatedAt > lastRun`).
    - Track last run time in DB to resume on restart.

### Implementation Priority
1. Switch to cron jobs with retries (prevents missed alerts).
2. Add unique constraints and idempotency (avoids spam).
3. Integrate notifications (critical for "rock hard" monitoring).

## 3. General Robustness Suggestions Across the App

To ensure overall stability for production:

- **Error Handling and Logging**:
  - Add global error handler in `index.ts`: Catch unhandled rejections/emissions.
  - Integrate Winston/Pino for structured logging (file + console); rotate logs.
  - Sentry for error monitoring (add `@sentry/node` and `@sentry/react`).

- **Security**:
  - Enable HTTPS with self-signed certs for internal LAN (or Let's Encrypt if domain available).
  - Strengthen auth: Enforce 2FA (e.g., speakeasy), rotate JWT secrets periodically.
  - Rate limiting: Already in place for auth; extend to all routes with `express-rate-limit`.
  - Secrets: Use `.env` with `dotenv`; never commit. For LAN, store in secure vault or encrypted file.

- **Performance and Monitoring**:
  - Add health checks: `/health` endpoint for uptime, DB connection.
  - Database: Use connection pooling (already in Drizzle); monitor queries with pgBadger.
  - Frontend: Bundle analysis with Vite; lazy-load routes.

- **Testing**:
  - Add unit tests (Jest for backend, RTL for frontend): Cover order/alert logic.
  - Integration: Test API endpoints with Supertest.
  - E2E: Cypress for user flows (login → create order → alert).

- **Backup and Recovery**:
  - DB: Daily pg_dump backups; store off-server.
  - App: Git for code; reproducible builds.

- **Dependencies**:
  - Run `npm audit fix`; update critical deps (e.g., express to latest patch).
  - Lockfile: Use `package-lock.json`; audit in CI.

These changes will make the app more resilient, especially for order/alert focus.

## 4. Deployment Guide for Internal Company LAN

Since this is your first internal LAN deployment (vs. cloud), assume a Linux server (e.g., Ubuntu on VM/physical machine) on the company network. No public internet exposure needed. Total setup time: 2-4 hours.

### Prerequisites
- Server: Linux (Ubuntu 22.04+), 4GB RAM, 2 CPU, 50GB SSD.
- Network: Static IP (e.g., 192.168.1.100), firewall (ufw), domain (internal DNS or hosts file).
- Tools: Git, Node.js 20+, PostgreSQL 15+, Nginx 1.18+.
- Access: SSH to server; admin rights for ports 80/443, 5432 (DB).

### Step 1: Server Setup
1. Update system:
   ```
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y git curl build-essential postgresql postgresql-contrib nginx
   ```
2. Create app user:
   ```
   sudo adduser --disabled-password --gecos "" appuser
   sudo usermod -aG sudo appuser
   su - appuser
   ```
3. Install Node.js (if not pre-installed):
   ```
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   node --version  # Should be v20+
   ```

### Step 2: Database Setup (PostgreSQL Self-Hosted)
1. Start/enable PostgreSQL:
   ```
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```
2. Create DB/user:
   ```
   sudo -u postgres psql
   CREATE DATABASE kaka_hq;
   CREATE USER kaka_user WITH ENCRYPTED PASSWORD 'strong_password_here';
   GRANT ALL PRIVILEGES ON DATABASE kaka_hq TO kaka_user;
   \q
   ```
3. Configure `server/env.ts` or `.env`:
   ```
   DATABASE_URL=postgresql://kaka_user:strong_password_here@localhost:5432/kaka_hq
   ```
4. Run migrations/seed:
   ```
   cd /path/to/project
   npm run db:push  # Drizzle push schema
   node server/seed.ts  # Seed initial data
   ```

(Alternative: Use Neon for managed Postgres if LAN allows outbound; update DATABASE_URL accordingly.)

### Step 3: Application Deployment
1. Clone repo:
   ```
   git clone <your-repo> kaka-hq-monitor
   cd kaka-hq-monitor
   ```
2. Install dependencies:
   ```
   npm ci  # Clean install from lockfile
   ```
3. Build:
   ```
   npm run build
   ```
4. Environment config (`.env` in root):
   ```
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=your_very_long_random_secret_key_here
   DATABASE_URL=postgresql://...  # From Step 2
   # Add for emails if needed: SMTP_HOST, SMTP_USER, etc.
   ```
5. Process manager (PM2 for Node.js):
   ```
   sudo npm install -g pm2
   pm2 start ecosystem.config.js  # Create config below
   pm2 startup  # Auto-start on boot
   pm2 save
   ```
   Create `ecosystem.config.js`:
   ```javascript
   module.exports = {
     apps: [{
       name: 'kaka-hq-backend',
       script: 'dist/index.js',
       instances: 1,
       exec_mode: 'fork',
       env: { NODE_ENV: 'production' },
       error_file: './logs/err.log',
       out_file: './logs/out.log',
       log_file: './logs/combined.log'
     }]
   };
   ```
   For frontend: Serve static files from `dist/public` via Nginx (Step 4).

### Step 4: Web Server and Reverse Proxy (Nginx)
1. Configure Nginx (`/etc/nginx/sites-available/kaka-hq`):
   ```
   server {
     listen 80;
     server_name internal-kaka.company.lan;  # Or IP

     # Frontend static files
     location / {
       root /path/to/project/dist/public;
       try_files $uri /index.html;
     }

     # Backend API
     location /api/ {
       proxy_pass http://localhost:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_cache_bypass $http_upgrade;
     }

     # Static assets
     location /images/ {
       alias /path/to/project/server/images/;
     }
   }
   ```
2. Enable site:
   ```
   sudo ln -s /etc/nginx/sites-available/kaka-hq /etc/nginx/sites-enabled/
   sudo nginx -t  # Test config
   sudo systemctl restart nginx
   sudo systemctl enable nginx
   ```
3. HTTPS (self-signed for internal):
   ```
   sudo apt install certbot  # If external CA; else manual
   # Manual self-signed:
   openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/ssl/private/kaka.key -out /etc/ssl/certs/kaka.crt
   ```
   Update Nginx: `listen 443 ssl; ssl_certificate ...;`

### Step 5: Security and Firewall
1. Firewall (ufw):
   ```
   sudo ufw allow 22/tcp  # SSH
   sudo ufw allow 80/tcp  # HTTP
   sudo ufw allow 443/tcp # HTTPS
   sudo ufw enable
   sudo ufw status
   ```
   Restrict to LAN IPs: `sudo ufw allow from 192.168.1.0/24 to any port 80,443`
2. SELinux/AppArmor: Disable if issues (dev mode); enable in prod with profiles.
3. Monitoring: Install `htop`, `fail2ban` for brute-force protection.

### Step 6: Testing and Go-Live
1. Local test: `curl http://server-ip` (should serve index.html).
2. DB connectivity: From app server, `psql -h localhost -U kaka_user -d kaka_hq`.
3. Full test: Login, create order, check alerts.
4. Backup script: Cron job for pg_dump: `0 2 * * * pg_dump kaka_hq > /backups/db-$(date +%Y%m%d).sql`
5. Monitoring: Add Prometheus/Grafana or simple uptime script.

### Troubleshooting
- Port conflicts: Check `netstat -tuln | grep 3000`.
- DB errors: Logs in `/var/log/postgresql/`.
- PM2 issues: `pm2 logs`, `pm2 monit`.
- For LAN access: Update internal DNS or use `/etc/hosts` on clients.

This setup ensures a secure, reliable internal deployment. For cloud migration later, adapt to container orchestration platforms.

## 5. Updated Documentation Notes
- Append to `docs/current-state-review.md`: Add sections on hardening (link to this doc) and deployment summary.
- Create `README.md` production section with quick-start commands.

Contact for questions during setup.