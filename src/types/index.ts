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
  | 'Instagram'
  | 'Other';

export type CollectionMethod =
  | 'synthetic_demo'
  | 'manual_entry'
  | 'csv_import'
  | 'json_import'
  | 'public_source';

export type IndicatorType =
  | 'suspicious_phrase'
  | 'account_offer'
  | 'card_offer'
  | 'phone_number'
  | 'url'
  | 'domain'
  | 'payment_identifier'
  | 'payment_phrase'
  | 'credential_sharing'
  | 'account_transfer';

export type IndicatorSource = 'title' | 'content' | 'source_url' | 'seller_profile' | 'image_text';

export type FindingAssessment = 'automated' | 'investigator_confirmed';
export type TextVerificationSource = 'ocr_extracted' | 'user_corrected' | 'automated_detected';
export type OCRQuality = 'good' | 'low_confidence' | 'unreadable';

export interface TextVerificationFinding {
  id: string;
  kind: 'format' | 'suspicious_content';
  matchedValue: string;
  reason: string;
  source: TextVerificationSource;
  indicatorId?: string;
}

export interface TextVerificationResult {
  ocrText: string;
  reviewedText: string;
  wasEdited: boolean;
  changedCharacterCount: number;
  confidence?: number;
  quality: OCRQuality;
  findings: TextVerificationFinding[];
  externalVerificationAvailable: false;
}

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

export interface AdvertisementProvenance {
  sourceUrl: string;
  platform: Platform;
  capturedAt: string;
  collectionMethod: CollectionMethod;
}

export interface ExtractedIndicator {
  id: string;
  /** Stable parent advertisement identifier for evidence and UI association. */
  advertisementId: string;
  type: IndicatorType;
  matchedValue: string;
  maskedDisplayValue: string;
  source: IndicatorSource;
  sourceEvidence: string;
  explanation: string;
  assessment: FindingAssessment;
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
  /** Optional so existing synthetic records remain backward-compatible. */
  provenance?: AdvertisementProvenance;
  /** Populated by later analysis phases; existing records remain valid without it. */
  indicators?: ExtractedIndicator[];
  /** Optional hash for a locally selected image; image content is never stored here. */
  imageHash?: string;
  assessment?: FindingAssessment;
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

export interface EvidenceHistoryEntry {
  action: 'created' | 'updated' | 'linked' | 'unlinked';
  timestamp: string;
  actor: string;
  note?: string;
}

export type EvidenceType = 'advertisement_snapshot' | 'image_attachment';

export interface EvidenceRecord {
  id: string;
  advertisementId: string;
  evidenceType: EvidenceType;
  investigationId?: string;
  sourceUrl: string;
  platform: Platform;
  capturedAt: string;
  collectionMethod: CollectionMethod;
  matchedIndicators: ExtractedIndicator[];
  riskExplanation: RiskReason[];
  /** Notes added by the investigator, kept separate from source evidence. */
  investigatorNotes: string;
  createdAt: string;
  history: EvidenceHistoryEntry[];
  fileHash?: string;
  fileName?: string;
  fileMimeType?: string;
  fileSize?: number;
  ocrText?: string;
  reviewedText?: string;
  ocrConfidence?: number;
  ocrExtractedAt?: string;
  verificationFindings?: TextVerificationFinding[];
}

export type RelatedMatchReasonType = 'text_similarity' | 'shared_url' | 'shared_domain' | 'matching_phone' | 'matching_payment_identifier' | 'matching_image_hash';

export interface RelatedMatchReason {
  type: RelatedMatchReasonType;
  matchedValue: string;
  explanation: string;
}

export interface RelatedAdvertisementMatch {
  id: string;
  advertisementId: string;
  relatedAdvertisementId: string;
  reasons: RelatedMatchReason[];
  similarityScore?: number;
  detectedAt: string;
  isInvestigativeLead: true;
}

export type AlertType = 'high_risk' | 'related_pattern' | 'new_evidence';

export type AlertStatus = 'new' | 'acknowledged' | 'investigating' | 'resolved' | 'dismissed';

export interface AlertAuditEntry {
  action: 'created' | 'acknowledged' | 'investigating' | 'resolved' | 'dismissed' | 'linked' | 'unlinked' | 'updated';
  timestamp: string;
  actor: string;
  note?: string;
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: RiskLevel;
  title: string;
  summary: string;
  advertisementIds: string[];
  supportingIndicatorIds: string[];
  supportingEvidenceIds: string[];
  advertisementId?: string;
  evidenceId?: string;
  investigationId?: string;
  createdAt: string;
  status: AlertStatus;
  auditHistory: AlertAuditEntry[];
  read: boolean;
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
