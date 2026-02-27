import { createPool } from './shared/persistence/db.js';
import { runMigrations } from './shared/persistence/migrate.js';
import { buildApp } from './app.js';
import { config } from './shared/kernel/config.js';
import { logInfo } from './shared/kernel/logger.js';

const pool = createPool();

const app = buildApp({ pool });

app.listen(config.port, () => {
  const connectionString = process.env.DATABASE_URL || '';
  let dbMeta = { hostname: null, database: null, username: null, sslmode: null };
  try {
    const u = new URL(connectionString);
    dbMeta = {
      hostname: u.hostname || null,
      database: (u.pathname || '').replace(/^\//, '') || null,
      username: u.username || null,
      sslmode: u.searchParams.get('sslmode')
    };
  } catch {
  }

  logInfo('server_started', { port: config.port, nodeEnv: config.nodeEnv, db: dbMeta });
  
  // Run migrations after server starts (non-blocking)
  setTimeout(async () => {
    try {
      await runMigrations(pool);
    } catch (e) {
      console.error('Migration failed (non-fatal):', e);
      // Continue running even if migrations fail
    }
  }, 1000);
});
