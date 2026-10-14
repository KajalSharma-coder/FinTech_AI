import test from 'node:test';
import assert from 'node:assert/strict';
import { createEvidenceRecord } from '../src/lib/evidence.ts';
import { EVIDENCE_STORAGE_VERSION, isValidEvidenceRecord, loadEvidenceState, parseEvidenceStorage, saveEvidence } from '../src/lib/storage.ts';
import type { Advertisement, EvidenceRecord } from '../src/types/index.ts';

const ad: Advertisement = {
  id: 'ad-evidence-1', title: 'Synthetic account offer', platform: 'Telegram', category: 'bank_account_sale',
  postedAt: '2026-01-01T00:00:00.000Z', detectedAt: '2026-01-01T00:00:00.000Z', content: 'Account access available.', sourceUrl: 'https://example.com/ad',
  seller: { alias: 'seller', platform: 'Telegram', joinedDate: '2025-01-01', postCount: 1, verifiedBadge: false, contactMethod: '' },
  riskScore: 80, riskLevel: 'high', riskReasons: [{ factor: 'content', weight: 8, maxWeight: 10, description: 'Suspicious account language.' }], status: 'flagged', tags: [],
};

function storage(value: string | null) {
  const values = new Map<string, string>();
  if (value !== null) values.set('tracefin_evidence_v1', value);
  (globalThis as typeof globalThis & { localStorage: Storage }).localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, next) => { values.set(key, next); },
    removeItem: key => { values.delete(key); },
    clear: () => values.clear(),
    key: index => [...values.keys()][index] ?? null,
    length: values.size,
  };
  return values;
}

test('creates a valid evidence record with provenance, risk, notes, and history', () => {
  const record = createEvidenceRecord(ad, [], 'inv-1', undefined, 'Review source context.', '2026-02-01T00:00:00.000Z');
  assert.ok(isValidEvidenceRecord(record));
  assert.equal(record.advertisementId, ad.id);
  assert.equal(record.investigationId, 'inv-1');
  assert.equal(record.investigatorNotes, 'Review source context.');
  assert.equal(record.history[0].action, 'created');
});

test('versioned persistence preserves empty collections and rejects malformed storage', () => {
  assert.deepEqual(parseEvidenceStorage(null), { kind: 'missing', records: [] });
  assert.equal(parseEvidenceStorage('{not-json').kind, 'malformed');
  assert.equal(parseEvidenceStorage(JSON.stringify({ version: 99, records: [] })).kind, 'malformed');
  assert.deepEqual(parseEvidenceStorage(JSON.stringify({ version: EVIDENCE_STORAGE_VERSION, records: [] })), { kind: 'valid', records: [] });
});

test('persistence removes duplicate IDs without overwriting malformed raw data', () => {
  const record = createEvidenceRecord(ad, [], undefined, undefined, '', '2026-02-01T00:00:00.000Z');
  const duplicateEnvelope = JSON.stringify({ version: EVIDENCE_STORAGE_VERSION, records: [record, record] });
  assert.equal(parseEvidenceStorage(duplicateEnvelope).records.length, 1);

  const values = storage('{malformed');
  assert.equal(loadEvidenceState().kind, 'malformed');
  assert.equal(values.get('tracefin_evidence_v1'), '{malformed');
});

test('valid evidence persists, keeps orphan investigation references, and records linking changes', () => {
  const record = createEvidenceRecord(ad, [], 'deleted-investigation', undefined, '', '2026-02-01T00:00:00.000Z');
  const values = storage(null);
  saveEvidence([record]);
  const loaded = loadEvidenceState();
  assert.equal(loaded.kind, 'valid');
  assert.equal(loaded.records[0].investigationId, 'deleted-investigation');

  const unlinked: EvidenceRecord = { ...record, investigationId: undefined, history: [...record.history, { action: 'unlinked', timestamp: '2026-02-02T00:00:00.000Z', actor: 'A. Reyes' }] };
  saveEvidence([unlinked]);
  const afterUpdate = loadEvidenceState();
  assert.equal(afterUpdate.records[0].investigationId, undefined);
  assert.equal(afterUpdate.records[0].history.at(-1)?.action, 'unlinked');
  assert.ok(values.get('tracefin_evidence_v1'));
});

