import test from 'node:test';
import assert from 'node:assert/strict';
import { generateAlerts, reconcileAlerts } from '../src/lib/alerts.ts';
import { findRelatedAdvertisements } from '../src/lib/relatedAds.ts';
import { ALERTS_STORAGE_VERSION, isValidAlert, parseAlertsStorage } from '../src/lib/storage.ts';
import type { Advertisement, Alert } from '../src/types/index.ts';

function ad(id: string, content: string, riskLevel: Advertisement['riskLevel'] = 'low', contactMethod = ''): Advertisement {
  return {
    id, title: `Synthetic ${id}`, platform: 'Telegram', category: 'bank_account_sale', postedAt: '2026-01-01T00:00:00.000Z', detectedAt: '2026-01-02T00:00:00.000Z', content, sourceUrl: '',
    seller: { alias: id, platform: 'Telegram', joinedDate: '2025-01-01', postCount: 1, verifiedBadge: false, contactMethod }, riskScore: riskLevel === 'critical' ? 95 : riskLevel === 'high' ? 80 : 10, riskLevel, riskReasons: [], status: 'flagged', tags: [],
  };
}

test('generates deterministic high-risk alerts and does not duplicate them', () => {
  const ads = [ad('high-1', 'Bank account credentials available.', 'high')];
  const first = generateAlerts(ads, [], [], []);
  const second = generateAlerts(ads, [], [], []);
  assert.deepEqual(first, second);
  assert.equal(first.filter(alert => alert.type === 'high_risk').length, 1);
  assert.ok(isValidAlert(first[0]));
});

test('generates repeated-indicator alerts for shared phones but not unrelated records', () => {
  const ads = [ad('a', 'Contact us.', 'low', '+1 555 123 4567'), ad('b', 'Different content.', 'low', '+1 (555) 123-4567'), ad('c', 'Different content.', 'low', '+1 555 987 6543')];
  const alerts = generateAlerts(ads, [], [], []);
  const repeated = alerts.filter(alert => alert.title.includes('Repeated phone'));
  assert.equal(repeated.length, 1);
  assert.deepEqual(repeated[0].advertisementIds, ['a', 'b']);
});

test('generates coordinated-activity alerts only from strong related matches', () => {
  const ads = [ad('a', 'Verified merchant access with weekly commission payouts.', 'medium'), ad('b', 'Verified merchant access with weekly commission payouts.', 'medium')];
  const matches = findRelatedAdvertisements(ads);
  const alerts = generateAlerts(ads, [], matches, []);
  assert.ok(alerts.some(alert => alert.type === 'related_pattern'));
  assert.ok(alerts.every(alert => !alert.summary.includes('proof of criminal coordination') || alert.type === 'related_pattern'));
});

test('reconciliation preserves lifecycle state and audit history across refreshes', () => {
  const generated = generateAlerts([ad('high-1', 'Suspicious offer.', 'high')], [], [], []);
  const saved: Alert = { ...generated[0], status: 'investigating', read: true, auditHistory: [...generated[0].auditHistory, { action: 'investigating', timestamp: '2026-02-01T00:00:00.000Z', actor: 'A. Reyes' }] };
  const merged = reconcileAlerts(generated, [saved]);
  assert.equal(merged[0].status, 'investigating');
  assert.equal(merged[0].auditHistory.length, 2);
});

test('alert storage validates version, empty lists, duplicates, and malformed input', () => {
  assert.deepEqual(parseAlertsStorage(null), { kind: 'missing', alerts: [] });
  assert.equal(parseAlertsStorage('{bad').kind, 'malformed');
  assert.deepEqual(parseAlertsStorage(JSON.stringify({ version: ALERTS_STORAGE_VERSION, alerts: [] })), { kind: 'valid', alerts: [] });
  const alert = generateAlerts([ad('high-1', 'Suspicious offer.', 'high')], [], [], [])[0];
  const parsed = parseAlertsStorage(JSON.stringify({ version: ALERTS_STORAGE_VERSION, alerts: [alert, alert] }));
  assert.equal(parsed.kind, 'valid');
  assert.equal(parsed.alerts.length, 1);
});

