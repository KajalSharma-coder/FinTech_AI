import assert from 'node:assert/strict';
import test from 'node:test';
import { getDatabaseConfig, initializeSchema } from '../backend/db.mjs';
import { synchronizeWorkspace, validateWorkspaceState } from '../backend/state.mjs';

const emptyState = { importedAdvertisements: [], investigations: [], evidence: [], alerts: [], advertisementStatuses: {} };

test('PostgreSQL configuration accepts DATABASE_URL without exposing credentials', () => {
  assert.deepEqual(getDatabaseConfig({ DATABASE_URL: 'postgresql://user:secret@localhost/db' }), { connectionString: 'postgresql://user:secret@localhost/db' });
  assert.throws(() => getDatabaseConfig({}), /DATABASE_URL|PGHOST/);
});

test('workspace validation preserves empty collections and rejects malformed state', () => {
  assert.equal(validateWorkspaceState(emptyState), true);
  assert.equal(validateWorkspaceState({ ...emptyState, advertisementStatuses: { ad1: 'invalid' } }), false);
  assert.equal(validateWorkspaceState({ ...emptyState, investigations: [{ title: 'missing id' }] }), false);
});

test('schema initialization issues one PostgreSQL DDL query', async () => {
  const queries: string[] = [];
  await initializeSchema({ query: async (sql: string) => { queries.push(sql); return { rowCount: 0, rows: [] }; } });
  assert.equal(queries.length, 1);
  assert.match(queries[0], /CREATE TABLE IF NOT EXISTS imported_advertisements/);
  assert.match(queries[0], /CREATE INDEX IF NOT EXISTS/);
});

test('workspace synchronization is transactional and parameterized', async () => {
  const queries: { sql: string; params?: unknown[] }[] = [];
  const client = {
    query: async (sql: string, params?: unknown[]) => { queries.push({ sql, params }); return { rowCount: 0, rows: [] }; },
    release: () => undefined,
  };
  await synchronizeWorkspace({ connect: async () => client } as never, emptyState);
  assert.equal(queries[0].sql, 'BEGIN');
  assert.ok(queries.some(item => item.sql === 'COMMIT'));
  assert.ok(queries.every(item => !item.sql.includes('tracefin')));
  assert.deepEqual(queries.at(-1)?.sql, 'COMMIT');
});

test('synchronization rolls back and releases the client on database errors', async () => {
  const calls: string[] = [];
  const client = {
    query: async (sql: string) => { calls.push(sql); if (sql === 'BEGIN') return { rowCount: 0, rows: [] }; throw new Error('db failure'); },
    release: () => calls.push('RELEASE'),
  };
  await assert.rejects(() => synchronizeWorkspace({ connect: async () => client } as never, emptyState), /db failure/);
  assert.ok(calls.includes('ROLLBACK'));
  assert.ok(calls.includes('RELEASE'));
});
