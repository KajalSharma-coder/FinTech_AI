import type { Advertisement, ExtractedIndicator, RelatedAdvertisementMatch, RelatedMatchReason } from '../types';
import { extractIndicators } from './indicatorExtraction.ts';

export const DEFAULT_RELATED_AD_THRESHOLD = 0.62;
export const DEFAULT_RELATED_DETECTION_TIMESTAMP = '2026-10-14T00:00:00.000Z';

export interface RelatedAdsOptions {
  similarityThreshold?: number;
  detectionTimestamp?: string;
}

const GENERIC_TOKENS = new Set([
  'account', 'accounts', 'advertisement', 'available', 'card', 'contact', 'details', 'financial',
  'get', 'money', 'offer', 'offers', 'payment', 'please', 'sale', 'selling', 'today', 'transfer',
  'use', 'using', 'with', 'your', 'new', 'fast', 'quick', 'now', 'the', 'and', 'for', 'from',
]);

function normalizedText(value: unknown): string {
  return typeof value === 'string'
    ? value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
    : '';
}

function meaningfulTokens(advertisement: Advertisement): Set<string> {
  const content = normalizedText(`${advertisement.title} ${advertisement.content}`);
  return new Set(content.split(' ').filter(token => token.length >= 4 && !GENERIC_TOKENS.has(token)));
}

function jaccardSimilarity(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  return intersection / (left.size + right.size - intersection);
}

function normalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host.toLowerCase()}${url.pathname.replace(/\/$/, '')}${url.search}`;
  } catch {
    return normalizedText(value).replace(/\/$/, '');
  }
}

function normalizeDomain(value: string): string {
  try {
    const candidate = value.includes('://') ? value : `https://${value}`;
    return new URL(candidate).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return normalizedText(value).replace(/^www\./, '').split('/')[0];
  }
}

function indicatorsFor(advertisement: Advertisement): ExtractedIndicator[] {
  return Array.isArray(advertisement.indicators) && advertisement.indicators.length > 0
    ? advertisement.indicators
    : extractIndicators(advertisement);
}

function valuesFor(advertisement: Advertisement, type: ExtractedIndicator['type']): string[] {
  return indicatorsFor(advertisement)
    .filter(indicator => indicator.type === type)
    .map(indicator => indicator.matchedValue)
    .filter(Boolean);
}

function masked(value: string, type: ExtractedIndicator['type']): string {
  if (type === 'phone_number') {
    const digits = value.replace(/\D/g, '');
    return `••••••${digits.slice(-2)}`;
  }
  if (type === 'payment_identifier' && value.length > 4) return `${value.slice(0, 2)}••••${value.slice(-2)}`;
  return value;
}

function sharedValues(left: string[], right: string[], normalizer: (value: string) => string): string[] {
  const rightValues = new Set(right.map(normalizer));
  return [...new Set(left.filter(value => rightValues.has(normalizer(value))).map(normalizer))];
}

function addReason(reasons: RelatedMatchReason[], reason: RelatedMatchReason) {
  if (!reasons.some(existing => existing.type === reason.type && existing.matchedValue === reason.matchedValue)) reasons.push(reason);
}

