import type { Advertisement } from '../types';
import { computeRisk } from '../lib/riskEngine';

// ─── Raw ad data (without computed risk scores) ───────────────────────────────

const rawAds: Omit<Advertisement, 'riskScore' | 'riskLevel' | 'riskReasons'>[] = [
  {
    id: 'AD-001',
    title: '🔥 Fresh verified BDO bank account for sale – KYC passed',
    platform: 'Telegram',
    category: 'bank_account_sale',
    postedAt: '2026-10-12T03:14:00Z',
    detectedAt: '2026-10-12T03:45:12Z',
    content:
      'Selling fresh BDO bank account, fully KYC verified, original documents included. Ready for cashout. '
      + 'Accepting BTC or USDT only. No questions asked. Bulk discounts available. '
      + 'DM on Telegram for pricing. Trusted seller with 200+ successful transactions.',
    sourceUrl: 'https://t.me/c/financialdrops/34521',
    seller: {
      alias: 'CashKing_PH',
      platform: 'Telegram',
      joinedDate: '2026-07-15T00:00:00Z',
      postCount: 312,
      verifiedBadge: false,
      contactMethod: 'Telegram @cashking_ph',
    },
    status: 'confirmed_threat',
    tags: ['BDO', 'KYC', 'Philippines', 'bulk', 'BTC'],
    location: 'Philippines',
    priceOffered: '₱8,000 per account',
  },
  {
    id: 'AD-002',
    title: 'Rent ATM card for wire transfers – anonymous drops service',
    platform: 'Dark Web Forum',
    category: 'atm_card_rental',
    postedAt: '2026-10-11T18:22:00Z',
    detectedAt: '2026-10-11T19:05:33Z',
    content:
      'We provide ATM card rental service for wire transfer and cash drops. Cards are linked to real verified accounts. '
      + '70/30 split on all cashouts. Fully anonymous, all communications via Wickr. '
      + 'Operational in US, UK, and EU. Serious inquiries only. No law enforcement.',
    sourceUrl: 'https://dread.onion/d/fraudstuff/post/8821',
    seller: {
      alias: 'DropMaster_XO',
      platform: 'Dark Web Forum',
      joinedDate: '2025-11-01T00:00:00Z',
      postCount: 890,
      verifiedBadge: true,
      contactMethod: 'Wickr: dropmaster_xo',
    },
    status: 'confirmed_threat',
    tags: ['ATM', 'wire transfer', 'anonymous', 'US', 'UK', 'EU'],
    location: 'United States / United Kingdom',
    priceOffered: '70/30 revenue split',
  },
  {
    id: 'AD-003',
    title: 'Fullz for sale – SSN, DOB, bank login included',
    platform: 'Dark Web Forum',
    category: 'identity_credential',
    postedAt: '2026-10-10T11:00:00Z',
    detectedAt: '2026-10-10T12:30:00Z',
    content:
      'Premium fullz available: SSN, DOB, DL number, bank login credentials, email access. '
      + 'All tested and verified within 24h. Credit score 700+. Pricing: $45/each, bulk deals for 10+. '
      + 'Payment in Monero only. Contact via Jabber.',
    sourceUrl: 'https://alphabay.onion/listing/fullz-premium-4429',
    seller: {
      alias: 'FullzFactory',
      platform: 'Dark Web Forum',
      joinedDate: '2025-03-10T00:00:00Z',
      postCount: 1540,
      verifiedBadge: true,
      contactMethod: 'Jabber: fullzfactory@xmpp.jp',
    },
    status: 'confirmed_threat',
    tags: ['fullz', 'SSN', 'DOB', 'identity', 'bank login'],
    location: 'United States',
    priceOffered: '$45 per set',
  },
  {
    id: 'AD-004',
    title: 'Money mule needed – earn ₱15,000/week receiving transfers',
    platform: 'Facebook',
    category: 'money_mule_recruitment',
    postedAt: '2026-10-13T08:45:00Z',
    detectedAt: '2026-10-13T09:15:44Z',
    content:
      'Work from home opportunity! Receive bank transfers to your personal account and withdraw cash for us. '
      + 'Earn ₱15,000 per week. No experience needed. Must have active bank account. '
      + 'Training provided. WhatsApp us now for details. Legitimate work!',
    sourceUrl: 'https://facebook.com/groups/workfromhomeph/posts/93821',
    seller: {
      alias: 'WorkFromHome_PH',
      platform: 'Facebook',
      joinedDate: '2026-09-01T00:00:00Z',
      postCount: 47,
      verifiedBadge: false,
      contactMethod: 'WhatsApp +63 912 345 6789',
    },
    status: 'flagged',
    tags: ['money mule', 'recruitment', 'Philippines', 'work from home'],
    location: 'Philippines',
    priceOffered: '₱15,000/week',
  },
  {
    id: 'AD-005',
    title: 'BPI savings account for transfer – verified, with ATM card',
    platform: 'Telegram',
    category: 'bank_account_sale',
    postedAt: '2026-10-11T22:10:00Z',
    detectedAt: '2026-10-12T00:03:18Z',
    content:
      'BPI savings account for sale. Comes with ATM card, online banking credentials, and registered SIM. '
      + 'Account is 3 months old and active. Sell price ₱12,000. '
      + 'Escrow available via trusted middleman. DM for sample screenshots.',
    sourceUrl: 'https://t.me/c/phbankdrops/18943',
    seller: {
      alias: 'BankShop_PHL',
      platform: 'Telegram',
      joinedDate: '2026-06-20T00:00:00Z',
      postCount: 198,
      verifiedBadge: false,
      contactMethod: 'Telegram @bankshop_phl',
    },
    status: 'under_review',
    tags: ['BPI', 'ATM card', 'Philippines', 'savings account'],
    location: 'Philippines',
    priceOffered: '₱12,000',
  },
  {
    id: 'AD-006',
    title: 'Crypto wallet with balance – anonymous, no KYC exchange',
    platform: 'Twitter/X',
    category: 'crypto_wallet',
    postedAt: '2026-10-09T15:30:00Z',
    detectedAt: '2026-10-09T16:10:22Z',
    content:
      'Selling aged Binance accounts with no KYC, pre-loaded with USDT. '
      + 'Also have self-custody wallets with clean history. Prices start at $30. '
      + 'DM for details. Only serious buyers. Paying in BTC or XMR.',
    sourceUrl: 'https://x.com/cryptodrops99/status/1843221098',
    seller: {
      alias: 'CryptoDrops99',
      platform: 'Twitter/X',
      joinedDate: '2026-01-05T00:00:00Z',
      postCount: 220,
      verifiedBadge: false,
      contactMethod: 'Twitter/X DM',
    },
    status: 'flagged',
    tags: ['Binance', 'crypto', 'no KYC', 'USDT', 'anonymous'],
    priceOffered: 'From $30',
  },
  {
    id: 'AD-007',
    title: 'GCash and Maya accounts – verified with selfie bypass',
    platform: 'Telegram',
    category: 'payment_account',
    postedAt: '2026-10-13T06:00:00Z',
    detectedAt: '2026-10-13T07:22:11Z',
    content:
      'Selling fully verified GCash and Maya accounts. Selfie verification bypassed using real ID overlays. '
      + 'Each account comes with registered number. Send/receive limit unlocked. '
      + 'Bulk orders accepted. Price: ₱3,500 each. Trusted seller since 2024.',
    sourceUrl: 'https://t.me/c/phwalletshop/5521',
    seller: {
      alias: 'EWalletKing',
      platform: 'Telegram',
      joinedDate: '2024-08-12T00:00:00Z',
      postCount: 680,
      verifiedBadge: true,
      contactMethod: 'Telegram @ewalletking',
    },
    status: 'confirmed_threat',
    tags: ['GCash', 'Maya', 'e-wallet', 'Philippines', 'KYC bypass'],
    location: 'Philippines',
    priceOffered: '₱3,500 per account',
  },
  {
    id: 'AD-008',
    title: 'Looking for drops – US bank accounts, $500 signing bonus',
    platform: 'Reddit',
    category: 'money_mule_recruitment',
    postedAt: '2026-10-08T20:14:00Z',
    detectedAt: '2026-10-08T21:00:55Z',
    content:
      'Need reliable drops with active US bank accounts (Chase, BofA, Wells Fargo preferred). '
      + '$500 signing bonus, 20% cut per transfer. Weekly payouts via Zelle. '
      + 'Must be able to receive $5,000–$20,000 per transfer. '
      + 'High volume, consistent work. Apply via Signal.',
    sourceUrl: 'https://reddit.com/r/jobs4crypto/comments/abc123',
    seller: {
      alias: 'USDropRecruiter',
      platform: 'Reddit',
      joinedDate: '2026-05-18T00:00:00Z',
      postCount: 62,
      verifiedBadge: false,
      contactMethod: 'Signal: +1-555-0192',
    },
    status: 'under_review',
    tags: ['money mule', 'US bank', 'Chase', 'drops', 'recruitment'],
    location: 'United States',
    priceOffered: '$500 bonus + 20% cut',
  },
  {
    id: 'AD-009',
    title: 'Metrobank account for sale – corporate type, high limits',
    platform: 'WhatsApp',
    category: 'bank_account_sale',
    postedAt: '2026-10-07T10:00:00Z',
    detectedAt: '2026-10-07T11:45:00Z',
    content:
      'Selling Metrobank corporate account with high daily transaction limits (₱2M/day). '
      + 'Comes with internet banking, checkbook, and debit card. '
      + 'All documents in seller\'s name – can transfer ownership. '
      + 'Asking ₱45,000. Serious buyers only, face to face deal in Metro Manila.',
    sourceUrl: 'https://wa.me/message/XKSJ9291',
    seller: {
      alias: 'CorpAcctSeller',
      platform: 'WhatsApp',
      joinedDate: '2026-03-01T00:00:00Z',
      postCount: 28,
      verifiedBadge: false,
      contactMethod: 'WhatsApp +63 917 000 1122',
    },
    status: 'flagged',
    tags: ['Metrobank', 'corporate', 'high limit', 'Philippines'],
    location: 'Metro Manila, Philippines',
    priceOffered: '₱45,000',
  },
  {
    id: 'AD-010',
    title: 'Binance verified account – level 3 KYC, US person',
    platform: 'Telegram',
    category: 'crypto_wallet',
    postedAt: '2026-10-06T14:22:00Z',
    detectedAt: '2026-10-06T15:00:10Z',
    content:
      'Selling Binance account verified to Level 3 (US government ID). '
      + 'Aged account, no suspicious history, $50,000 withdrawal limit. '
      + 'Includes email access and 2FA backup. Price: $180 USDT. '
      + 'Also available: Coinbase, Kraken, and KuCoin accounts.',
    sourceUrl: 'https://t.me/c/cryptoaccsales/9920',
    seller: {
      alias: 'CryptoAccShop',
      platform: 'Telegram',
      joinedDate: '2025-09-14T00:00:00Z',
      postCount: 455,
      verifiedBadge: true,
      contactMethod: 'Telegram @cryptoaccshop',
    },
    status: 'confirmed_threat',
    tags: ['Binance', 'KYC Level 3', 'crypto', 'US account'],
    location: 'United States',
    priceOffered: '$180 USDT',
  },
  {
    id: 'AD-011',
    title: 'UK Barclays account with online access – good history',
    platform: 'Dark Web Forum',
    category: 'bank_account_sale',
    postedAt: '2026-10-05T09:00:00Z',
    detectedAt: '2026-10-05T10:15:30Z',
    content:
      'Barclays personal account with 18 months history, online banking access, debit card. '
      + 'Balance: £1,200. Ready for transfers. Price: £400 in Bitcoin. '
      + 'I also have Lloyds and HSBC accounts available. All tested within last 48h.',
    sourceUrl: 'https://genesis.onion/listing/uk-barclays-8821',
    seller: {
      alias: 'UKBankSeller',
      platform: 'Dark Web Forum',
      joinedDate: '2025-06-01T00:00:00Z',
      postCount: 330,
      verifiedBadge: false,
      contactMethod: 'Wickr: ukbankseller_22',
    },
    status: 'confirmed_threat',
    tags: ['Barclays', 'UK bank', 'online banking', 'BTC'],
    location: 'United Kingdom',
    priceOffered: '£400 BTC',
  },
  {
    id: 'AD-012',
    title: 'Freelancer account – PayPal + Wise verified, US address',
    platform: 'Instagram',
    category: 'payment_account',
    postedAt: '2026-10-04T16:45:00Z',
    detectedAt: '2026-10-04T18:00:00Z',
    content:
      'Selling verified PayPal Business and Wise accounts with US address confirmation. '
      + 'PayPal account aged 2 years, no limitations, receiving limit removed. '
      + 'Wise account: verified US individual, up to $50,000/month. '
      + 'Price: $90 for PayPal, $70 for Wise. Contact via Instagram DM.',
    sourceUrl: 'https://instagram.com/p/CzX8821paypalshop',
    seller: {
      alias: 'PayAccShop',
      platform: 'Instagram',
      joinedDate: '2026-02-14T00:00:00Z',
      postCount: 89,
      verifiedBadge: false,
      contactMethod: 'Instagram DM @payaccshop',
    },
    status: 'under_review',
    tags: ['PayPal', 'Wise', 'US account', 'payment'],
    location: 'United States',
    priceOffered: '$70–$90',
  },
  {
    id: 'AD-013',
    title: 'Mule recruiter – PH nationals only, ₱20K/week guaranteed',
    platform: 'Facebook',
    category: 'money_mule_recruitment',
    postedAt: '2026-10-13T11:30:00Z',
    detectedAt: '2026-10-13T12:00:00Z',
    content:
      'URGENT HIRING: We need account holders who can receive online transfers. '
      + '₱20,000 per week guaranteed. No experience required. '
      + 'Must have BPI, BDO, or Metrobank account. Must be willing to withdraw and remit funds. '
      + 'Apply now – limited slots. Message us on Facebook.',
    sourceUrl: 'https://facebook.com/groups/onlinejobsph/posts/44891',
    seller: {
      alias: 'OnlineJobsPH2026',
      platform: 'Facebook',
      joinedDate: '2026-09-28T00:00:00Z',
      postCount: 14,
      verifiedBadge: false,
      contactMethod: 'Facebook Messenger',
    },
    status: 'flagged',
    tags: ['money mule', 'Philippines', 'recruitment', 'BPI', 'BDO'],
    location: 'Philippines',
    priceOffered: '₱20,000/week',
  },
  {
    id: 'AD-014',
    title: 'Chase and BofA account access – tested logins available',
    platform: 'Dark Web Forum',
    category: 'bank_account_sale',
    postedAt: '2026-10-03T22:15:00Z',
    detectedAt: '2026-10-04T00:30:00Z',
    content:
      'Selling tested Chase and Bank of America account logins. '
      + 'Balances range $2,000–$15,000. Online access, mobile app confirmed working. '
      + 'No 2FA issues – bypassed. Prices start at $50. XMR preferred. '
      + 'Bulk discount: 5+ accounts at 30% off. Contact via Session.',
    sourceUrl: 'https://monopoly.onion/listing/us-banks-logins-7723',
    seller: {
      alias: 'BankLoginPro',
      platform: 'Dark Web Forum',
      joinedDate: '2025-01-10T00:00:00Z',
      postCount: 2100,
      verifiedBadge: true,
      contactMethod: 'Session: 05f3a8...',
    },
    status: 'confirmed_threat',
    tags: ['Chase', 'Bank of America', 'US bank', 'login', 'credentials'],
    location: 'United States',
    priceOffered: 'From $50',
  },
  {
    id: 'AD-015',
    title: 'Aged PayMaya account – 6 months history, fully verified',
    platform: 'WhatsApp',
    category: 'payment_account',
    postedAt: '2026-10-02T08:00:00Z',
    detectedAt: '2026-10-02T09:10:22Z',
    content:
      'Selling aged PayMaya (now Maya) account with 6 months transaction history. '
      + 'Fully verified, Tier 2 upgrade done. ₱100,000 monthly limit unlocked. '
      + 'No restrictions. ₱4,000 per account or 3 for ₱10,000. '
      + 'Proof of ownership transfer included. WhatsApp only.',
    sourceUrl: 'https://wa.me/message/PAYMAYA9821',
    seller: {
      alias: 'MayaShopPH',
      platform: 'WhatsApp',
      joinedDate: '2026-01-15T00:00:00Z',
      postCount: 143,
      verifiedBadge: false,
      contactMethod: 'WhatsApp +63 927 111 2233',
    },
    status: 'under_review',
    tags: ['Maya', 'PayMaya', 'Philippines', 'e-wallet'],
    location: 'Philippines',
    priceOffered: '₱4,000 each',
  },
  {
    id: 'AD-016',
    title: 'Gift card cashout service – Visa/MC, 60% payout guaranteed',
    platform: 'Telegram',
    category: 'payment_account',
    postedAt: '2026-10-01T13:00:00Z',
    detectedAt: '2026-10-01T14:20:11Z',
    content:
      'We buy gift cards (Visa, Mastercard, Amazon, iTunes) at 60% of face value. '
      + 'Instant payout via BTC or GCash. No questions. '
      + 'Accepting denominations from $25 to $1,000. '
      + 'High volume sellers get better rates – up to 70%. Telegram bot available.',
    sourceUrl: 'https://t.me/c/giftcardcashout/7721',
    seller: {
      alias: 'GCashoutBot',
      platform: 'Telegram',
      joinedDate: '2026-04-01T00:00:00Z',
      postCount: 560,
      verifiedBadge: true,
      contactMethod: 'Telegram Bot @gcashoutbot',
    },
    status: 'flagged',
    tags: ['gift card', 'cashout', 'Visa', 'Amazon', 'BTC'],
    priceOffered: '60–70% of face value',
  },
  {
    id: 'AD-017',
    title: 'SSS and PhilHealth IDs with matching bank account',
    platform: 'Telegram',
    category: 'identity_credential',
    postedAt: '2026-09-30T07:45:00Z',
    detectedAt: '2026-09-30T08:30:00Z',
    content:
      'Complete identity package for sale: SSS ID, PhilHealth card, postal ID, and matching BDO bank account. '
      + 'All authentic-looking documents. Perfect for bank account opening. '
      + 'Price: ₱25,000 complete package. DM on Telegram.',
    sourceUrl: 'https://t.me/c/phidmarket/3321',
    seller: {
      alias: 'PHIDMarket',
      platform: 'Telegram',
      joinedDate: '2025-12-01T00:00:00Z',
      postCount: 410,
      verifiedBadge: false,
      contactMethod: 'Telegram @phidmarket',
    },
    status: 'confirmed_threat',
    tags: ['SSS', 'PhilHealth', 'fake ID', 'Philippines', 'identity fraud'],
    location: 'Philippines',
    priceOffered: '₱25,000 package',
  },
  {
    id: 'AD-018',
    title: 'Skimmer data for sale – POS terminals, 500 cards batch',
    platform: 'Dark Web Forum',
    category: 'atm_card_rental',
    postedAt: '2026-09-28T21:00:00Z',
    detectedAt: '2026-09-29T00:15:00Z',
    content:
      'Fresh POS skimmer dump available: 500 cards with PIN data from Southeast Asia. '
      + 'Valid rate: 85%. Track 1+2 data provided. '
      + 'Batch price: $1,200 for all 500 cards. XMR or BTC only. '
      + 'Sample cards available for verification. Fast delivery via secure channel.',
    sourceUrl: 'https://bohemia.onion/listing/pos-dump-se-asia-881',
    seller: {
      alias: 'DumpKing_SE',
      platform: 'Dark Web Forum',
      joinedDate: '2024-10-15T00:00:00Z',
      postCount: 3200,
      verifiedBadge: true,
      contactMethod: 'Wickr: dumpkingse',
    },
    status: 'confirmed_threat',
    tags: ['skimmer', 'card dump', 'POS', 'Southeast Asia', 'PIN'],
    location: 'Southeast Asia',
    priceOffered: '$1,200 / 500 cards',
  },
  {
    id: 'AD-019',
    title: 'Looking for mules – Cebu, Davao, Manila – daily work',
    platform: 'Facebook',
    category: 'money_mule_recruitment',
    postedAt: '2026-10-13T14:00:00Z',
    detectedAt: '2026-10-13T15:30:00Z',
    content:
      'Wanted: trusted account holders in Cebu, Davao, and Manila for daily transfer jobs. '
      + 'You receive funds, withdraw, and keep 10%. '
      + 'Daily work, consistent income. Must be 18+ with valid ID and active bank account. '
      + 'Message on Facebook for interview.',
    sourceUrl: 'https://facebook.com/groups/cebujobs2026/posts/81122',
    seller: {
      alias: 'PHTransferJobs',
      platform: 'Facebook',
      joinedDate: '2026-10-01T00:00:00Z',
      postCount: 9,
      verifiedBadge: false,
      contactMethod: 'Facebook Messenger',
    },
    status: 'flagged',
    tags: ['money mule', 'Cebu', 'Davao', 'Manila', 'recruitment'],
    location: 'Philippines',
    priceOffered: '10% cut per transfer',
  },
  {
    id: 'AD-020',
    title: 'AUB and Landbank accounts – clean history, ready to use',
    platform: 'WhatsApp',
    category: 'bank_account_sale',
    postedAt: '2026-10-08T12:00:00Z',
    detectedAt: '2026-10-08T13:15:44Z',
    content:
      'Selling Asia United Bank and Landbank accounts with clean transaction history. '
      + 'All accounts have working debit cards and internet banking. '
      + 'AUB: ₱9,500 | Landbank: ₱11,000. '
      + 'Can deliver via LBC nationwide. Escrow accepted.',
    sourceUrl: 'https://wa.me/message/AUBLAND8821',
    seller: {
      alias: 'BankAccPH',
      platform: 'WhatsApp',
      joinedDate: '2026-07-01T00:00:00Z',
      postCount: 76,
      verifiedBadge: false,
      contactMethod: 'WhatsApp +63 933 444 5566',
    },
    status: 'under_review',
    tags: ['AUB', 'Landbank', 'Philippines', 'debit card'],
    location: 'Philippines',
    priceOffered: '₱9,500–₱11,000',
  },
];

// ─── Compute risk scores and export ─────────────────────────────────────────

export const advertisements: Advertisement[] = rawAds.map(ad => ({
  ...ad,
  ...computeRisk(ad),
}));

export const recentAlerts = advertisements
  .filter(a => a.riskLevel === 'critical' || a.riskLevel === 'high')
  .sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
  .slice(0, 8);
