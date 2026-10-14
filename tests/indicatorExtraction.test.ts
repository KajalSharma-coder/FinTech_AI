import test from 'node:test';
import assert from 'node:assert/strict';
import { extractIndicators } from '../src/lib/indicatorExtraction.ts';

function ad(content: string, overrides: Partial<{ title: string; sourceUrl: string; contactMethod: string }> = {}) {
  return {
    id: 'ad-test-1',
    title: overrides.title ?? 'Test advertisement',
    content,
    sourceUrl: overrides.sourceUrl ?? '',
    seller: { contactMethod: overrides.contactMethod ?? '', alias: 'seller', platform: 'Telegram' as const, joinedDate: '2025-01-01', postCount: 1, verifiedBadge: false },
  };
}

test('extracts suspicious account, card, credential, payment, and transfer signals', () => {
  const indicators = extractIndicators(ad('Bank account for sale. Rent your debit card. Send advance payment and share bank login credentials to receive transfers.'));
  const types = new Set(indicators.map(indicator => indicator.type));
  assert.ok(types.has('account_offer'));
  assert.ok(types.has('card_offer'));
  assert.ok(types.has('credential_sharing'));
  assert.ok(types.has('payment_phrase'));
  assert.ok(types.has('account_transfer'));
  assert.ok(indicators.every(indicator => indicator.advertisementId === 'ad-test-1'));
});

test('harmless text produces no suspicious extraction', () => {
  const indicators = extractIndicators(ad('Community meeting agenda: financial literacy workshop next Tuesday.'));
  assert.deepEqual(indicators, []);
});

test('extracts and masks a conservative phone candidate', () => {
  const indicators = extractIndicators(ad('Contact the coordinator for details.', { contactMethod: '+1 (555) 123-4567' }));
  const phone = indicators.find(indicator => indicator.type === 'phone_number');
  assert.ok(phone);
  assert.equal(phone.matchedValue, '+1 (555) 123-4567');
  assert.notEqual(phone.maskedDisplayValue, phone.matchedValue);
  assert.match(phone.maskedDisplayValue, /67$/);
});

test('extracts URLs and domains without calling them fraudulent', () => {
  const indicators = extractIndicators(ad('See https://example.com/offers for details.', { sourceUrl: 'https://source.example.org/post/1' }));
  assert.ok(indicators.some(indicator => indicator.type === 'url' && indicator.matchedValue.includes('https://example.com')));
  assert.ok(indicators.some(indicator => indicator.type === 'domain' && indicator.matchedValue.includes('example.com')));
  assert.ok(indicators.filter(indicator => indicator.type === 'url' || indicator.type === 'domain').every(indicator => indicator.explanation.includes('does not indicate fraud')));
});

test('extracts payment identifiers and avoids duplicate repeated values', () => {
  const indicators = extractIndicators(ad('Pay with BTC or USDT. BTC accepted.'));
  assert.equal(indicators.filter(indicator => indicator.type === 'payment_identifier' && indicator.matchedValue.toLowerCase() === 'btc').length, 1);
  assert.ok(indicators.some(indicator => indicator.type === 'payment_identifier' && indicator.matchedValue.toLowerCase() === 'usdt'));
});

test('empty, malformed, and repeated extraction remain safe and deterministic', () => {
  const empty = extractIndicators(ad(''));
  assert.deepEqual(empty, []);
  assert.deepEqual(extractIndicators(null as never), []);

  const input = ad('Sell account access. Call +44 20 7946 0958.');
  assert.deepEqual(extractIndicators(input), extractIndicators(input));
});

