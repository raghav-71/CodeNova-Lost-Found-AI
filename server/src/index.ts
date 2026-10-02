import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createAuthRouter } from './routes/auth.js';
import { createItemsRouter } from './routes/items.js';
import { createClaimsRouter } from './routes/claims.js';
import { createNotificationsRouter } from './routes/notifications.js';
import { createStatsRouter } from './routes/stats.js';
import { createAdminRouter } from './routes/admin.js';
import { createAiRouter } from './routes/ai.js';
import { generalLimiter } from './middleware/rateLimiters.js';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const rawAllowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean)
  : [CLIENT_URL];

// In development, also allow local Vite dev server ports; in production, strictly enforce allowed origins
const allowedOrigins = isProduction
  ? rawAllowedOrigins
  : [...new Set([...rawAllowedOrigins, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'])];

// Hide server identification
app.disable('x-powered-by');

// 1. Security Headers Middleware (Helmet)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:', 'http:'],
      connectSrc: ["'self'", 'https:', 'http:', 'ws:', 'wss:'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: isProduction ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// 2. Strict Production CORS Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests without origin (health checks, server-to-server)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || (!isProduction && origin.includes('localhost'))) {
      return callback(null, true);
    }
    
    // Optionally allow Vercel preview domains if explicitly configured
    if (origin.endsWith('.vercel.app') && process.env.ALLOW_VERCEL_PREVIEWS === 'true') {
      return callback(null, true);
    }
    
    // Reject unauthorized cross-origin request gracefully without exposing server stack
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 3. Request Payload Size Limits
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// 4. Rate Limiting on API endpoints
app.use('/api', generalLimiter);

// Static uploads directory (safe read-only serving)
const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir, {
  dotfiles: 'ignore',
  etag: true,
  index: false,
  maxAge: '1d'
}));

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    message: '🚀 FindIt AI Backend API Server is running.',
    frontendApp: CLIENT_URL,
    healthCheck: '/api/health',
    endpoints: {
      auth: '/api/auth',
      items: '/api/items',
      claims: '/api/claims',
      notifications: '/api/notifications',
      stats: '/api/stats',
      admin: '/api/admin',
      ai: '/api/ai'
    }
  });
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    product: 'FindIt AI — Lost & Found',
    version: '1.0.0',
    authSystem: 'Supabase Authentication',
    timestamp: new Date().toISOString()
  });
});

// Register API routers
app.use('/api/auth', createAuthRouter());
app.use('/api/items', createItemsRouter());
app.use('/api/claims', createClaimsRouter());
app.use('/api/notifications', createNotificationsRouter());
app.use('/api/stats', createStatsRouter());
app.use('/api/admin', createAdminRouter());
app.use('/api/ai', createAiRouter());

// 5. Global Production Error Handler (Debug mode off in production)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server error occurred:', isProduction ? err.message : err);
  
  if (err.message && err.message.includes('Only JPEG, PNG, and WebP')) {
    return res.status(400).json({ error: err.message });
  }

  return res.status(500).json({
    error: 'An unexpected error occurred. Please try again later.'
  });
});

async function startServer() {
  try {
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 FindIt AI Server running on http://localhost:${PORT}`);
      console.log(`🔐 Supabase Auth & PostgreSQL Data Layer Active`);
      console.log(`🛡️  Security Headers & Rate Limiting Enabled`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('Failed to start FindIt AI server:', error);
    process.exit(1);
  }
}

startServer();
