import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader, type JWTPayload } from './auth';
import { storage } from './storage';
import { auditLogger, getClientIP } from './logger';
import { insertAuditLogSchema } from '@shared/schema';
import diff from 'deep-diff';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const token = extractTokenFromHeader(req.headers.authorization);

  if (!token) {
    console.log('No token in request');
    return res.status(401).json({ error: 'Access token required' });
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    console.log('Token verification failed for token:', token.substring(0, 20) + '...');
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = payload;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

// Audit logging function
export async function logAuditEvent(
  req: Request,
  action: string,
  entityType: string,
  entityId?: string,
  oldValues?: Record<string, unknown>,
  newValues?: Record<string, unknown>
) {
  try {
    const userId = req.user?.userId;
    const ipAddress = getClientIP(req);
    const sessionId = req.user?.jti;

    // Compute diff if both old and new values provided
    let changesDiff = null;
    if (oldValues && newValues) {
      const differences = diff(oldValues, newValues);
      if (differences) {
        changesDiff = differences;
      }
    }

    const auditData = insertAuditLogSchema.parse({
      userId,
      action,
      entityType,
      entityId,
      ipAddress,
      oldValues,
      newValues,
      changesDiff,
      sessionId
    });

    // Log to database
    await storage.createAuditLog(auditData);

    // Log to Winston
    auditLogger.log(`Audit: ${action}`, {
      userId,
      action,
      entityType,
      entityId,
      ipAddress,
      sessionId,
      changesDiff: changesDiff ? JSON.stringify(changesDiff) : null
    });

  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging failure shouldn't break the main operation
  }
}