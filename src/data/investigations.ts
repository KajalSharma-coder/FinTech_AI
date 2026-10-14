import type { Investigation } from '../types';

export const seedInvestigations: Investigation[] = [
  {
    id: 'INV-A1B2C3',
    title: 'Telegram Bank Account Marketplace — "PHBankDrops" Channel',
    createdAt: '2026-10-10T08:00:00Z',
    updatedAt: '2026-10-13T14:30:00Z',
    status: 'in_progress',
    priority: 'critical',
    linkedAdIds: ['AD-001', 'AD-005', 'AD-009', 'AD-020'],
    notes:
      'Initial detection on Oct 10. Channel "PHBankDrops" identified as central hub for Philippine bank account trading. '
      + 'Sellers CashKing_PH and BankShop_PHL appear to be the same entity based on writing style and pricing strategy. '
      + 'Possible connection to broader Southeast Asian crime network. '
      + 'Recommend referral to BSP Financial Intelligence Unit.',
    analyst: 'A. Reyes',
    tags: ['Telegram', 'Philippines', 'bank account', 'organized'],
  },
  {
    id: 'INV-D4E5F6',
    title: 'Dark Web Fullz Marketplace — "FullzFactory" Seller Profile',
    createdAt: '2026-10-08T10:00:00Z',
    updatedAt: '2026-10-12T09:15:00Z',
    status: 'open',
    priority: 'critical',
    linkedAdIds: ['AD-003', 'AD-011', 'AD-014', 'AD-018'],
    notes:
      'High-volume dark web seller active across multiple forums. '
      + '1,500+ posts in under 8 months indicates professional, organized operation. '
      + 'Selling US and UK bank credentials with verified success rates. '
      + 'OSINT reveals possible Eastern European origin based on timezone of posting activity. '
      + 'Awaiting additional intelligence from partner agencies.',
    analyst: 'M. Santos',
    tags: ['dark web', 'fullz', 'US bank', 'UK bank', 'high volume'],
  },
  {
    id: 'INV-G7H8I9',
    title: 'Facebook Money Mule Recruitment — Metro Manila Operations',
    createdAt: '2026-10-13T12:00:00Z',
    updatedAt: '2026-10-13T16:00:00Z',
    status: 'open',
    priority: 'high',
    linkedAdIds: ['AD-004', 'AD-013', 'AD-019'],
    notes:
      'Three coordinated recruitment ads detected on Facebook within 4 hours on Oct 13. '
      + 'All targeting Philippine nationals in Cebu, Davao, and Metro Manila. '
      + 'Language and offer structure suggest same operator using multiple Facebook accounts. '
      + 'Reported to NBI Cybercrime Division.',
    analyst: 'J. Cruz',
    tags: ['Facebook', 'money mule', 'Philippines', 'recruitment', 'coordinated'],
  },
  {
    id: 'INV-J1K2L3',
    title: 'Cross-Platform Crypto Wallet Sales — US-Verified Accounts',
    createdAt: '2026-10-06T09:00:00Z',
    updatedAt: '2026-10-10T11:00:00Z',
    status: 'closed',
    priority: 'high',
    linkedAdIds: ['AD-006', 'AD-010'],
    notes:
      'Investigation into US-verified Binance and Coinbase account sales. '
      + 'Seller "CryptoAccShop" confirmed offering Level 3 KYC Binance accounts. '
      + 'Intelligence shared with Binance Compliance team. '
      + 'Accounts have since been flagged and suspended. Case closed — threat neutralized.',
    analyst: 'A. Reyes',
    tags: ['Binance', 'Coinbase', 'crypto', 'US', 'resolved'],
  },
  {
    id: 'INV-M4N5O6',
    title: 'Philippine E-Wallet KYC Bypass Operation',
    createdAt: '2026-10-07T14:00:00Z',
    updatedAt: '2026-10-13T10:00:00Z',
    status: 'in_progress',
    priority: 'critical',
    linkedAdIds: ['AD-007', 'AD-015'],
    notes:
      'Seller "EWalletKing" is systematically bypassing KYC processes for GCash and Maya. '
      + 'Method involves using real ID overlays — a sophisticated technique suggesting technical capability. '
      + 'Accounts being sold with Tier 2 limits (₱100K/month) represent significant fraud risk. '
      + 'Coordinating with GCash and Maya compliance teams for account freezes.',
    analyst: 'M. Santos',
    tags: ['GCash', 'Maya', 'KYC bypass', 'Philippines', 'e-wallet'],
  },
];
