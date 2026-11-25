import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import {
  addAdminSession,
  getStoredAdminAuth,
  hasValidAdminSession,
  removeAdminSession,
  setStoredAdminAuthIfUnset,
} from './runtimeStore';

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getAuthConfigurationStatus(): {
  envConfigured: boolean;
  claimed: boolean;
} {
  const envPass = (process.env.ADMIN_PASSCODE || '').trim();
  const auth = getStoredAdminAuth();
  return {
    envConfigured: envPass.length > 0,
    claimed: Boolean(auth),
  };
}

export function claimInitialAdminPassword(password: string): boolean {
  const status = getAuthConfigurationStatus();
  if (status.envConfigured || status.claimed) {
    return false;
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const now = new Date().toISOString();
  return setStoredAdminAuthIfUnset({ passwordHash, salt, updatedAt: now });
}

export function verifyAdminPassword(password: string): boolean {
  const envPass = (process.env.ADMIN_PASSCODE || '').trim();
  if (envPass.length > 0) {
    const a = Buffer.from(password, 'utf8');
    const b = Buffer.from(envPass, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  const row = getStoredAdminAuth();
  if (!row) return false;

  const candidate = Buffer.from(hashPassword(password, row.salt), 'hex');
  const stored = Buffer.from(row.passwordHash, 'hex');
  if (candidate.length !== stored.length) return false;
  return crypto.timingSafeEqual(candidate, stored);
}

export function issueAdminSession(): string {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  addAdminSession({
    tokenHash,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  });

  return rawToken;
}

export function verifySessionToken(rawToken: string | undefined): boolean {
  if (!rawToken || rawToken.length < 16) return false;
  return hasValidAdminSession(hashToken(rawToken));
}

export function revokeSessionToken(rawToken: string | undefined): void {
  if (!rawToken) return;
  removeAdminSession(hashToken(rawToken));
}

export function extractBearerToken(req: Request): string | undefined {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return undefined;
  return auth.slice(7).trim();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = extractBearerToken(req);
  if (!verifySessionToken(token)) {
    res.status(401).json({ error: 'Unauthorized. Valid administrator session required.' });
    return;
  }
  next();
}

const RECEIPT_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

export function signOrderReceipt(orderId: string): string {
  return crypto.createHmac('sha256', RECEIPT_SECRET).update(orderId).digest('hex');
}

export function verifyOrderReceipt(orderId: string, proof: string): boolean {
  if (!orderId || !proof || typeof proof !== 'string') return false;
  const expected = Buffer.from(signOrderReceipt(orderId), 'utf8');
  const candidate = Buffer.from(proof.trim(), 'utf8');
  if (expected.length !== candidate.length) return false;
  return crypto.timingSafeEqual(expected, candidate);
}
