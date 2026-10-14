import test from 'node:test';
import assert from 'node:assert/strict';
import { findRelatedAdvertisements, findRelatedAdvertisementsFor } from '../src/lib/relatedAds.ts';
import type { Advertisement } from '../src/types/index.ts';

function ad(id: string, content: string, overrides: Partial<Advertisement> = {}): Advertisement {
  return {
    id,
    title: overrides.title ?? 'Advertisement',
    platform: overrides.platform ?? 'Telegram',
    category: overrides.category ?? 'bank_account_sale',
    postedAt: '2026-01-01T00:00:00.000Z',
    detectedAt: '2026-01-01T00:00:00.000Z',
    content,
    sourceUrl: overrides.sourceUrl ?? '',
    seller: overrides.seller ?? { alias: id, platform: 'Telegram', joinedDate: '2025-01-01', postCount: 1, verifiedBadge: false, contactMethod: '' },
    riskScore: overrides.riskScore ?? 50,
    riskLevel: overrides.riskLevel ?? 'medium',
    riskReasons: overrides.riskReasons ?? [],
    status: overrides.status ?? 'flagged',
    tags: overrides.tags ?? [],
    imageHash: overrides.imageHash,
  };
}

test('matches exact normalized duplicate text', () => {
  const matches = findRelatedAdvertisements([
    ad('a', 'Sell verified merchant access for fast payouts.'),
    ad('b', 'SELL verified merchant access for fast payouts!'),
  ]);
  assert.equal(matches.length, 1);
  assert.ok(matches[0].reasons.some(reason => reason.type === 'text_similarity'));
});

test('matches meaningful text above threshold but not below threshold', () => {
  const left = ad('a', 'Verified merchant account access with weekly commission payouts for remote operators.');
  const right = ad('b', 'Verified merchant account access with weekly commission payouts for remote operators abroad.');
  assert.equal(findRelatedAdvertisements([left, right], { similarityThreshold: 0.6 }).length, 1);
  assert.equal(findRelatedAdvertisements([left, ad('c', 'Community gardening schedule and neighborhood volunteer meeting.')], { similarityThreshold: 0.6 }).length, 0);
});

test('matches shared URLs and normalized domains', () => {
  const matches = findRelatedAdvertisements([
    ad('a', 'Read the details at https://example.com/path.', { sourceUrl: 'https://source.example.org/a' }),
    ad('b', 'More details at https://example.com/path?ref=two.', { sourceUrl: 'https://source.example.org/b' }),
  ]);
  assert.equal(matches.length, 1);
  assert.ok(matches[0].reasons.some(reason => reason.type === 'shared_domain'));
});

test('matches equal phone numbers and rejects different numbers', () => {
  const left = ad('a', 'Contact us today.', { seller: { alias: 'a', platform: 'Telegram', joinedDate: '2025-01-01', postCount: 1, verifiedBadge: false, contactMethod: '+1 555 123 4567' } });
  const same = ad('b', 'Contact us now.', { seller: { alias: 'b', platform: 'Telegram', joinedDate: '2025-01-01', postCount: 1, verifiedBadge: false, contactMethod: '+1 (555) 123-4567' } });
  const different = ad('c', 'Contact us now.', { seller: { alias: 'c', platform: 'Telegram', joinedDate: '2025-01-01', postCount: 1, verifiedBadge: false, contactMethod: '+1 (555) 987-6543' } });
  const sameMatch = findRelatedAdvertisements([left, same]);
  assert.equal(sameMatch.length, 1);
  assert.ok(sameMatch[0].reasons.some(reason => reason.type === 'matching_phone'));
  assert.equal(findRelatedAdvertisements([left, different]).length, 0);
});

test('matches shared payment identifiers and image hashes', () => {
  const matches = findRelatedAdvertisements([
    ad('a', 'Payment accepted in BTC.', { imageHash: 'abc123' }),
    ad('b', 'Send BTC after approval.', { imageHash: 'abc123' }),
  ]);
  assert.equal(matches.length, 1);
  assert.ok(matches[0].reasons.some(reason => reason.type === 'matching_payment_identifier'));
  assert.ok(matches[0].reasons.some(reason => reason.type === 'matching_image_hash'));
});

test('generic text does not create a relationship and results are deterministic', () => {
  const ads = [ad('a', 'Account offer available today.'), ad('b', 'Account offer available now.')];
  assert.deepEqual(findRelatedAdvertisements(ads), findRelatedAdvertisements(ads));
  assert.equal(findRelatedAdvertisements(ads).length, 0);
  assert.deepEqual(findRelatedAdvertisementsFor(ads[0], []), []);
});

