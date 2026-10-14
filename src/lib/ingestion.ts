import type { AdCategory, Advertisement, CollectionMethod, Platform } from '../types';
import { computeRisk } from './riskEngine.ts';

export const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024;

export interface IngestionInput {
  text: string;
  sourceUrl?: string;
  platform: Platform;
  capturedAt?: string;
  collectionMethod: CollectionMethod;
  title?: string;
}

export interface ImportPreviewRow {
  rowNumber: number;
  input?: IngestionInput;
  advertisement?: Advertisement;
  errors: string[];
  duplicate: boolean;
}

export interface ImportValidationResult {
  rows: ImportPreviewRow[];
  validRecords: Advertisement[];
  invalidCount: number;
  duplicateCount: number;
}

function fieldValue(row: Record<string, unknown>, names: string[]): unknown {
  const entries = Object.entries(row);
  const match = entries.find(([key]) => names.includes(key.trim().toLowerCase().replace(/[\s_-]+/g, '')));
  return match?.[1];
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
}

export function normalizeText(value: string): string {
  return value.toLowerCase().normalize('NFKC').replace(/\s+/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function normalizeSourceUrl(value: string): string {
  if (!value.trim()) return '';
  try {
    const url = new URL(value.trim());
    url.hash = '';
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    return url.toString().replace(/\/$/, '');
  } catch {
    return value.trim().toLowerCase().replace(/\/$/, '');
  }
}

export function stableImportId(text: string, sourceUrl = ''): string {
  const input = `${normalizeText(text)}|${normalizeSourceUrl(sourceUrl)}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `IMP-${(hash >>> 0).toString(36).toUpperCase()}`;
}

function normalizePlatform(value: unknown): Platform | null {
  const text = asText(value).toLowerCase();
  const known: Record<string, Platform> = {
    telegram: 'Telegram', facebook: 'Facebook', instagram: 'Instagram',
    whatsapp: 'WhatsApp', reddit: 'Reddit', 'twitter/x': 'Twitter/X', twitter: 'Twitter/X',
    'dark web forum': 'Dark Web Forum', other: 'Other',
  };
  return known[text] ?? (text ? 'Other' : null);
}

function inferCategory(text: string): AdCategory {
  const lower = text.toLowerCase();
  if (/atm|debit|credit card|card rental|skimmer/.test(lower)) return 'atm_card_rental';
  if (/credential|login|password|fullz|ssn|identity|document/.test(lower)) return 'identity_credential';
  if (/mule|receive transfers|drops|withdraw funds/.test(lower)) return 'money_mule_recruitment';
  if (/crypto|bitcoin|btc|usdt|wallet|binance/.test(lower)) return 'crypto_wallet';
  if (/paypal|gcash|maya|wise|payment account|e-wallet/.test(lower)) return 'payment_account';
  return 'bank_account_sale';
}

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(value); value = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(value); value = '';
      if (row.some(cell => cell.trim())) rows.push(row);
      row = [];
    } else value += char;
  }
  if (value || row.length) { row.push(value); if (row.some(cell => cell.trim())) rows.push(row); }
  if (rows.length < 2) throw new Error('CSV must include a header row and at least one data row.');

  const headers = rows[0].map(header => header.replace(/^\uFEFF/, '').trim());
  if (headers.every(header => !header)) throw new Error('CSV header row is empty.');
  return rows.slice(1).map(cells => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ''])));
}

export function parseJson(text: string): Record<string, unknown>[] {
  const parsed: unknown = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error('JSON must contain an array of advertisement objects.');
  if (!parsed.every(value => typeof value === 'object' && value !== null && !Array.isArray(value))) {
    throw new Error('Every JSON array item must be an object.');
  }
  return parsed as Record<string, unknown>[];
}

export function rawRowToInput(row: Record<string, unknown>, collectionMethod: CollectionMethod): IngestionInput {
  const text = asText(fieldValue(row, ['text', 'content', 'advertisementtext', 'adtext']));
  const sourceUrl = asText(fieldValue(row, ['sourceurl', 'url', 'source']));
  const platform = normalizePlatform(fieldValue(row, ['platform', 'sourceplatform'])) ?? 'Other';
  const capturedAt = asText(fieldValue(row, ['capturedat', 'timestamp', 'detectedat', 'capturetime'])) || new Date().toISOString();
  const suppliedMethod = asText(fieldValue(row, ['collectionmethod', 'method']));
  const methods: CollectionMethod[] = ['synthetic_demo', 'manual_entry', 'csv_import', 'json_import', 'public_source'];
  const selectedMethod = methods.includes(suppliedMethod as CollectionMethod)
    ? suppliedMethod as CollectionMethod
    : collectionMethod;
  const title = asText(fieldValue(row, ['title', 'headline']));
  return { text, sourceUrl, platform, capturedAt, collectionMethod: selectedMethod, title };
}

export function createImportedAdvertisement(input: IngestionInput): Advertisement {
  const capturedAt = input.capturedAt || new Date().toISOString();
  const sourceUrl = input.sourceUrl?.trim() ?? '';
  const title = input.title?.trim() || input.text.trim().slice(0, 80) || 'Imported advertisement';
  const sellerAlias = sourceUrl ? new URL(sourceUrl).hostname : 'Imported source';
  const base: Omit<Advertisement, 'riskScore' | 'riskLevel' | 'riskReasons'> = {
    id: stableImportId(input.text, sourceUrl),
    title,
    platform: input.platform,
    category: inferCategory(`${title} ${input.text}`),
    postedAt: capturedAt,
    detectedAt: capturedAt,
    content: input.text.trim(),
    sourceUrl,
    seller: {
      alias: sellerAlias,
      platform: input.platform,
      joinedDate: capturedAt,
      postCount: 0,
      verifiedBadge: false,
      contactMethod: sourceUrl ? sellerAlias : 'Not provided',
    },
    status: 'flagged',
    tags: ['Imported', input.collectionMethod],
    provenance: {
      sourceUrl,
      platform: input.platform,
      capturedAt,
      collectionMethod: input.collectionMethod,
    },
    assessment: 'automated',
  };
  return { ...base, ...computeRisk(base) };
}

export function validateImportRows(
  inputs: IngestionInput[],
  existingAdvertisements: Advertisement[],
): ImportValidationResult {
  const existingText = new Set(existingAdvertisements.map(ad => normalizeText(ad.content)));
  const existingUrls = new Set(existingAdvertisements.map(ad => normalizeSourceUrl(ad.sourceUrl)).filter(Boolean));
  const seenText = new Set<string>();
  const seenUrls = new Set<string>();
  const rows: ImportPreviewRow[] = inputs.map((input, index) => {
    const errors: string[] = [];
    if (!input.text.trim()) errors.push('Advertisement text is required.');
    if (!input.platform) errors.push('Platform is required.');
    if (input.sourceUrl) {
      try { new URL(input.sourceUrl); } catch { errors.push('Source URL must be a valid URL.'); }
    }
    if (Number.isNaN(Date.parse(input.capturedAt ?? ''))) errors.push('Capture timestamp is invalid.');

    const textKey = normalizeText(input.text);
    const urlKey = normalizeSourceUrl(input.sourceUrl ?? '');
    const duplicate = Boolean(textKey && (existingText.has(textKey) || seenText.has(textKey)))
      || Boolean(urlKey && (existingUrls.has(urlKey) || seenUrls.has(urlKey)));
    if (duplicate) errors.push('Duplicate content or source URL.');
    if (textKey) seenText.add(textKey);
    if (urlKey) seenUrls.add(urlKey);
    return { rowNumber: index + 1, input, advertisement: errors.length ? undefined : createImportedAdvertisement(input), errors, duplicate };
  });
  return {
    rows,
    validRecords: rows.flatMap(row => row.advertisement ? [row.advertisement] : []),
    invalidCount: rows.filter(row => row.errors.length > 0 && !row.duplicate).length,
    duplicateCount: rows.filter(row => row.duplicate).length,
  };
}

export async function parseImportFile(file: File): Promise<Record<string, unknown>[]> {
  if (file.size === 0) throw new Error('The selected file is empty.');
  if (file.size > MAX_IMPORT_FILE_BYTES) throw new Error('Files must be 2 MB or smaller.');
  const extension = file.name.toLowerCase().split('.').pop();
  if (extension !== 'csv' && extension !== 'json') throw new Error('Only CSV and JSON files are supported.');
  const text = await file.text();
  if (!text.trim()) throw new Error('The selected file is empty.');
  return extension === 'csv' ? parseCsv(text) : parseJson(text);
}
