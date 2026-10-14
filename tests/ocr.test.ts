import assert from 'node:assert/strict';
import test from 'node:test';
import { isSupportedOcrImage } from '../src/lib/ocr.ts';

test('OCR accepts only supported non-empty image types within the existing limit', () => {
  assert.equal(isSupportedOcrImage(new File(['image'], 'ad.png', { type: 'image/png' })), true);
  assert.equal(isSupportedOcrImage(new File(['text'], 'ad.pdf', { type: 'application/pdf' })), false);
  assert.equal(isSupportedOcrImage(new File([], 'empty.jpg', { type: 'image/jpeg' })), false);
});