function stableMatchId(left: string, right: string, reasons: RelatedMatchReason[]): string {
  const input = `${left}|${right}|${reasons.map(reason => `${reason.type}:${reason.matchedValue}`).join('|')}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `related-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function compareAdvertisements(left: Advertisement, right: Advertisement, options: Required<RelatedAdsOptions>): RelatedAdvertisementMatch | null {
  const reasons: RelatedMatchReason[] = [];
  const sharedUrls = sharedValues(valuesFor(left, 'url'), valuesFor(right, 'url'), normalizeUrl);
  for (const value of sharedUrls) addReason(reasons, { type: 'shared_url', matchedValue: value, explanation: 'Both advertisements contain the same normalized URL.' });

  const sharedDomains = sharedValues(
    [...valuesFor(left, 'domain'), ...valuesFor(left, 'url')],
    [...valuesFor(right, 'domain'), ...valuesFor(right, 'url')],
    normalizeDomain,
  );
  for (const value of sharedDomains) addReason(reasons, { type: 'shared_domain', matchedValue: value, explanation: 'Both advertisements reference the same normalized domain.' });

  const sharedPhones = sharedValues(valuesFor(left, 'phone_number'), valuesFor(right, 'phone_number'), value => value.replace(/\D/g, ''))
    .filter(value => value.length >= 8);
  for (const value of sharedPhones) addReason(reasons, { type: 'matching_phone', matchedValue: masked(value, 'phone_number'), explanation: 'Both advertisements contain the same phone-number candidate; it is masked here for privacy.' });

  const sharedPayments = sharedValues(valuesFor(left, 'payment_identifier'), valuesFor(right, 'payment_identifier'), normalizedText)
    .filter(value => value.length >= 3);
  for (const value of sharedPayments) addReason(reasons, { type: 'matching_payment_identifier', matchedValue: masked(value, 'payment_identifier'), explanation: 'Both advertisements mention the same payment identifier.' });

  if (left.imageHash && right.imageHash && left.imageHash === right.imageHash) {
    addReason(reasons, { type: 'matching_image_hash', matchedValue: `${left.imageHash.slice(0, 10)}…`, explanation: 'Both advertisements have the same locally computed image hash.' });
  }

  const leftTokens = meaningfulTokens(left);
  const rightTokens = meaningfulTokens(right);
  const similarity = jaccardSimilarity(leftTokens, rightTokens);
  const normalizedLeft = normalizedText(`${left.title} ${left.content}`);
  const normalizedRight = normalizedText(`${right.title} ${right.content}`);
  const exactText = normalizedLeft.length > 0 && normalizedLeft === normalizedRight && leftTokens.size >= 2;
  if (exactText || (similarity >= options.similarityThreshold && [...leftTokens].filter(token => rightTokens.has(token)).length >= 2)) {
    addReason(reasons, {
      type: 'text_similarity',
      matchedValue: `${Math.round(similarity * 100)}% token similarity`,
      explanation: exactText ? 'The normalized advertisement text is identical.' : 'The advertisements share multiple meaningful content terms above the configured similarity threshold.',
    });
  }

  if (reasons.length === 0) return null;
  const orderedIds = [left.id, right.id].sort();
  return {
    id: stableMatchId(orderedIds[0], orderedIds[1], reasons),
    advertisementId: left.id,
    relatedAdvertisementId: right.id,
    reasons,
    similarityScore: similarity,
    detectedAt: options.detectionTimestamp,
    isInvestigativeLead: true,
  };
}

export function findRelatedAdvertisements(advertisements: Advertisement[], options: RelatedAdsOptions = {}): RelatedAdvertisementMatch[] {
  if (!Array.isArray(advertisements)) return [];
  const resolved: Required<RelatedAdsOptions> = {
    similarityThreshold: options.similarityThreshold ?? DEFAULT_RELATED_AD_THRESHOLD,
    detectionTimestamp: options.detectionTimestamp ?? DEFAULT_RELATED_DETECTION_TIMESTAMP,
  };
  const matches: RelatedAdvertisementMatch[] = [];
  for (let leftIndex = 0; leftIndex < advertisements.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < advertisements.length; rightIndex += 1) {
      const match = compareAdvertisements(advertisements[leftIndex], advertisements[rightIndex], resolved);
      if (match) matches.push(match);
    }
  }
  return matches;
}

export function findRelatedAdvertisementsFor(advertisement: Advertisement, advertisements: Advertisement[], options: RelatedAdsOptions = {}): RelatedAdvertisementMatch[] {
  return findRelatedAdvertisements(advertisements, options)
    .filter(match => match.advertisementId === advertisement.id || match.relatedAdvertisementId === advertisement.id)
    .map(match => match.advertisementId === advertisement.id ? match : {
      ...match,
      advertisementId: advertisement.id,
      relatedAdvertisementId: match.advertisementId,
    });
}

