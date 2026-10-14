import type { DailyThreat, Report } from '../types';

// ─── 30-day trend data ───────────────────────────────────────────────────────

function d(daysAgo: number): string {
  const dt = new Date();
  dt.setDate(dt.getDate() - daysAgo);
  return dt.toISOString().split('T')[0];
}

export const dailyThreats: DailyThreat[] = [
  { date: d(29), count: 4,  critical: 1, high: 1, medium: 1, low: 1 },
  { date: d(28), count: 6,  critical: 1, high: 2, medium: 2, low: 1 },
  { date: d(27), count: 5,  critical: 0, high: 2, medium: 2, low: 1 },
  { date: d(26), count: 8,  critical: 2, high: 2, medium: 3, low: 1 },
  { date: d(25), count: 7,  critical: 1, high: 3, medium: 2, low: 1 },
  { date: d(24), count: 9,  critical: 2, high: 3, medium: 3, low: 1 },
  { date: d(23), count: 6,  critical: 1, high: 2, medium: 2, low: 1 },
  { date: d(22), count: 11, critical: 3, high: 4, medium: 3, low: 1 },
  { date: d(21), count: 8,  critical: 2, high: 3, medium: 2, low: 1 },
  { date: d(20), count: 13, critical: 4, high: 4, medium: 4, low: 1 },
  { date: d(19), count: 10, critical: 2, high: 4, medium: 3, low: 1 },
  { date: d(18), count: 7,  critical: 1, high: 3, medium: 2, low: 1 },
  { date: d(17), count: 12, critical: 3, high: 4, medium: 4, low: 1 },
  { date: d(16), count: 9,  critical: 2, high: 3, medium: 3, low: 1 },
  { date: d(15), count: 14, critical: 4, high: 5, medium: 4, low: 1 },
  { date: d(14), count: 11, critical: 3, high: 4, medium: 3, low: 1 },
  { date: d(13), count: 8,  critical: 2, high: 3, medium: 2, low: 1 },
  { date: d(12), count: 15, critical: 5, high: 5, medium: 4, low: 1 },
  { date: d(11), count: 10, critical: 2, high: 4, medium: 3, low: 1 },
  { date: d(10), count: 17, critical: 5, high: 6, medium: 5, low: 1 },
  { date: d(9),  count: 13, critical: 4, high: 5, medium: 3, low: 1 },
  { date: d(8),  count: 11, critical: 3, high: 4, medium: 3, low: 1 },
  { date: d(7),  count: 18, critical: 6, high: 6, medium: 5, low: 1 },
  { date: d(6),  count: 14, critical: 4, high: 5, medium: 4, low: 1 },
  { date: d(5),  count: 16, critical: 5, high: 5, medium: 5, low: 1 },
  { date: d(4),  count: 19, critical: 6, high: 7, medium: 5, low: 1 },
  { date: d(3),  count: 21, critical: 7, high: 7, medium: 6, low: 1 },
  { date: d(2),  count: 17, critical: 5, high: 6, medium: 5, low: 1 },
  { date: d(1),  count: 20, critical: 6, high: 7, medium: 6, low: 1 },
  { date: d(0),  count: 8,  critical: 2, high: 3, medium: 2, low: 1 },
];

// ─── Pre-built monthly reports ───────────────────────────────────────────────

