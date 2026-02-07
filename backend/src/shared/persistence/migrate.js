import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { withTransaction } from './transaction.js';

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function parseVersion(filename) {
  const match = /^V(\d+)__.+\.sql$/i.exec(filename);
  if (!match) return null;
  return Number(match[1]);
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INT PRIMARY KEY,
      name TEXT NOT NULL,
      checksum VARCHAR(64) NOT NULL,
      applied_at TIMESTAMP NOT NULL
    )
  `);
}

async function readMigrationFiles(migrationsDir) {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => parseVersion(name) !== null)
    .sort((a, b) => parseVersion(a) - parseVersion(b));

  if (files.length === 0) {
    throw new Error(`No migration files found in ${migrationsDir}`);
  }

  return files;
}

async function getAppliedMigrations(client) {
  const res = await client.query('SELECT version, checksum FROM schema_migrations ORDER BY version ASC');
  const map = new Map();
  for (const row of res.rows) {
    map.set(Number(row.version), row.checksum);
  }
  return map;
}

async function applyMigration(client, migrationsDir, filename) {
  const fullPath = path.join(migrationsDir, filename);
  const sql = await fs.readFile(fullPath, 'utf8');
  const version = parseVersion(filename);
  const checksum = sha256(sql);

  await client.query(sql);
  await client.query(
    'INSERT INTO schema_migrations (version, name, checksum, applied_at) VALUES ($1,$2,$3,NOW())',
    [version, filename, checksum]
  );
}

export async function runMigrations(pool) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const migrationsDir = path.resolve(__dirname, '../../../migrations');

  return withTransaction(pool, async (client) => {
    await ensureMigrationsTable(client);

    const files = await readMigrationFiles(migrationsDir);
    const applied = await getAppliedMigrations(client);

    const fileVersions = new Set(files.map((f) => parseVersion(f)));
    for (const version of applied.keys()) {
      if (!fileVersions.has(version)) {
        console.warn(`Missing migration file for applied version V${version}. Skipping verification and continuing startup.`);
      }
    }

    for (const filename of files) {
      const version = parseVersion(filename);
      const sql = await fs.readFile(path.join(migrationsDir, filename), 'utf8');
      const checksum = sha256(sql);

      if (applied.has(version)) {
        const existing = applied.get(version);
        if (existing !== checksum) {
          throw new Error(`Migration checksum mismatch for ${filename}. Migrations are immutable.`);
        }
        continue;
      }

      await applyMigration(client, migrationsDir, filename);
    }

    return { appliedCount: files.filter((f) => !applied.has(parseVersion(f))).length };
  });
}

if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  const { createPool } = await import('./db.js');
  const pool = createPool();
  try {
    const res = await runMigrations(pool);
    console.log(`Migrations complete. Applied: ${res.appliedCount}`);
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error(err);
    await pool.end();
    process.exit(1);
  }
}
