import assert from 'node:assert/strict';
import test from 'node:test';
import { assessOcrQuality, getTextEditSummary, normalizeOcrText, verifyAdvertisementText } from '../src/lib/textVerification.ts';
import { createImportedAdvertisement, validateImportRows } from '../src/lib/ingestion.ts';

test('normalizes OCR whitespace and line endings deterministically', () => {
  assert.equal(normalizeOcrText('  Sell\r\n\r\n bank   account  '), 'Sell\n\nbank account');
});

test('tracks edits and identifies suspicious content without factual verification', () => {
  const result = verifyAdvertisementText({ ocrText: 'Rent bank account', reviewedText: 'Rent bank account via PayPal', confidence: 92 });
  assert.equal(result.wasEdited, true);
  assert.equal(result.externalVerificationAvailable, false);
  assert.ok(result.findings.some(finding => finding.kind === 'suspicious_content'));
  assert.ok(result.findings.some(finding => finding.source === 'user_corrected'));
});

test('reports unreadable and low-confidence OCR safely', () => {
  assert.equal(assessOcrQuality('', 98), 'unreadable');
  assert.equal(assessOcrQuality('some text', 40), 'low_confidence');
  const result = verifyAdvertisementText({ ocrText: '', reviewedText: '', confidence: 30 });
  assert.equal(result.quality, 'unreadable');
  assert.ok(result.findings.some(finding => finding.id === 'text-check-unreadable'));
});

test('edit summary is stable for unchanged text', () => {
  assert.deepEqual(getTextEditSummary(' same ', 'same'), { wasEdited: false, changedCharacterCount: 0 });
});

test('manual text uses the shared indicator and risk pipeline', () => {
  const text = 'Rent a debit card and receive transfers via PayPal.';
  const verification = verifyAdvertisementText({ ocrText: '', reviewedText: text, source: 'manual' });
  assert.ok(verification.findings.some(finding => finding.source === 'manual_entry'));
  const validation = validateImportRows([{ text, platform: 'Telegram', collectionMethod: 'manual_entry', capturedAt: '2026-10-14T00:00:00.000Z' }], []);
  assert.equal(validation.validRecords.length, 1);
  const advertisement = createImportedAdvertisement(validation.rows[0].input!);
  assert.ok(advertisement.riskScore >= 0 && advertisement.riskScore <= 100);
  assert.ok(['low', 'medium', 'high', 'critical'].includes(advertisement.riskLevel));
});

test('OCR-reviewed text uses OCR extraction and correction sources', () => {
  const unchanged = verifyAdvertisementText({ ocrText: 'Sell bank account', reviewedText: 'Sell bank account', confidence: 91, source: 'ocr' });
  assert.ok(unchanged.findings.some(finding => finding.source === 'ocr_extracted'));
  const corrected = verifyAdvertisementText({ ocrText: 'Sell bank acount', reviewedText: 'Sell bank account', confidence: 51, source: 'ocr' });
  assert.ok(corrected.findings.some(finding => finding.source === 'user_corrected'));
  assert.equal(corrected.quality, 'low_confidence');
});
