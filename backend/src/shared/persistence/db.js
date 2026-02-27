import pg from 'pg';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required');
  }

  const hostname = (() => {
    try {
      return new URL(connectionString).hostname;
    } catch {
      return null;
    }
  })();

  const isLocalDb = hostname === 'localhost' || hostname === '127.0.0.1';
  const shouldUseSsl = process.env.DATABASE_SSL === 'true' || (hostname ? !isLocalDb : process.env.NODE_ENV === 'production');

  return new Pool({
    connectionString,
    ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
    keepAlive: true,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    max: 10
  });
}
