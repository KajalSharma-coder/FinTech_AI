import assert from 'node:assert/strict';
import test from 'node:test';
import { assessOcrQuality, getTextEditSummary, normalizeOcrText, verifyAdvertisementText } from '../src/lib/textVerification.ts';

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
