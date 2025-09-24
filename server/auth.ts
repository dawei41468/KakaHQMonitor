import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { type User } from '@shared/schema';

const JWT_SECRET = process.env.JWT_SECRET || 'kaka-hq-dev-secret-change-in-production';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'kaka-hq-refresh-secret-change-in-production';

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export function generateAccessToken(user: User): string {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '30m' }
  );
}

export function generateRefreshToken(user: User): string {
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email 
    },
    REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

export function verifyRefreshToken(token: string): { userId: string; email: string } | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as { userId: string; email: string };
  } catch (error) {
    return null;
  }
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