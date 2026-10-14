import assert from 'node:assert/strict';
import test from 'node:test';
import { computeRisk, scoreSellerActivity } from '../src/lib/riskEngine.ts';
import type { Advertisement } from '../src/types/index.ts';

const baseAdvertisement: Omit<Advertisement, 'riskScore' | 'riskLevel' | 'riskReasons'> = {
  id: 'TEST-001',
  title: 'Test listing',
  platform: 'Telegram',
  category: 'bank_account_sale',
  postedAt: '2026-10-13T10:00:00.000Z',
  detectedAt: '2026-10-14T10:00:00.000Z',
  content: 'Selling a verified bank account. Contact via Telegram.',
  sourceUrl: 'https://example.test/listing',
  seller: {
    alias: 'test-seller',
    platform: 'Telegram',
    joinedDate: '2026-01-01T00:00:00.000Z',
    postCount: 42,
    verifiedBadge: false,
    contactMethod: 'Telegram @test',
  },
  status: 'flagged',
  tags: ['test'],
};

test('computeRisk is deterministic for unchanged advertisement inputs', () => {
  const first = computeRisk(baseAdvertisement);
  const second = computeRisk({ ...baseAdvertisement, seller: { ...baseAdvertisement.seller } });
  assert.deepEqual(second, first);
  assert.ok(first.riskScore >= 0 && first.riskScore <= 100);
});

test('seller activity uses a stable evaluation timestamp', () => {
  const first = scoreSellerActivity(42, '2026-01-01T00:00:00.000Z', '2026-10-14T00:00:00.000Z');
  const second = scoreSellerActivity(42, '2026-01-01T00:00:00.000Z', '2026-10-14T00:00:00.000Z');
  assert.equal(second, first);
});
