import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifySupabaseToken, isSupabaseServerConfigured } from '../services/supabase.js';

const JWT_SECRET = process.env.JWT_SECRET || 'findit_jwt_super_secret_key_2026_campus_ai';

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

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No authentication token provided.' });
  }

  // 1. Try local JWT token verification
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
    return next();
  } catch (err) {
    // 2. If local verification fails, try Supabase token verification if configured
    if (isSupabaseServerConfigured) {
      const supabaseUser = await verifySupabaseToken(token);
      if (supabaseUser) {
        req.user = supabaseUser;
        return next();
      }
    }
    return res.status(403).json({ error: 'Invalid or expired authentication session.' });
  }
}

export async function optionalAuthenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
  } catch (err) {
    if (isSupabaseServerConfigured) {
      const supabaseUser = await verifySupabaseToken(token);
      if (supabaseUser) {
        req.user = supabaseUser;
      }
    }
  }
  return next();
}

export function generateToken(user: AuthenticatedUser): string {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      name: user.name, 
      campus: user.campus, 
      role: user.role || 'student',
      avatar: user.avatar,
      phone: user.phone
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}
