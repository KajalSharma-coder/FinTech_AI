import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import { createPool, closePool, initializeSchema } from './db.mjs';
import { synchronizeWorkspace, validateWorkspaceState } from './state.mjs';

const sqlitePath = process.env.TRACEFIN_SQLITE_PATH || 'backend/data/tracefin.sqlite';
if (!existsSync(sqlitePath)) { console.error(`SQLite database not found at ${sqlitePath}. Nothing was migrated.`); process.exit(1); }
const sqlite = new DatabaseSync(sqlitePath, { readOnly: true });
let state;
try { const row = sqlite.prepare('SELECT data FROM app_state WHERE id = 1').get(); state = row ? JSON.parse(row.data) : null; }
finally { sqlite.close(); }
if (!state) { console.log('SQLite database has no workspace state. PostgreSQL was not changed.'); process.exit(0); }
if (!validateWorkspaceState(state)) throw new Error('SQLite workspace state does not match the current schema.');
const pool = createPool();
try {
  await initializeSchema(pool);
  if ((await pool.query('SELECT 1 FROM workspace_meta WHERE id = 1')).rowCount > 0) throw new Error('PostgreSQL already contains TRACE//FIN workspace state; migration stopped without changing it.');
  await synchronizeWorkspace(pool, state);
  console.log('SQLite workspace imported into PostgreSQL. The SQLite file was read-only and preserved.');
} finally { await closePool(pool); }
