import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { type User } from '@shared/schema';
import { db } from './db';
import { revokedTokens } from '@shared/schema';
import { eq } from 'drizzle-orm';

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;

if (!JWT_SECRET || !REFRESH_SECRET) {
  throw new Error('JWT_SECRET and REFRESH_SECRET environment variables must be set');
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  jti?: string;
}

export interface RefreshPayload {
  userId: string;
  email: string;
  jti: string;
}

export function generateAccessToken(user: User): string {
  const jti = randomUUID();
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      jti
    },
    JWT_SECRET!,
    { expiresIn: '30m' }
  );
}

export function generateRefreshToken(user: User): string {
  const jti = randomUUID();
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      jti
    },
    REFRESH_SECRET!,
    { expiresIn: '30d' }
  );
}

export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const payload = jwt.verify(token, JWT_SECRET!) as JWTPayload;

    // Check if token is revoked
    if (payload.jti) {
      const [revoked] = await db
        .select()
        .from(revokedTokens)
        .where(eq(revokedTokens.jti, payload.jti))
        .limit(1);

      if (revoked) {
        return null;
      }
    }

    return payload;
  } catch (error) {
    return null;
  }
}

export async function verifyRefreshToken(token: string): Promise<RefreshPayload | null> {
  try {
    const payload = jwt.verify(token, REFRESH_SECRET!) as RefreshPayload;

    // Check if token is revoked
    const [revoked] = await db
      .select()
      .from(revokedTokens)
      .where(eq(revokedTokens.jti, payload.jti))
      .limit(1);

    if (revoked) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

export async function revokeToken(jti: string, userId: string, tokenType: 'access' | 'refresh', reason?: string): Promise<void> {
  // Calculate expiration based on token type
  const expiresAt = tokenType === 'access'
    ? new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await db.insert(revokedTokens).values({
    jti,
    userId,
    tokenType,
    expiresAt,
    reason: reason || 'revoked'
  });

  // Log the revocation
  console.log(`[AUTH AUDIT] Token revoked - User: ${userId}, JTI: ${jti}, Type: ${tokenType}, Reason: ${reason || 'revoked'}`);
}

// Audit logging function
export function logAuthEvent(event: string, userId?: string, details?: Record<string, any>): void {
  const timestamp = new Date().toISOString();
  console.log(`[AUTH AUDIT] ${timestamp} - ${event}${userId ? ` - User: ${userId}` : ''}`, details || '');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  
  return parts[1];
}