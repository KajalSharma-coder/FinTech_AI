import type { Advertisement, AdCategory, Platform, RiskLevel } from '../types';

// ─── Risk Scoring Engine ─────────────────────────────────────────────────────
// Each factor is scored independently and contributes to a 0–100 total.
// Reasons are exposed for transparent, explainable risk scoring in the UI.

const CATEGORY_SCORES: Record<AdCategory, number> = {
  bank_account_sale: 30,
  atm_card_rental: 27,
  money_mule_recruitment: 25,
  identity_credential: 22,
  crypto_wallet: 18,
  payment_account: 15,
};

const PLATFORM_SCORES: Record<Platform, number> = {
  'Dark Web Forum': 20,
  Telegram: 16,
  WhatsApp: 13,
  Instagram: 10,
  Facebook: 9,
  'Twitter/X': 8,
  Reddit: 6,
  Other: 5,
};

const FLAGGED_KEYWORDS = [
  'sell', 'rent', 'transfer', 'bank account', 'atm card', 'cvv', 'fullz',
  'drops', 'money mule', 'cashout', 'wire', 'verified account', 'fresh account',
  'kyc passed', 'no questions', 'anonymous', 'btc', 'usdt', 'crypto payment',
  'guaranteed', 'trusted seller', 'bulk discount', 'limited offer',
];

/** Used only when scoreSellerActivity is called without an explicit date. */
export const DEFAULT_RISK_EVALUATION_TIMESTAMP = '2026-10-14T00:00:00.000Z';

export function scoreKeywords(content: string): number {
  const lower = content.toLowerCase();
  const hits = FLAGGED_KEYWORDS.filter(kw => lower.includes(kw));
  // max 20 points; 1 hit = 4 pts, scaling logarithmically
  return Math.min(20, hits.length * 4);
}

export function scoreSellerActivity(
  postCount: number,
  joinedDate: string,
  evaluationTimestamp = DEFAULT_RISK_EVALUATION_TIMESTAMP,
): number {
  const evaluationTime = Date.parse(evaluationTimestamp);
  const joinedTime = Date.parse(joinedDate);
  const daysSinceJoined = Math.max(1,
    (evaluationTime - joinedTime) / (1000 * 60 * 60 * 24)
  );
  const postsPerDay = postCount / daysSinceJoined;
  // max 15 points
  if (postsPerDay > 10) return 15;
  if (postsPerDay > 5) return 12;
  if (postsPerDay > 2) return 9;
  if (postsPerDay > 1) return 6;
  return 3;
}

export function scorePrice(priceOffered?: string): number {
  // max 10 points — explicit pricing is a stronger signal
  if (!priceOffered) return 0;
  return 10;
}

export function scoreContactMethod(contactMethod: string): number {
  // max 5 points
  const high = ['signal', 'wickr', 'session', 'jabber'];
  const med = ['telegram', 'whatsapp'];
  const lower = contactMethod.toLowerCase();
  if (high.some(m => lower.includes(m))) return 5;
  if (med.some(m => lower.includes(m))) return 3;
  return 1;
}

export function computeRiskLevel(score: number): RiskLevel {
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 35) return 'medium';
  return 'low';
}

export function computeRisk(ad: Omit<Advertisement, 'riskScore' | 'riskLevel' | 'riskReasons'>): {
  riskScore: number;
  riskLevel: RiskLevel;
  riskReasons: Advertisement['riskReasons'];
} {
  const categoryScore = CATEGORY_SCORES[ad.category] ?? 10;
  const platformScore = PLATFORM_SCORES[ad.platform] ?? 5;
  const keywordScore = scoreKeywords(ad.content);
  // Use the fixed evaluation timestamp so existing synthetic records retain a
  // stable baseline and identical inputs always produce identical scores.
  const sellerScore = scoreSellerActivity(ad.seller.postCount, ad.seller.joinedDate);
  const priceScore = scorePrice(ad.priceOffered);
  const contactScore = scoreContactMethod(ad.seller.contactMethod);

  const total = Math.min(100,
    categoryScore + platformScore + keywordScore + sellerScore + priceScore + contactScore
  );

  const riskReasons: Advertisement['riskReasons'] = [
    {
      factor: 'Category Severity',
      weight: categoryScore,
      maxWeight: 30,
      description: `"${ad.category.replace(/_/g, ' ')}" is a high-risk ad type associated with financial crime.`,
    },
    {
      factor: 'Platform Risk',
      weight: platformScore,
      maxWeight: 20,
      description: `${ad.platform} is ${platformScore >= 15 ? 'a high-risk platform with minimal moderation' : 'a platform with moderate enforcement'}.`,
    },
    {
      factor: 'Keyword Density',
      weight: keywordScore,
      maxWeight: 20,
      description: `${Math.round(keywordScore / 4)} financial crime keyword(s) detected in the advertisement content.`,
    },
    {
      factor: 'Seller Activity',
      weight: sellerScore,
      maxWeight: 15,
      description: `Seller has posted ${ad.seller.postCount} ads — ${sellerScore >= 12 ? 'unusually high activity suggesting an organized operation' : 'moderate posting frequency'}.`,
    },
    {
      factor: 'Explicit Pricing',
      weight: priceScore,
      maxWeight: 10,
      description: priceScore > 0
        ? `Explicit price offered (${ad.priceOffered}) indicates a commercial, organized operation.`
        : 'No explicit price listed — reduces confidence of confirmed sale.',
    },
    {
      factor: 'Contact Method',
      weight: contactScore,
      maxWeight: 5,
      description: `Contact via ${ad.seller.contactMethod} — ${contactScore >= 5 ? 'encrypted/anonymous channel, common in criminal operations' : 'standard communication channel'}.`,
    },
  ];

  return { riskScore: total, riskLevel: computeRiskLevel(total), riskReasons };
}
