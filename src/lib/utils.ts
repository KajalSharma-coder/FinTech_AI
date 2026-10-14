import type { RiskLevel, AdCategory, Platform } from '../types';

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function riskBadgeClass(level: RiskLevel): string {
  return {
    critical: 'badge-critical',
    high: 'badge-high',
    medium: 'badge-medium',
    low: 'badge-low',
  }[level];
}

export function riskHex(level: RiskLevel): string {
  return { critical: '#dc2626', high: '#d97706', medium: '#ca8a04', low: '#16a34a' }[level];
}

export function riskBg(level: RiskLevel): string {
  return {
    critical: 'bg-critical-bg border-critical-border text-critical',
    high:     'bg-high-bg border-high-border text-high',
    medium:   'bg-medium-bg border-medium-border text-medium',
    low:      'bg-low-bg border-low-border text-low',
  }[level];
}

export function riskDot(level: RiskLevel): string {
  return { critical: 'dot-critical', high: 'dot-high', medium: 'dot-medium', low: 'dot-low' }[level];
}

export function statusBadgeClass(status: string): string {
  return {
    flagged:          'bg-high-bg text-high border-high-border',
    under_review:     'bg-blue-50 text-blue-700 border-blue-200',
    confirmed_threat: 'bg-critical-bg text-critical border-critical-border',
    dismissed:        'bg-surface-2 text-muted border-border',
    open:             'bg-high-bg text-high border-high-border',
    in_progress:      'bg-blue-50 text-blue-700 border-blue-200',
    closed:           'bg-low-bg text-low border-low-border',
  }[status] ?? 'bg-surface-2 text-muted border-border';
}

export function categoryLabel(cat: AdCategory): string {
  return {
    bank_account_sale:      'Bank Account Sale',
    atm_card_rental:        'ATM Card Rental',
    identity_credential:    'Identity Credential',
    money_mule_recruitment: 'Money Mule Recruit',
    crypto_wallet:          'Crypto Wallet',
    payment_account:        'Payment Account',
  }[cat] ?? cat;
}

export function statusLabel(status: string): string {
  return {
    flagged:          'Flagged',
    under_review:     'Under Review',
    confirmed_threat: 'Confirmed Threat',
    dismissed:        'Dismissed',
    open:             'Open',
    in_progress:      'In Progress',
    closed:           'Closed',
  }[status] ?? status;
}

export function platformColor(platform: Platform): string {
  return {
    Telegram:       'bg-blue-50 text-blue-700 border-blue-200',
    Facebook:       'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Twitter/X':    'bg-slate-50 text-slate-700 border-slate-200',
    'Dark Web Forum':'bg-red-50 text-red-700 border-red-200',
    WhatsApp:       'bg-green-50 text-green-700 border-green-200',
    Reddit:         'bg-orange-50 text-orange-700 border-orange-200',
    Instagram:      'bg-pink-50 text-pink-700 border-pink-200',
    Other:          'bg-surface-2 text-muted border-border',
  }[platform] ?? 'bg-surface-2 text-muted border-border';
}

export function truncate(str: string, len = 90): string {
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export function generateId(): string {
  return 'INV-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function exportToCSV(rows: Record<string, unknown>[], filename: string): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const val = String(row[h] ?? '').replace(/"/g, '""');
        return `"${val}"`;
      }).join(',')
    ),
  ];
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
