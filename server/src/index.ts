import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/database.js';
import { seedDatabase } from './db/seed.js';
import { createAuthRouter } from './routes/auth.js';
import { createItemsRouter } from './routes/items.js';
import { createClaimsRouter } from './routes/claims.js';
import { createNotificationsRouter } from './routes/notifications.js';
import { createStatsRouter } from './routes/stats.js';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads directory
const uploadDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    product: 'FindIt AI — Lost & Found',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

async function startServer() {
  try {
    const db = await initDatabase();
    console.log('Database initialized successfully.');

    // Auto-seed if database is empty
    const userCount = db.queryOne<{ count: number }>('SELECT COUNT(*) as count FROM users')?.count || 0;
    if (userCount === 0) {
      console.log('Empty database detected. Running seed data...');
      await seedDatabase(db);
    }

    // Register API routers
    app.use('/api/auth', createAuthRouter(db));
    app.use('/api/items', createItemsRouter(db));
    app.use('/api/claims', createClaimsRouter(db));
    app.use('/api/notifications', createNotificationsRouter(db));
    app.use('/api/stats', createStatsRouter(db));

    // Global Error Handler
    app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('Unhandled server error:', err);
      res.status(500).json({
        error: 'Something went wrong on the server. Please try again.',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    });

    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`🚀 FindIt AI Server running on http://localhost:${PORT}`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('Failed to start FindIt AI server:', error);
    process.exit(1);
  }
}

startServer();
