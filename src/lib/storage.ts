import type { Investigation, AdStatus, Advertisement, EvidenceRecord, EvidenceHistoryEntry, EvidenceType, Platform, CollectionMethod, RiskLevel, Alert, AlertAuditEntry, AlertStatus, AlertType } from '../types';

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

// ─── Imported advertisements ────────────────────────────────────────────────

const IMPORTED_ADVERTISEMENTS_KEY = 'tracefin_imported_advertisements';

export type ImportedAdvertisementStorageResult =
  | { kind: 'missing'; advertisements: Advertisement[] }
  | { kind: 'valid'; advertisements: Advertisement[] }
  | { kind: 'malformed'; advertisements: Advertisement[] };

function isStoredAdvertisement(value: unknown): value is Advertisement {
  if (typeof value !== 'object' || value === null) return false;
  const ad = value as Record<string, unknown>;
  const seller = ad.seller as Record<string, unknown> | undefined;
  return typeof ad.id === 'string' && typeof ad.title === 'string'
    && typeof ad.content === 'string' && typeof ad.sourceUrl === 'string'
    && typeof ad.platform === 'string' && typeof ad.category === 'string'
    && typeof ad.status === 'string' && typeof ad.riskScore === 'number'
    && Array.isArray(ad.riskReasons) && Array.isArray(ad.tags)
    && typeof seller?.alias === 'string' && typeof seller.platform === 'string';
}

export function loadImportedAdvertisementsState(): ImportedAdvertisementStorageResult {
  try {
    const raw = localStorage.getItem(IMPORTED_ADVERTISEMENTS_KEY);
    if (raw === null) return { kind: 'missing', advertisements: [] };
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return { kind: 'malformed', advertisements: [] }; }
    if (!Array.isArray(parsed)) return { kind: 'malformed', advertisements: [] };
    return {
      kind: 'valid',
      advertisements: parsed.filter(isStoredAdvertisement),
    };
  } catch {
    return { kind: 'malformed', advertisements: [] };
  }
}

export function saveImportedAdvertisements(advertisements: Advertisement[]): void {
  try {
    localStorage.setItem(IMPORTED_ADVERTISEMENTS_KEY, JSON.stringify(advertisements));
  } catch {
    // Quota exceeded or private browsing — fail silently.
  }
}

// ─── Evidence Vault ──────────────────────────────────────────────────────────

export const EVIDENCE_STORAGE_KEY = 'tracefin_evidence_v1';
export const EVIDENCE_STORAGE_VERSION = 1;

export type EvidenceStorageResult =
  | { kind: 'missing'; records: EvidenceRecord[] }
  | { kind: 'valid'; records: EvidenceRecord[] }
  | { kind: 'malformed'; records: EvidenceRecord[] };

const EVIDENCE_TYPES: EvidenceType[] = ['advertisement_snapshot', 'image_attachment'];
const PLATFORMS: Platform[] = ['Telegram', 'Facebook', 'Twitter/X', 'Dark Web Forum', 'WhatsApp', 'Reddit', 'Instagram', 'Other'];
const COLLECTION_METHODS: CollectionMethod[] = ['synthetic_demo', 'manual_entry', 'csv_import', 'json_import', 'public_source'];
const HISTORY_ACTIONS: EvidenceHistoryEntry['action'][] = ['created', 'updated', 'linked', 'unlinked'];

function isValidHistoryEntry(value: unknown): value is EvidenceHistoryEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return HISTORY_ACTIONS.includes(entry.action as EvidenceHistoryEntry['action'])
    && typeof entry.timestamp === 'string'
    && typeof entry.actor === 'string'
    && (entry.note === undefined || typeof entry.note === 'string');
}

