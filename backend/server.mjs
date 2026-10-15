import { createServer } from 'node:http';
import { createPool, closePool, initializeSchema } from './db.mjs';
import { readWorkspace, synchronizeWorkspace, validateWorkspaceState } from './state.mjs';

const PORT = Number(process.env.API_PORT || 4000);
const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:5173', 'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
};

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 5 * 1024 * 1024) throw new Error('Request body exceeds 5 MB limit.');
  }
  return JSON.parse(raw || '{}');
}

let pool;
try {
  pool = createPool();
  await initializeSchema(pool);
} catch (error) {
  console.error(`TRACE//FIN PostgreSQL startup failed: ${error instanceof Error ? error.message : error}`);
  if (pool) await closePool(pool).catch(() => undefined);
  process.exit(1);
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/api/health' && req.method === 'GET') {
    try { await pool.query('SELECT 1'); return send(res, 200, { ok: true, databaseConnected: true, service: 'TRACE//FIN API', database: 'postgresql', timestamp: new Date().toISOString() }); }
    catch { return send(res, 503, { ok: false, databaseConnected: false, service: 'TRACE//FIN API', database: 'postgresql', timestamp: new Date().toISOString() }); }
  }
  if (url.pathname === '/api/state' && req.method === 'GET') {
    try { return send(res, 200, await readWorkspace(pool)); }
    catch (error) { return send(res, 503, { error: error instanceof Error ? error.message : 'Database read failed.' }); }
  }
  if (url.pathname === '/api/state' && req.method === 'PUT') {
    let body;
    try { body = await readBody(req); } catch (error) { return send(res, 400, { error: error instanceof Error ? error.message : 'Invalid JSON body.' }); }
    if (!validateWorkspaceState(body.state)) return send(res, 400, { error: 'Invalid workspace state schema.' });
    try { return send(res, 200, { ok: true, updatedAt: await synchronizeWorkspace(pool, body.state) }); }
    catch (error) { return send(res, 503, { error: error instanceof Error ? error.message : 'Database transaction failed.' }); }
  }
  return send(res, 404, { error: 'Endpoint not found.' });
});

server.on('error', async (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`TRACE//FIN API could not start: port ${PORT} is already in use. Stop the existing backend process or set a different API_PORT in .env.`);
  } else {
    console.error(`TRACE//FIN API server error: ${error instanceof Error ? error.message : error}`);
  }
  if (pool) await closePool(pool).catch(() => undefined);
  process.exit(1);
});

server.listen(PORT, () => console.log(`TRACE//FIN API listening on http://localhost:${PORT}`));

async function shutdown() { server.close(); if (pool) await closePool(pool); process.exit(0); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
