import type { Advertisement, ExtractedIndicator, IndicatorSource, IndicatorType } from '../types';

type TextSource = {
  source: IndicatorSource;
  text: string;
};

type PatternRule = {
  type: IndicatorType;
  pattern: RegExp;
  explanation: string;
  mask?: boolean;
};

const PATTERN_RULES: PatternRule[] = [
  {
    type: 'account_offer',
    pattern: /\b(?:bank|checking|savings|online)\s+account(?:\s+(?:for\s+sale|available|access|rental|rent))?\b/gi,
    explanation: 'References an account being offered, sold, rented, or made available for access.',
  },
  {
    type: 'account_transfer',
    pattern: /\b(?:transfer\s+(?:ownership|funds|money)|receive\s+(?:transfers|payments)|cash\s*out|withdraw\s+(?:funds|money)|ready[- ]to[- ]use\s+account)\b/gi,
    explanation: 'References transferring, receiving, or withdrawing funds through an account.',
  },
  {
    type: 'credential_sharing',
    pattern: /\b(?:bank\s+login|login\s+credentials?|online\s+banking\s+access|email\s+access|passwords?|2fa|fullz|account\s+credentials?)\b/gi,
    explanation: 'References credentials or access details that may enable account takeover or unauthorized use.',
  },
  {
    type: 'card_offer',
    pattern: /\b(?:atm|debit|credit)\s+cards?\b|\b(?:atm|debit|credit)\s+card\s+(?:rental|rent|sale|available)\b/gi,
    explanation: 'References an ATM, debit, or credit card offer or rental.',
  },
  {
    type: 'suspicious_phrase',
    pattern: /\b(?:sell(?:ing)?|rent(?:ing)?|rental|for\s+sale|commission|account\s+access|make\s+money\s+fast|guaranteed\s+payout)\b/gi,
    explanation: 'Contains language commonly used in suspicious financial-account offers; it is an investigative signal, not proof of wrongdoing.',
  },
  {
    type: 'payment_phrase',
    pattern: /\b(?:advance\s+payment|up[- ]?front\s+(?:fee|payment)|deposit\s+required|cashout|payout|commission|escrow|payment\s+first|pay\s+to\s+access)\b/gi,
    explanation: 'References an advance payment, commission, payout, or other payment condition associated with the offer.',
  },
  {
    type: 'payment_identifier',
    pattern: /\b(?:bitcoin|btc|ethereum|eth|usdt|monero|xmr|paypal|zelle|cashapp|gcash|wise)\b/gi,
    explanation: 'Identifies a payment provider, cryptocurrency, or payment token mentioned in the advertisement.',
  },
];

const URL_PATTERN = /https?:\/\/[^\s<>"']+/gi;
const DOMAIN_PATTERN = /\b(?:www\.)?[a-z0-9-]+\.(?:com|net|org|io|co|me|info|biz|xyz|onion)(?:\/[^\s<>"']*)?/gi;
const PHONE_PATTERN = /(?:\+?\d[\d().\s-]{7,}\d)/g;

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function normalizeMatch(value: string): string {
  return value.trim().replace(/[),.;!?]+$/g, '').replace(/\s+/g, ' ').toLowerCase();
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 8) return '••••';
  return `••••••${digits.slice(-2)}`;
}

function maskIdentifier(value: string): string {
  const compact = value.trim();
  if (compact.length <= 4) return '••••';
  return `${compact.slice(0, 2)}••••${compact.slice(-2)}`;
}

function evidenceExcerpt(text: string, start: number, length: number): string {
  const radius = 52;
  const from = Math.max(0, start - radius);
  const to = Math.min(text.length, start + length + radius);
  const excerpt = text.slice(from, to).replace(/\s+/g, ' ').trim();
  return `${from > 0 ? '…' : ''}${excerpt}${to < text.length ? '…' : ''}`;
}

function addIndicator(
  output: ExtractedIndicator[],
  seen: Set<string>,
  advertisementId: string,
  type: IndicatorType,
  value: string,
  source: IndicatorSource,
  sourceText: string,
  start: number,
  explanation: string,
  mask = false,
) {
  const cleaned = value.trim().replace(/[),.;!?]+$/g, '');
  const normalized = normalizeMatch(cleaned);
  if (!normalized || seen.has(`${type}:${normalized}`)) return;
  seen.add(`${type}:${normalized}`);

  output.push({
    id: `indicator-${stableHash(`${advertisementId}:${type}:${normalized}`)}`,
    advertisementId,
    type,
    matchedValue: cleaned,
    maskedDisplayValue: mask ? (type === 'phone_number' ? maskPhone(cleaned) : maskIdentifier(cleaned)) : cleaned,
    source,
    sourceEvidence: evidenceExcerpt(sourceText, start, value.length),
    explanation,
    assessment: 'automated',
  });
}