export function isValidEvidenceRecord(value: unknown): value is EvidenceRecord {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string' && record.id.trim().length > 0
    && typeof record.advertisementId === 'string' && record.advertisementId.trim().length > 0
    && EVIDENCE_TYPES.includes(record.evidenceType as EvidenceType)
    && (record.investigationId === undefined || typeof record.investigationId === 'string')
    && typeof record.sourceUrl === 'string'
    && PLATFORMS.includes(record.platform as Platform)
    && typeof record.capturedAt === 'string'
    && COLLECTION_METHODS.includes(record.collectionMethod as CollectionMethod)
    && Array.isArray(record.matchedIndicators)
    && record.matchedIndicators.every(indicator => typeof indicator === 'object' && indicator !== null
      && typeof (indicator as Record<string, unknown>).id === 'string'
      && typeof (indicator as Record<string, unknown>).advertisementId === 'string'
      && typeof (indicator as Record<string, unknown>).type === 'string'
      && typeof (indicator as Record<string, unknown>).matchedValue === 'string'
      && typeof (indicator as Record<string, unknown>).maskedDisplayValue === 'string'
      && typeof (indicator as Record<string, unknown>).sourceEvidence === 'string')
    && Array.isArray(record.riskExplanation)
    && record.riskExplanation.every(reason => typeof reason === 'object' && reason !== null
      && typeof (reason as Record<string, unknown>).factor === 'string'
      && typeof (reason as Record<string, unknown>).description === 'string'
      && typeof (reason as Record<string, unknown>).weight === 'number'
      && typeof (reason as Record<string, unknown>).maxWeight === 'number')
    && typeof record.investigatorNotes === 'string'
    && typeof record.createdAt === 'string'
    && Array.isArray(record.history)
    && record.history.length > 0
    && record.history.every(isValidHistoryEntry)
    && (record.fileHash === undefined || typeof record.fileHash === 'string')
    && (record.fileName === undefined || typeof record.fileName === 'string')
    && (record.fileMimeType === undefined || typeof record.fileMimeType === 'string')
    && (record.fileSize === undefined || (typeof record.fileSize === 'number' && record.fileSize >= 0))
    && (record.ocrText === undefined || typeof record.ocrText === 'string')
    && (record.reviewedText === undefined || typeof record.reviewedText === 'string')
    && (record.ocrConfidence === undefined || (typeof record.ocrConfidence === 'number' && record.ocrConfidence >= 0 && record.ocrConfidence <= 100))
    && (record.ocrExtractedAt === undefined || typeof record.ocrExtractedAt === 'string')
    && (record.verificationFindings === undefined || (Array.isArray(record.verificationFindings) && record.verificationFindings.every(finding => {
      if (typeof finding !== 'object' || finding === null) return false;
      const item = finding as Record<string, unknown>;
      return typeof item.id === 'string' && (item.kind === 'format' || item.kind === 'suspicious_content')
        && typeof item.matchedValue === 'string' && typeof item.reason === 'string'
        && (item.source === 'ocr_extracted' || item.source === 'user_corrected' || item.source === 'manual_entry' || item.source === 'automated_detected')
        && (item.indicatorId === undefined || typeof item.indicatorId === 'string');
    })));
}

export function parseEvidenceStorage(raw: string | null): EvidenceStorageResult {
  if (raw === null) return { kind: 'missing', records: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { kind: 'malformed', records: [] };
    const envelope = parsed as Record<string, unknown>;
    if (envelope.version !== EVIDENCE_STORAGE_VERSION || !Array.isArray(envelope.records)) {
      return { kind: 'malformed', records: [] };
    }
    const records: EvidenceRecord[] = [];
    const ids = new Set<string>();
    for (const value of envelope.records) {
      if (!isValidEvidenceRecord(value)) continue;
      if (ids.has(value.id)) continue;
      ids.add(value.id);
      records.push(value);
    }
    return { kind: 'valid', records };
  } catch {
    // The raw malformed value remains untouched; callers must not overwrite it automatically.
    return { kind: 'malformed', records: [] };
  }
}

export function loadEvidenceState(): EvidenceStorageResult {
  try {
    return parseEvidenceStorage(localStorage.getItem(EVIDENCE_STORAGE_KEY));
  } catch {
    return { kind: 'malformed', records: [] };
  }
}

