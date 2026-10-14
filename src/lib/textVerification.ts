import type { Advertisement, TextVerificationFinding, TextVerificationResult, OCRQuality } from '../types';
import { extractIndicators } from './indicatorExtraction.ts';

export function normalizeOcrText(text: unknown): string {
  return typeof text === 'string' ? text.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/[ \t]*\n[ \t]*/g, '\n').replace(/\n{3,}/g, '\n\n').trim() : '';
}

export function getTextEditSummary(original: string, reviewed: string): Pick<TextVerificationResult, 'wasEdited' | 'changedCharacterCount'> {
  const left = normalizeOcrText(original);
  const right = normalizeOcrText(reviewed);
  let changes = Math.abs(left.length - right.length);
  const overlap = Math.min(left.length, right.length);
  for (let index = 0; index < overlap; index += 1) if (left[index] !== right[index]) changes += 1;
  return { wasEdited: left !== right, changedCharacterCount: changes };
}

export function assessOcrQuality(text: string, confidence?: number): OCRQuality {
  if (!normalizeOcrText(text)) return 'unreadable';
  return confidence !== undefined && confidence < 60 ? 'low_confidence' : 'good';
}

function sourceForMatch(value: string, original: string, wasEdited: boolean, inputSource: 'ocr' | 'manual'): TextVerificationFinding['source'] {
  if (inputSource === 'manual') return 'manual_entry';
  if (original.toLocaleLowerCase().includes(value.toLocaleLowerCase())) return 'ocr_extracted';
  return wasEdited ? 'user_corrected' : 'automated_detected';
}

export function verifyAdvertisementText(input: { ocrText: string; reviewedText: string; confidence?: number; source?: 'ocr' | 'manual' }): TextVerificationResult {
  const ocrText = normalizeOcrText(input.ocrText);
  const reviewedText = normalizeOcrText(input.reviewedText);
  const edit = getTextEditSummary(ocrText, reviewedText);
  const quality = assessOcrQuality(reviewedText, input.confidence);
  const findings: TextVerificationFinding[] = [];
  const ad: Pick<Advertisement, 'id' | 'title' | 'content' | 'sourceUrl' | 'seller'> = {
    id: 'ocr-review', title: '', content: reviewedText, sourceUrl: '',
    seller: { alias: 'OCR review', platform: 'Other', joinedDate: '', postCount: 0, verifiedBadge: false, contactMethod: '' },
  };
  extractIndicators(ad).forEach(indicator => {
    findings.push({
      id: `text-check-${indicator.id}`,
      kind: ['phone_number', 'url', 'domain', 'payment_identifier'].includes(indicator.type) ? 'format' : 'suspicious_content',
      matchedValue: indicator.maskedDisplayValue,
      reason: indicator.explanation,
      source: sourceForMatch(indicator.matchedValue, ocrText, edit.wasEdited, input.source ?? 'ocr'),
      indicatorId: indicator.id,
    });
  });
  if (quality === 'unreadable') findings.push({ id: 'text-check-unreadable', kind: 'format', matchedValue: '', reason: 'No readable text was extracted or entered for review.', source: 'automated_detected' });
  if (quality === 'low_confidence') findings.push({ id: 'text-check-low-confidence', kind: 'format', matchedValue: `${input.confidence ?? 0}%`, reason: 'OCR confidence is below the review threshold; verify the text manually before relying on indicators.', source: 'automated_detected' });
  return { ocrText, reviewedText, ...edit, confidence: input.confidence, quality, findings, externalVerificationAvailable: false };
}
