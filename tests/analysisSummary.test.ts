import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeAdvertisements } from '../src/lib/analysisSummary.ts';
import type { Advertisement } from '../src/types/index.ts';

function ad(id: string, riskLevel: Advertisement['riskLevel'], riskScore: number): Advertisement {
  return { id, title: id, platform: 'Other', category: 'bank_account_sale', postedAt: '', detectedAt: '', content: '', sourceUrl: '', seller: { alias: id, platform: 'Other', joinedDate: '', postCount: 0, verifiedBadge: false, contactMethod: '' }, riskScore, riskLevel, riskReasons: [], status: 'flagged', tags: [] };
}

test('analysis summary derives all risk counts and orders flagged records by score', () => {
  const summary = summarizeAdvertisements([ad('low', 'low', 10), ad('critical', 'critical', 92), ad('medium', 'medium', 40), ad('high', 'high', 70), ad('high-2', 'high', 75)]);
  assert.equal(summary.total, 5);
  assert.deepEqual(summary.counts, { critical: 1, high: 2, medium: 1, low: 1 });
  assert.equal(summary.highRiskCount, 3);
  assert.deepEqual(summary.flaggedAdvertisements.map(record => record.id), ['critical', 'high-2', 'high']);
});

test('analysis summary handles an empty dataset', () => {
  assert.deepEqual(summarizeAdvertisements([]), { total: 0, counts: { critical: 0, high: 0, medium: 0, low: 0 }, highRiskCount: 0, flaggedAdvertisements: [] });
});

