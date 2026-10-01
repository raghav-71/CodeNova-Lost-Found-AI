import { Router, Response, Request } from 'express';
import { supabaseDb } from '../db/supabaseDb.js';
import { AuthenticatedRequest, authenticateToken } from '../middleware/auth.js';
import { supabaseAdmin, supabasePublic, isSupabaseServerConfigured } from '../services/supabase.js';
import { validateRegister, validateLogin, sanitizeString } from '../middleware/validation.js';
import { authLimiter } from '../middleware/rateLimiters.js';

export function createAuthRouter(): Router {
  const router = Router();

  // =========================================================================
  // 1. REGISTER NEW USER (Authoritative Supabase Auth creation + confirmed)
  // =========================================================================
  router.post('/register', authLimiter, validateRegister, async (req: Request, res: Response) => {
    try {
      const { name, email, password, campus, phone } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();
      const cleanCampus = campus?.trim() || 'Central Campus';
      const cleanPhone = phone?.trim() || '';
      const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`;

      if (!isSupabaseServerConfigured) {
        return res.status(500).json({ error: 'Supabase configuration is missing. Check the required environment variables.' });
      }

      // Create permanent user in Supabase auth.users with auto-confirmed email
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: cleanName,
          college: cleanCampus,
          phone: cleanPhone,
          avatar_url: avatarUrl
        }
      });

      if (createError) {
        if (createError.message.includes('already registered') || createError.message.includes('already exists')) {
          return res.status(400).json({ error: 'An account with this campus email already exists. Please log in.' });
        }
        return res.status(400).json({ error: createError.message || 'Registration failed.' });
      }

      const createdUser = createData.user;
      if (!createdUser) {
        return res.status(500).json({ error: 'Failed to create user account.' });
      }

      // Create matching profile record (profiles.id = auth.users.id)
      const profile = await supabaseDb.upsertProfile({
        id: createdUser.id,
        full_name: cleanName,
        email: cleanEmail,
        college: cleanCampus,
        phone: cleanPhone,
        avatar_url: avatarUrl
      });

      // Sign in immediately to acquire Supabase session token
      const { data: signInData, error: signInError } = await supabasePublic.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      const token = signInData?.session?.access_token || '';

      return res.status(201).json({
        message: 'Account registered successfully.',
        token,
        user: {
          id: profile.id,
          name: profile.full_name,
          email: profile.email,
          campus: profile.college,
          phone: profile.phone,
          avatar: profile.avatar_url,
          role: 'student',
          created_at: profile.created_at
        }
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      return res.status(500).json({ error: 'Internal server error during registration.' });
    }
  });

  // =========================================================================
  // 2. LOGIN USER (Authoritative Supabase Auth signInWithPassword)
  // =========================================================================
  router.post('/login', authLimiter, validateLogin, async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const cleanEmail = email.trim().toLowerCase();

      if (!isSupabaseServerConfigured) {
        return res.status(500).json({ error: 'Supabase configuration is missing. Check the required environment variables.' });
      }

      // Attempt Supabase sign in
      let { data, error } = await supabasePublic.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      // Handle unconfirmed email edge-case by auto-confirming via Admin API
      if (error && error.message.toLowerCase().includes('email not confirmed')) {
        try {
          const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
          const existing = userList?.users?.find(u => u.email?.toLowerCase() === cleanEmail);
          if (existing) {
            await supabaseAdmin.auth.admin.updateUserById(existing.id, { email_confirm: true });
            // Retry sign in
            const retry = await supabasePublic.auth.signInWithPassword({
              email: cleanEmail,
              password
            });
            data = retry.data;
            error = retry.error;
          }
        } catch (confirmErr) {
          console.warn('Auto-confirm attempt failed:', confirmErr);
        }
      }

      if (error || !data?.session || !data?.user) {
        const msg = error?.message?.toLowerCase() || '';
        if (msg.includes('email not confirmed')) {
          return res.status(400).json({ error: 'Please verify your email before signing in.' });
        }
        if (msg.includes('rate limit') || msg.includes('too many requests')) {
          return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
        }
        return res.status(400).json({ error: 'Invalid login credentials.' });
      }

      const sessionUser = data.user;
      const token = data.session.access_token;

      // Ensure profile exists in profiles table using the exact auth.users.id
      let profile = await supabaseDb.getProfile(sessionUser.id);
      if (!profile) {
        profile = await supabaseDb.upsertProfile({
          id: sessionUser.id,
          full_name: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || 'Campus Member',
          email: sessionUser.email || cleanEmail,
          college: sessionUser.user_metadata?.college || sessionUser.user_metadata?.campus || 'Central Campus',
          phone: sessionUser.user_metadata?.phone || '',
          avatar_url: sessionUser.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${sessionUser.id}`
        });
      }

      return res.json({
        message: 'Logged in successfully.',
        token,
        user: {
          id: profile.id,
          name: profile.full_name,
          email: profile.email,
          campus: profile.college,
          phone: profile.phone,
          avatar: profile.avatar_url,
          role: 'student',
          created_at: profile.created_at
        }
      });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Internal server error during login.' });
    }
  });

  // =========================================================================
  // 3. GET CURRENT AUTHENTICATED USER (/api/auth/me)
  // =========================================================================
  router.get('/me', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = req.user!;
      let profile = await supabaseDb.getProfile(user.id);

      if (!profile) {
        // Auto-create profile record using authoritative auth.users.id
        profile = await supabaseDb.upsertProfile({
          id: user.id,
          full_name: user.name || user.email.split('@')[0] || 'Campus Member',
          email: user.email,
          college: user.campus || 'Central Campus',
          phone: user.phone || '',
          avatar_url: user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`
        });
      }

      return res.json({
        user: {
          id: profile.id,
          name: profile.full_name,
          email: profile.email,
          campus: profile.college,
          phone: profile.phone,
          avatar: profile.avatar_url,
          role: 'student',
          created_at: profile.created_at
        }
      });
    } catch (err: any) {
      console.error('Fetch profile error:', err);
      return res.status(500).json({ error: 'Internal server error fetching profile.' });
    }
  });

  // =========================================================================
  // 4. UPDATE USER PROFILE (/api/auth/profile)
  // =========================================================================
  router.put('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, campus, phone, avatar } = req.body;
      const userId = req.user!.id;

      const cleanName = name ? sanitizeString(name, 100) : undefined;
      const cleanCampus = campus ? sanitizeString(campus, 100) : undefined;
      const cleanPhone = phone ? sanitizeString(phone, 30) : undefined;
      const cleanAvatar = avatar ? sanitizeString(avatar, 500) : undefined;

      let updated = await supabaseDb.updateProfile(userId, {
        name: cleanName,
        campus: cleanCampus,
        phone: cleanPhone,
        avatar: cleanAvatar
      });

      if (!updated) {
        updated = await supabaseDb.upsertProfile({
          id: userId,
          full_name: cleanName || req.user!.name || 'Campus Member',
          email: req.user!.email,
          college: cleanCampus || req.user!.campus || 'Central Campus',
          phone: cleanPhone || req.user!.phone || '',
          avatar_url: cleanAvatar || req.user!.avatar
        });
      }

      return res.json({
        message: 'Profile updated successfully',
        user: {
          id: updated.id,
          name: updated.full_name,
          email: updated.email,
          campus: updated.college,
          phone: updated.phone,
          avatar: updated.avatar_url,
          role: req.user!.role || 'student',
          updated_at: updated.updated_at
        }
      });
    } catch (err: any) {
      console.error('Update profile error:', err);
      return res.status(500).json({ error: 'Internal server error updating profile.' });
    }
  });

  // =========================================================================
  // 5. FORGOT PASSWORD DISPATCH
  // =========================================================================
  router.post('/forgot-password', authLimiter, async (req: Request, res: Response) => {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required.' });
    }
    
    const cleanEmail = email.trim().toLowerCase().slice(0, 254);
    if (isSupabaseServerConfigured) {
      try {
        await supabasePublic.auth.resetPasswordForEmail(cleanEmail);
      } catch (e) {
        console.warn('Password reset trigger error:', e);
      }
    }

    return res.json({
      message: 'If an account exists with this campus email, password reset instructions have been dispatched.'
    });
  });

  return router;
}