export function saveEvidence(records: EvidenceRecord[]): void {
  try {
    const unique = records.filter((record, index, all) => isValidEvidenceRecord(record) && all.findIndex(candidate => candidate.id === record.id) === index);
    localStorage.setItem(EVIDENCE_STORAGE_KEY, JSON.stringify({ version: EVIDENCE_STORAGE_VERSION, records: unique }));
  } catch {
    // Quota exceeded or private browsing — fail silently.
  }
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

export const ALERTS_STORAGE_KEY = 'tracefin_alerts_v1';
export const ALERTS_STORAGE_VERSION = 1;

export type AlertStorageResult =
  | { kind: 'missing'; alerts: Alert[] }
  | { kind: 'valid'; alerts: Alert[] }
  | { kind: 'malformed'; alerts: Alert[] };

const ALERT_TYPES: AlertType[] = ['high_risk', 'related_pattern', 'new_evidence'];
const ALERT_STATUSES: AlertStatus[] = ['new', 'acknowledged', 'investigating', 'resolved', 'dismissed'];
const ALERT_SEVERITIES: RiskLevel[] = ['critical', 'high', 'medium', 'low'];
const ALERT_ACTIONS: AlertAuditEntry['action'][] = ['created', 'acknowledged', 'investigating', 'resolved', 'dismissed', 'linked', 'unlinked', 'updated'];

function isValidAlertAuditEntry(value: unknown): value is AlertAuditEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  return ALERT_ACTIONS.includes(entry.action as AlertAuditEntry['action'])
    && typeof entry.timestamp === 'string'
    && typeof entry.actor === 'string'
    && (entry.note === undefined || typeof entry.note === 'string');
}

export function isValidAlert(value: unknown): value is Alert {
  if (typeof value !== 'object' || value === null) return false;
  const alert = value as Record<string, unknown>;
  return typeof alert.id === 'string' && alert.id.trim().length > 0
    && ALERT_TYPES.includes(alert.type as AlertType)
    && ALERT_SEVERITIES.includes(alert.severity as RiskLevel)
    && typeof alert.title === 'string' && typeof alert.summary === 'string'
    && Array.isArray(alert.advertisementIds) && alert.advertisementIds.every(item => typeof item === 'string')
    && Array.isArray(alert.supportingIndicatorIds) && alert.supportingIndicatorIds.every(item => typeof item === 'string')
    && Array.isArray(alert.supportingEvidenceIds) && alert.supportingEvidenceIds.every(item => typeof item === 'string')
    && (alert.advertisementId === undefined || typeof alert.advertisementId === 'string')
    && (alert.evidenceId === undefined || typeof alert.evidenceId === 'string')
    && (alert.investigationId === undefined || typeof alert.investigationId === 'string')
    && typeof alert.createdAt === 'string'
    && ALERT_STATUSES.includes(alert.status as AlertStatus)
    && typeof alert.read === 'boolean'
    && Array.isArray(alert.auditHistory)
    && alert.auditHistory.length > 0
    && alert.auditHistory.every(isValidAlertAuditEntry);
}

export function parseAlertsStorage(raw: string | null): AlertStorageResult {
  if (raw === null) return { kind: 'missing', alerts: [] };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return { kind: 'malformed', alerts: [] };
    const envelope = parsed as Record<string, unknown>;
    if (envelope.version !== ALERTS_STORAGE_VERSION || !Array.isArray(envelope.alerts)) return { kind: 'malformed', alerts: [] };
    const alerts: Alert[] = [];
    const ids = new Set<string>();
    for (const value of envelope.alerts) {
      if (!isValidAlert(value)) continue;
      if (ids.has(value.id)) continue;
      ids.add(value.id);
      alerts.push(value);
    }
    return { kind: 'valid', alerts };
  } catch {
    return { kind: 'malformed', alerts: [] };
  }
}

export function loadAlertsState(): AlertStorageResult {
  try {
    return parseAlertsStorage(localStorage.getItem(ALERTS_STORAGE_KEY));
  } catch {
    return { kind: 'malformed', alerts: [] };
  }
}

export function saveAlerts(alerts: Alert[]): void {
  try {
    const unique = alerts.filter((alert, index, all) => isValidAlert(alert) && all.findIndex(candidate => candidate.id === alert.id) === index);
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify({ version: ALERTS_STORAGE_VERSION, alerts: unique }));
  } catch {
    // Quota exceeded or private browsing — fail silently.
  }
}
