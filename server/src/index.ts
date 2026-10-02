import { app } from './app.js';

const PORT = process.env.PORT || 5000;

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

// Export configured Express application for Vercel execution
export { app };
export default app;

// Only start standalone HTTP server when running in local development (not on Vercel)
if (!process.env.VERCEL) {
  startServer();
}
