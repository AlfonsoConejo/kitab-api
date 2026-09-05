import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';

// Genera un JWT de acceso ligado a un usuario y a una sesión concreta.
export function generateAccessToken(userId: number, sessionId: number): string {
  const expiresIn = (process.env.JWT_ACCESS_EXPIRY || '15m') as SignOptions['expiresIn'];

  return jwt.sign(
    { id: userId, sid: sessionId },
    process.env.JWT_ACCESS_SECRET!,
    { expiresIn },
  );
}

// Genera un refresh token aleatorio que se almacenará únicamente como hash.
export function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

// Calcula el hash SHA-256 que se persiste para un refresh token.
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
