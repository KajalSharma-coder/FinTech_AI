import type { Investigation, AdStatus, RiskLevel } from '../types';

// ─── Investigations ───────────────────────────────────────────────────────────

const INVESTIGATIONS_KEY = 'tracefin_investigations';

export type InvestigationStorageResult =
  | { kind: 'missing'; investigations: Investigation[] }
  | { kind: 'valid'; investigations: Investigation[] }
  | { kind: 'malformed'; investigations: Investigation[] };

const INVESTIGATION_STATUSES: Investigation['status'][] = ['open', 'in_progress', 'closed'];
const RISK_LEVELS: RiskLevel[] = ['critical', 'high', 'medium', 'low'];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeInvestigation(value: unknown): Investigation | null {
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;

  // These fields are needed by the investigation UI and are not safely inferable.
  if (!isNonEmptyString(record.id) || !isNonEmptyString(record.title)) return null;
  if (!INVESTIGATION_STATUSES.includes(record.status as Investigation['status'])) return null;
  if (!Array.isArray(record.tags) || !record.tags.every(isNonEmptyString)) return null;
  if (!Array.isArray(record.linkedAdIds) || !record.linkedAdIds.every(isNonEmptyString)) return null;
  if (typeof record.notes !== 'string') return null;

  const priority = RISK_LEVELS.includes(record.priority as RiskLevel)
    ? record.priority as RiskLevel
    : 'medium';
  const now = new Date().toISOString();

  return {
    ...record,
    id: record.id,
    title: record.title,
    createdAt: isNonEmptyString(record.createdAt) ? record.createdAt : now,
    updatedAt: isNonEmptyString(record.updatedAt) ? record.updatedAt : now,
    status: record.status as Investigation['status'],
    priority,
    linkedAdIds: record.linkedAdIds,
    notes: record.notes,
    analyst: isNonEmptyString(record.analyst) ? record.analyst : 'A. Reyes',
    tags: record.tags,
  };
}

export function loadInvestigationsState(): InvestigationStorageResult {
  try {
    const raw = localStorage.getItem(INVESTIGATIONS_KEY);
    if (raw === null) return { kind: 'missing', investigations: [] };

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Keep the malformed raw value untouched; callers must not overwrite it automatically.
      return { kind: 'malformed', investigations: [] };
    }

    if (!Array.isArray(parsed)) return { kind: 'malformed', investigations: [] };
    const investigations = parsed
      .map(normalizeInvestigation)
      .filter((investigation): investigation is Investigation => investigation !== null);
    return { kind: 'valid', investigations };
  } catch {
    return { kind: 'malformed', investigations: [] };
  }
}

export function hasStoredInvestigations(): boolean {
  try {
    return localStorage.getItem(INVESTIGATIONS_KEY) !== null;
  } catch {
    return false;
  }
}

export function loadInvestigations(): Investigation[] {
  return loadInvestigationsState().investigations;
}

export function saveInvestigations(investigations: Investigation[]): void {
  try {
    localStorage.setItem(INVESTIGATIONS_KEY, JSON.stringify(investigations));
  } catch {
    // Quota exceeded or private browsing — fail silently
  }
}

// ─── Advertisement statuses ───────────────────────────────────────────────────
// Only status overrides are stored — the rest of the ad data stays in the
// static dataset. This keeps localStorage small and the risk scores intact.

const AD_STATUSES_KEY = 'tracefin_ad_statuses';

export type AdStatusMap = Record<string, AdStatus>;

export function loadAdStatuses(): AdStatusMap {
  try {
    const raw = localStorage.getItem(AD_STATUSES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) return {};
    // Validate each value is a known status string
    const valid: AdStatusMap = {};
    const allowed: AdStatus[] = ['flagged', 'under_review', 'confirmed_threat', 'dismissed'];
    for (const [key, val] of Object.entries(parsed)) {
      if (typeof key === 'string' && allowed.includes(val as AdStatus)) {
        valid[key] = val as AdStatus;
      }
    }
    return valid;
  } catch {
    return {};
  }
}

export function saveAdStatus(id: string, status: AdStatus): void {
  try {
    const current = loadAdStatuses();
    current[id] = status;
    localStorage.setItem(AD_STATUSES_KEY, JSON.stringify(current));
  } catch {
    // fail silently
  }
}

export function loadAdStatusesRaw(): string | null {
  try {
    return localStorage.getItem(AD_STATUSES_KEY);
  } catch {
    return null;
  }
}
