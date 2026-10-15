import pg from 'pg';

const { Pool } = pg;

export function getDatabaseConfig(env = process.env) {
  if (env.DATABASE_URL) return { connectionString: env.DATABASE_URL };
  const required = ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD'];
  const missing = required.filter(key => !env[key]);
  if (missing.length) throw new Error(`PostgreSQL configuration is missing: ${missing.join(', ')}. Set DATABASE_URL or all PG* variables.`);
  return { host: env.PGHOST, port: Number(env.PGPORT), database: env.PGDATABASE, user: env.PGUSER, password: env.PGPASSWORD };
}

export function createPool(env = process.env) {
  return new Pool({ ...getDatabaseConfig(env), max: 10, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000 });
}

export async function initializeSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS workspace_meta (id SMALLINT PRIMARY KEY CHECK (id = 1), updated_at TIMESTAMPTZ NOT NULL);
    CREATE TABLE IF NOT EXISTS imported_advertisements (id TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL);
    CREATE TABLE IF NOT EXISTS investigations (id TEXT PRIMARY KEY, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL);
    CREATE TABLE IF NOT EXISTS investigation_advertisements (
      investigation_id TEXT NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
      advertisement_id TEXT NOT NULL,
      PRIMARY KEY (investigation_id, advertisement_id)
    );
    CREATE TABLE IF NOT EXISTS evidence (id TEXT PRIMARY KEY, advertisement_id TEXT NOT NULL, investigation_id TEXT, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL);
    CREATE TABLE IF NOT EXISTS alerts (id TEXT PRIMARY KEY, investigation_id TEXT, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL);
    CREATE TABLE IF NOT EXISTS advertisement_status_overrides (advertisement_id TEXT PRIMARY KEY, status TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_evidence_advertisement_id ON evidence(advertisement_id);
    CREATE INDEX IF NOT EXISTS idx_evidence_investigation_id ON evidence(investigation_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_investigation_id ON alerts(investigation_id);
  `);
}

export async function closePool(pool) { await pool.end(); }
