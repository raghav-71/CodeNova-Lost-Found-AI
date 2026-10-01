import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createAuthRouter } from './routes/auth.js';
import { createItemsRouter } from './routes/items.js';
import { createClaimsRouter } from './routes/claims.js';
import { createNotificationsRouter } from './routes/notifications.js';
import { createStatsRouter } from './routes/stats.js';

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

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like health checks, server-to-server, mobile native calls)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || (!isProduction && origin.includes('localhost'))) {
      return callback(null, true);
    }
    
    // Optionally allow Vercel preview domains if enabled
    if (origin.endsWith('.vercel.app') && process.env.ALLOW_VERCEL_PREVIEWS === 'true') {
      return callback(null, true);
    }
    
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads directory
const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

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
      stats: '/api/stats'
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

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    error: 'Something went wrong on the server. Please try again.',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

async function startServer() {
  try {
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 FindIt AI Server running on http://localhost:${PORT}`);
      console.log(`🔐 Supabase Auth & PostgreSQL Data Layer Active`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('Failed to start FindIt AI server:', error);
    process.exit(1);
  }
}

startServer();