function collectPatternMatches(
  output: ExtractedIndicator[],
  seen: Set<string>,
  advertisementId: string,
  textSource: TextSource,
) {
  for (const rule of PATTERN_RULES) {
    rule.pattern.lastIndex = 0;
    let match = rule.pattern.exec(textSource.text);
    while (match) {
      addIndicator(output, seen, advertisementId, rule.type, match[0], textSource.source, textSource.text, match.index, rule.explanation, rule.mask);
      match = rule.pattern.exec(textSource.text);
    }
  }
}

function collectRegexMatches(
  output: ExtractedIndicator[],
  seen: Set<string>,
  advertisementId: string,
  textSource: TextSource,
  pattern: RegExp,
  type: IndicatorType,
  explanation: string,
  mask = false,
) {
  pattern.lastIndex = 0;
  let match = pattern.exec(textSource.text);
  while (match) {
    addIndicator(output, seen, advertisementId, type, match[0], textSource.source, textSource.text, match.index, explanation, mask);
    match = pattern.exec(textSource.text);
  }
}

/**
 * Extracts deterministic investigative signals. Extraction alone does not establish fraud.
 */
export function extractIndicators(advertisement: Pick<Advertisement, 'id' | 'title' | 'content' | 'sourceUrl' | 'seller'>): ExtractedIndicator[] {
  if (!advertisement || typeof advertisement.id !== 'string' || !advertisement.id.trim()) return [];

  const output: ExtractedIndicator[] = [];
  const seen = new Set<string>();
  const textSources: TextSource[] = [];
  if (typeof advertisement.title === 'string' && advertisement.title.trim()) textSources.push({ source: 'title', text: advertisement.title });
  if (typeof advertisement.content === 'string' && advertisement.content.trim()) textSources.push({ source: 'content', text: advertisement.content });
  if (typeof advertisement.sourceUrl === 'string' && advertisement.sourceUrl.trim()) textSources.push({ source: 'source_url', text: advertisement.sourceUrl });
  if (advertisement.seller && typeof advertisement.seller.contactMethod === 'string' && advertisement.seller.contactMethod.trim()) {
    textSources.push({ source: 'seller_profile', text: advertisement.seller.contactMethod });
  }

  for (const textSource of textSources) {
    collectPatternMatches(output, seen, advertisement.id, textSource);
    collectRegexMatches(output, seen, advertisement.id, textSource, URL_PATTERN, 'url', 'A URL was extracted for investigation context; its presence alone does not indicate fraud.');
    collectRegexMatches(output, seen, advertisement.id, textSource, DOMAIN_PATTERN, 'domain', 'A domain was extracted for investigation context; its presence alone does not indicate fraud.');
    collectRegexMatches(output, seen, advertisement.id, textSource, PHONE_PATTERN, 'phone_number', 'A phone-number candidate was extracted for investigation context; its presence alone does not indicate fraud.', true);
  }

  return output;
}

