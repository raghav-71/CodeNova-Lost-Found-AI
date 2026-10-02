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

startServer();
