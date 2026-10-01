import { Request, Response, NextFunction } from 'express';
import { verifySupabaseToken, isSupabaseServerConfigured } from '../services/supabase.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  campus?: string;
  role?: string;
  avatar?: string;
  phone?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

/**
 * Strict authentication middleware:
 * Validates the Supabase access token in the Authorization header.
 * Attaches the authenticated user identity (auth.users.id) to req.user.
 */
export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No authentication token provided.' });
  }

  const supabaseUser = await verifySupabaseToken(token);
  if (!supabaseUser) {
    return res.status(401).json({ error: 'Invalid or expired authentication session. Please log in again.' });
  }

  req.user = supabaseUser;
  return next();
}

/**
 * Optional authentication middleware:
 * Attaches authenticated user if a valid Supabase token is provided,
 * otherwise continues without blocking.
 */
export async function optionalAuthenticateToken(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  const supabaseUser = await verifySupabaseToken(token);
  if (supabaseUser) {
    req.user = supabaseUser;
  }

  return next();
}/**
 * Strict administrator authorization middleware:
 * Enforces that the authenticated user possesses verified server-side admin role.
 * User ID is verified via Supabase Auth session, and role is determined strictly
 * by server-side verification (app_metadata / ADMIN_EMAILS / profiles.role).
 */
export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Access denied. Authentication required.' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access forbidden. Administrator privileges required.' });
  }

  return next();
}
