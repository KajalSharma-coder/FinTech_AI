// ─── Risk & Status Enums ────────────────────────────────────────────────────

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

export type AdStatus = 'flagged' | 'under_review' | 'confirmed_threat' | 'dismissed';

export type AdCategory =
  | 'bank_account_sale'
  | 'atm_card_rental'
  | 'identity_credential'
  | 'money_mule_recruitment'
  | 'crypto_wallet'
  | 'payment_account';

export type Platform =
  | 'Telegram'
  | 'Facebook'
  | 'Twitter/X'
  | 'Dark Web Forum'
  | 'WhatsApp'
  | 'Reddit'
  | 'Instagram';

// ─── Core Entities ───────────────────────────────────────────────────────────

export interface RiskReason {
  factor: string;
  weight: number;
  maxWeight: number;
  description: string;
}

export interface SellerProfile {
  alias: string;
  platform: Platform;
  joinedDate: string;
  postCount: number;
  verifiedBadge: boolean;
  contactMethod: string;
}

export interface Advertisement {
  id: string;
  title: string;
  platform: Platform;
  category: AdCategory;
  postedAt: string;
  detectedAt: string;
  content: string;
  sourceUrl: string;
  seller: SellerProfile;
  riskScore: number;
  riskLevel: RiskLevel;
  riskReasons: RiskReason[];
  status: AdStatus;
  tags: string[];
  location?: string;
  priceOffered?: string;
}

export interface Investigation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  status: 'open' | 'in_progress' | 'closed';
  priority: RiskLevel;
  linkedAdIds: string[];
  notes: string;
  analyst: string;
  tags: string[];
}

export interface ReportPeriod {
  label: string;
  start: string;
  end: string;
}

export interface Report {
  id: string;
  title: string;
  generatedAt: string;
  period: ReportPeriod;
  summary: string;
  threatCount: number;
  newThreats: number;
  resolvedThreats: number;
  topCategories: { category: AdCategory; count: number }[];
  riskDistribution: Record<RiskLevel, number>;
  topPlatforms: { platform: Platform; count: number }[];
  keyFindings: string[];
}

export interface DailyThreat {
  date: string;
  count: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

// ─── UI Helpers ─────────────────────────────────────────────────────────────

export interface FilterState {
  search: string;
  platform: string;
  category: string;
  riskLevel: string;
  status: string;
}
