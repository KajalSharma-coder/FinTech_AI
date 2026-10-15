import { initializeSchema } from './db.mjs';

const ALLOWED_STATUSES = new Set(['flagged', 'under_review', 'confirmed_threat', 'dismissed']);

function recordArray(value, requiredFields = []) {
  if (!Array.isArray(value)) return false;
  const ids = new Set();
  return value.every(item => {
    if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !item.id.trim() || ids.has(item.id)) return false;
    if (!requiredFields.every(field => typeof item[field] === 'string' && item[field].trim())) return false;
    ids.add(item.id);
    return true;
  });
}

export function validateWorkspaceState(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const state = value;
  if (!recordArray(state.importedAdvertisements) || !recordArray(state.investigations) || !recordArray(state.evidence, ['advertisementId']) || !recordArray(state.alerts)) return false;
  if (!state.advertisementStatuses || typeof state.advertisementStatuses !== 'object' || Array.isArray(state.advertisementStatuses)) return false;
  return Object.entries(state.advertisementStatuses).every(([id, status]) => id.trim() && ALLOWED_STATUSES.has(status));
}

export async function readWorkspace(pool) {
  await initializeSchema(pool);
  const meta = await pool.query('SELECT updated_at FROM workspace_meta WHERE id = 1');
  if (meta.rowCount === 0) return { state: null, updatedAt: null };
  const [imported, investigations, evidence, alerts, statuses] = await Promise.all([
    pool.query('SELECT data FROM imported_advertisements ORDER BY updated_at DESC, id'),
    pool.query('SELECT data FROM investigations ORDER BY updated_at DESC, id'),
    pool.query('SELECT data FROM evidence ORDER BY updated_at DESC, id'),
    pool.query('SELECT data FROM alerts ORDER BY updated_at DESC, id'),
    pool.query('SELECT advertisement_id, status FROM advertisement_status_overrides ORDER BY advertisement_id'),
  ]);
  return { state: { importedAdvertisements: imported.rows.map(row => row.data), investigations: investigations.rows.map(row => row.data), evidence: evidence.rows.map(row => row.data), alerts: alerts.rows.map(row => row.data), advertisementStatuses: Object.fromEntries(statuses.rows.map(row => [row.advertisement_id, row.status])) }, updatedAt: meta.rows[0].updated_at };
}

export async function synchronizeWorkspace(pool, state) {
  if (!validateWorkspaceState(state)) throw new Error('Invalid workspace state schema.');
  const client = await pool.connect();
  const updatedAt = new Date().toISOString();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [741205]);
    for (const ad of state.importedAdvertisements) await client.query(`INSERT INTO imported_advertisements (id, data, updated_at) VALUES ($1, $2::jsonb, $3) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`, [ad.id, JSON.stringify(ad), updatedAt]);
    const investigationIds = state.investigations.map(item => item.id);
    if (investigationIds.length) await client.query('DELETE FROM investigations WHERE NOT (id = ANY($1::text[]))', [investigationIds]);
    else await client.query('DELETE FROM investigations');
    for (const investigation of state.investigations) {
      await client.query(`INSERT INTO investigations (id, data, updated_at) VALUES ($1, $2::jsonb, $3) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`, [investigation.id, JSON.stringify(investigation), updatedAt]);
      await client.query('DELETE FROM investigation_advertisements WHERE investigation_id = $1', [investigation.id]);
      for (const advertisementId of investigation.linkedAdIds ?? []) await client.query('INSERT INTO investigation_advertisements (investigation_id, advertisement_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [investigation.id, advertisementId]);
    }
    for (const record of state.evidence) await client.query(`INSERT INTO evidence (id, advertisement_id, investigation_id, data, updated_at) VALUES ($1, $2, $3, $4::jsonb, $5) ON CONFLICT (id) DO UPDATE SET advertisement_id = EXCLUDED.advertisement_id, investigation_id = EXCLUDED.investigation_id, data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`, [record.id, record.advertisementId, record.investigationId ?? null, JSON.stringify(record), updatedAt]);
    for (const alert of state.alerts) await client.query(`INSERT INTO alerts (id, investigation_id, data, updated_at) VALUES ($1, $2, $3::jsonb, $4) ON CONFLICT (id) DO UPDATE SET investigation_id = EXCLUDED.investigation_id, data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`, [alert.id, alert.investigationId ?? null, JSON.stringify(alert), updatedAt]);
    const statusIds = Object.keys(state.advertisementStatuses);
    if (statusIds.length) await client.query('DELETE FROM advertisement_status_overrides WHERE NOT (advertisement_id = ANY($1::text[]))', [statusIds]);
    else await client.query('DELETE FROM advertisement_status_overrides');
    for (const [advertisementId, status] of Object.entries(state.advertisementStatuses)) await client.query(`INSERT INTO advertisement_status_overrides (advertisement_id, status, updated_at) VALUES ($1, $2, $3) ON CONFLICT (advertisement_id) DO UPDATE SET status = EXCLUDED.status, updated_at = EXCLUDED.updated_at`, [advertisementId, status, updatedAt]);
    await client.query(`INSERT INTO workspace_meta (id, updated_at) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET updated_at = EXCLUDED.updated_at`, [updatedAt]);
    await client.query('COMMIT');
    return updatedAt;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally { client.release(); }
}
