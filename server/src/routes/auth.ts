import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { DatabaseService } from '../db/database.js';
import { AuthenticatedRequest, authenticateToken, generateToken } from '../middleware/auth.js';

export function createAuthRouter(db: DatabaseService): Router {
  const router = Router();

  // Register
  router.post('/register', async (req, res) => {
    try {
      const { name, email, password, campus, phone } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email and password are required.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const existing = db.queryOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userId = crypto.randomUUID();
      const userCampus = campus?.trim() || 'Central Campus';
      const userAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`;

      db.run(
        `INSERT INTO users (id, name, email, password_hash, campus, phone, avatar, role)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'student')`,
        [userId, name.trim(), cleanEmail, passwordHash, userCampus, phone || null, userAvatar]
      );

      const user = {
        id: userId,
        name: name.trim(),
        email: cleanEmail,
        campus: userCampus,
        avatar: userAvatar,
        role: 'student'
      };

      const token = generateToken(user);

      // Create welcome notification
      db.run(
        `INSERT INTO notifications (id, user_id, type, title, message, link_url, is_read)
         VALUES (?, ?, 'WELCOME', 'Welcome to FindIt AI!', 'Explore campus lost & found items or report a lost item to get started.', '/dashboard', 0)`,
        [crypto.randomUUID(), userId]
      );

      return res.status(201).json({
        message: 'Registration successful',
        user,
        token
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      return res.status(500).json({ error: 'Internal server error during registration.' });
    }
  });

  // Login
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const user = db.queryOne<any>('SELECT * FROM users WHERE email = ?', [cleanEmail]);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      const userObj = {
        id: user.id,
        name: user.name,
        email: user.email,
        campus: user.campus,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role
      };

      const token = generateToken(userObj);

      return res.json({
        message: 'Login successful',
        user: userObj,
        token
      });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Internal server error during login.' });
    }
  });

  // Get current user profile
  router.get('/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const user = db.queryOne<any>('SELECT id, name, email, campus, phone, avatar, role, created_at FROM users WHERE id = ?', [req.user!.id]);
      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
      return res.json({ user });
    } catch (err: any) {
      console.error('Fetch profile error:', err);
      return res.status(500).json({ error: 'Internal server error fetching profile.' });
    }
  });

  // Update profile
  router.put('/profile', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
    try {
      const { name, campus, phone, avatar } = req.body;
      const userId = req.user!.id;

      const existing = db.queryOne('SELECT id FROM users WHERE id = ?', [userId]);
      if (!existing) {
        return res.status(404).json({ error: 'User not found.' });
      }

      db.run(
        `UPDATE users 
         SET name = COALESCE(?, name),
             campus = COALESCE(?, campus),
             phone = COALESCE(?, phone),
             avatar = COALESCE(?, avatar),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name || null, campus || null, phone || null, avatar || null, userId]
      );

      const updated = db.queryOne('SELECT id, name, email, campus, phone, avatar, role FROM users WHERE id = ?', [userId]);
      return res.json({
        message: 'Profile updated successfully',
        user: updated
      });
    } catch (err: any) {
      console.error('Update profile error:', err);
      return res.status(500).json({ error: 'Internal server error updating profile.' });
    }
  });

  // Forgot password
  router.post('/forgot-password', (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    // Return friendly reassurance without exposing user enumeration
    return res.json({
      message: 'If an account exists with this campus email, password reset instructions have been dispatched.'
    });
  });

  return router;
}
