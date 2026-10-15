import { createPool, closePool, initializeSchema } from './db.mjs';

const pool = createPool();
try { await initializeSchema(pool); console.log('TRACE//FIN PostgreSQL schema is ready.'); }
finally { await closePool(pool); }