export const reports: Report[] = [
  {
    id: 'RPT-2026-10',
    title: 'October 2026 Threat Intelligence Report',
    generatedAt: new Date().toISOString(),
    period: { label: 'October 2026', start: '2026-10-01', end: '2026-10-14' },
    summary:
      'The first two weeks of October 2026 saw a significant uptick in financial account-selling activity, '
      + 'particularly on Telegram and dark web forums. Philippine-based money mule recruitment surged by 42% '
      + 'compared to the same period last month. Bank account sale advertisements remain the dominant category, '
      + 'with BDO and BPI being the most frequently advertised institutions.',
    threatCount: 20,
    newThreats: 14,
    resolvedThreats: 4,
    topCategories: [
      { category: 'bank_account_sale', count: 7 },
      { category: 'money_mule_recruitment', count: 4 },
      { category: 'crypto_wallet', count: 3 },
      { category: 'payment_account', count: 3 },
      { category: 'atm_card_rental', count: 2 },
      { category: 'identity_credential', count: 1 },
    ],
    riskDistribution: { critical: 7, high: 6, medium: 5, low: 2 },
    topPlatforms: [
      { platform: 'Telegram', count: 8 },
      { platform: 'Dark Web Forum', count: 4 },
      { platform: 'Facebook', count: 3 },
      { platform: 'WhatsApp', count: 3 },
      { platform: 'Twitter/X', count: 1 },
      { platform: 'Instagram', count: 1 },
    ],
    keyFindings: [
      'A new Telegram channel "PHBankDrops" was identified operating a high-volume bank account marketplace.',
      'Cross-platform seller "EWalletKing" confirmed active on Telegram, Facebook, and WhatsApp simultaneously.',
      'Dark web forum listings show a 31% increase in Southeast Asian financial credential offerings.',
      'Money mule recruitment ads are increasingly disguised as legitimate "work from home" opportunities.',
      'Explicit pricing in ads correlates strongly with organized criminal enterprise vs. opportunistic crime.',
    ],
  },
  {
    id: 'RPT-2026-09',
    title: 'September 2026 Threat Intelligence Report',
    generatedAt: '2026-10-01T00:00:00Z',
    period: { label: 'September 2026', start: '2026-09-01', end: '2026-09-30' },
    summary:
      'September 2026 recorded 187 threat detections, a 28% increase over August. Identity credential sales '
      + 'emerged as a growing threat vector, particularly "fullz" packages bundling multiple stolen identity elements. '
      + 'ATM card skimmer data from Southeast Asian POS terminals was a notable dark web commodity.',
    threatCount: 187,
    newThreats: 152,
    resolvedThreats: 89,
    topCategories: [
      { category: 'bank_account_sale', count: 58 },
      { category: 'identity_credential', count: 41 },
      { category: 'money_mule_recruitment', count: 35 },
      { category: 'atm_card_rental', count: 28 },
      { category: 'crypto_wallet', count: 15 },
      { category: 'payment_account', count: 10 },
    ],
    riskDistribution: { critical: 52, high: 71, medium: 48, low: 16 },
    topPlatforms: [
      { platform: 'Telegram', count: 74 },
      { platform: 'Dark Web Forum', count: 51 },
      { platform: 'Facebook', count: 31 },
      { platform: 'WhatsApp', count: 18 },
      { platform: 'Reddit', count: 9 },
      { platform: 'Twitter/X', count: 4 },
    ],
    keyFindings: [
      '"FullzFactory" dark web seller identified as a repeat high-volume vendor; linked to 41 confirmed ads.',
      'A coordinated money mule campaign targeted Cebu City with localized Facebook job postings.',
      'Philippine digital wallets (GCash, Maya) saw a 56% increase in illicit account offerings.',
      'First detection of AI-generated fake persona profiles used to pass KYC on Philippine digital banks.',
      'Monero overtook Bitcoin as the preferred payment method in dark web financial crime ads.',
    ],
  },
  {
    id: 'RPT-2026-08',
    title: 'August 2026 Threat Intelligence Report',
    generatedAt: '2026-09-01T00:00:00Z',
    period: { label: 'August 2026', start: '2026-08-01', end: '2026-08-31' },
    summary:
      'August 2026 established a new monthly record of 146 threat detections. Crypto wallet account sales '
      + 'grew rapidly as exchanges implemented stricter KYC, creating demand for pre-verified accounts. '
      + 'Cross-border operations linking the Philippines to US and UK financial systems were identified.',
    threatCount: 146,
    newThreats: 118,
    resolvedThreats: 72,
    topCategories: [
      { category: 'bank_account_sale', count: 48 },
      { category: 'crypto_wallet', count: 32 },
      { category: 'payment_account', count: 28 },
      { category: 'money_mule_recruitment', count: 21 },
      { category: 'atm_card_rental', count: 12 },
      { category: 'identity_credential', count: 5 },
    ],
    riskDistribution: { critical: 38, high: 55, medium: 41, low: 12 },
    topPlatforms: [
      { platform: 'Telegram', count: 61 },
      { platform: 'Dark Web Forum', count: 38 },
      { platform: 'Facebook', count: 24 },
      { platform: 'Instagram', count: 12 },
      { platform: 'WhatsApp', count: 8 },
      { platform: 'Reddit', count: 3 },
    ],
    keyFindings: [
      'Binance KYC Level 3 account prices rose 40% indicating high demand for US-verified crypto accounts.',
      'Instagram emerged as a new distribution channel for payment account fraud, especially targeting youth.',
      '"CashKing_PH" Telegram seller flagged across 12 separate reports; now classified as organized threat actor.',
      'Cross-jurisdictional links established between Philippine mule recruiters and UK cashout networks.',
      'Gift card cashout services increasingly used as a bridge layer between bank fraud and cryptocurrency.',
    ],
  },
];
