import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, parseJson, rawRowToInput, validateImportRows } from '../src/lib/ingestion.ts';
import { extractIndicators } from '../src/lib/indicatorExtraction.ts';
import { findRelatedAdvertisements } from '../src/lib/relatedAds.ts';
import { createEvidenceRecord } from '../src/lib/evidence.ts';
import { generateAlerts, reconcileAlerts } from '../src/lib/alerts.ts';
import type { Advertisement } from '../src/types/index.ts';

const syntheticBase: Advertisement = {
  id: 'synthetic-1', title: 'Synthetic listing', platform: 'Telegram', category: 'bank_account_sale', postedAt: '2026-01-01T00:00:00.000Z', detectedAt: '2026-01-01T00:00:00.000Z', content: 'Sell verified account access.', sourceUrl: 'https://demo.example/listing',
  seller: { alias: 'synthetic', platform: 'Telegram', joinedDate: '2025-01-01', postCount: 4, verifiedBadge: false, contactMethod: '+1 555 123 4567' }, riskScore: 80, riskLevel: 'high', riskReasons: [], status: 'flagged', tags: ['Synthetic'],
};

test('end-to-end ingestion through indicators, relationships, evidence, and alerts', () => {
  const csvRows = parseCsv('text,sourceUrl,platform,capturedAt\n"Sell bank account access. Call +1 555 123 4567.",https://demo.example/imported,Telegram,2026-02-01T00:00:00.000Z');
  const jsonRows = parseJson('[{"text":"Rent bank account access. Call +1 555 123 4567.","sourceUrl":"https://demo.example/second","platform":"Telegram","capturedAt":"2026-02-02T00:00:00.000Z"}]');
  const importedInputs = [...csvRows, ...jsonRows].map(row => rawRowToInput(row, 'csv_import'));
  const validation = validateImportRows(importedInputs, [syntheticBase]);
  assert.equal(validation.invalidCount, 0);
  assert.equal(validation.duplicateCount, 0);
  const imported = validation.validRecords;
  assert.equal(imported.length, 2);
  assert.ok(imported.every(ad => ad.riskReasons.length > 0 && typeof ad.riskScore === 'number'));

  const analyzed = imported.map(ad => ({ ...ad, indicators: extractIndicators(ad) }));
  assert.ok(analyzed.every(ad => ad.indicators && ad.indicators.length > 0));
  const related = findRelatedAdvertisements([syntheticBase, ...analyzed]);
  assert.ok(related.some(match => match.reasons.some(reason => reason.type === 'matching_phone')));

  const evidence = createEvidenceRecord(analyzed[0], analyzed[0].indicators ?? [], undefined, undefined, 'Analyst captured this local demonstration record.', '2026-02-03T00:00:00.000Z');
  const alerts = generateAlerts([syntheticBase, ...analyzed], [evidence], related, []);
  assert.ok(alerts.some(alert => alert.type === 'high_risk'));
  assert.ok(alerts.some(alert => alert.type === 'related_pattern'));
  assert.ok(alerts.some(alert => alert.type === 'new_evidence'));

  const acknowledged = { ...alerts[0], status: 'acknowledged' as const, read: true, auditHistory: [...alerts[0].auditHistory, { action: 'acknowledged' as const, timestamp: '2026-02-04T00:00:00.000Z', actor: 'A. Reyes' }] };
  const reconciled = reconcileAlerts(alerts, [acknowledged]);
  assert.equal(reconciled.find(alert => alert.id === acknowledged.id)?.status, 'acknowledged');
  assert.equal(reconciled.find(alert => alert.id === acknowledged.id)?.auditHistory.length, 2);
});

test('duplicate and invalid imports do not enter the integrated dataset', () => {
  const duplicate = rawRowToInput({ text: syntheticBase.content, sourceUrl: syntheticBase.sourceUrl, platform: syntheticBase.platform, capturedAt: '2026-02-01T00:00:00.000Z' }, 'json_import');
  const invalid = rawRowToInput({ text: '', sourceUrl: 'not-a-url', platform: '', capturedAt: 'not-a-date' }, 'json_import');
  const result = validateImportRows([duplicate, invalid], [syntheticBase]);
  assert.equal(result.validRecords.length, 0);
  assert.equal(result.duplicateCount, 1);
  assert.equal(result.invalidCount, 1);
  assert.ok(result.rows[1].errors.length >= 2);
});

