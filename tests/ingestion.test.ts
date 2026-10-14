import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeSourceUrl, normalizeText, parseCsv, parseJson,
  stableImportId, validateImportRows,
} from '../src/lib/ingestion.ts';
import type { IngestionInput } from '../src/lib/ingestion.ts';

test('CSV parsing supports headers and quoted commas', () => {
  const rows = parseCsv('text,platform,sourceUrl\n"Selling, verified account",Telegram,https://example.test/ad');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].text, 'Selling, verified account');
  assert.equal(rows[0].platform, 'Telegram');
});

test('JSON parsing requires an array of objects', () => {
  assert.equal(parseJson('[{"content":"hello"}]').length, 1);
  assert.throws(() => parseJson('{"content":"hello"}'), /array/);
});

test('normalization produces stable comparison values and IDs', () => {
  assert.equal(normalizeText('  BANK\nAccount! '), 'bank account');
  assert.equal(normalizeSourceUrl('HTTPS://WWW.Example.test/listing/#source'), 'https://example.test/listing');
  assert.equal(stableImportId('Bank account', 'https://example.test/listing'), stableImportId(' bank   account ', 'https://www.example.test/listing/'));
});

test('validation reports invalid rows and duplicates against existing records', () => {
  const input: IngestionInput = {
    text: 'Selling a verified bank account',
    platform: 'Telegram',
    sourceUrl: 'https://example.test/ad',
    capturedAt: '2026-10-14T10:00:00.000Z',
    collectionMethod: 'manual_entry',
  };
  const duplicate = validateImportRows([input], [{
    ...({} as never), content: ' selling a verified bank account ', sourceUrl: 'https://other.test/ad',
  }]);
  assert.equal(duplicate.validRecords.length, 0);
  assert.equal(duplicate.duplicateCount, 1);

  const invalid = validateImportRows([{ ...input, text: '', sourceUrl: 'not-a-url' }], []);
  assert.equal(invalid.invalidCount, 1);
  assert.equal(invalid.rows[0].errors.length, 2);
});
