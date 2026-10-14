import type { Advertisement, Alert, AlertAuditEntry, AlertStatus, EvidenceRecord, Investigation, ExtractedIndicator, RelatedAdvertisementMatch } from '../types';
import { extractIndicators } from './indicatorExtraction.ts';

export const DEFAULT_ALERT_TIMESTAMP = '2026-10-14T00:00:00.000Z';

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function indicatorsFor(ad: Advertisement): ExtractedIndicator[] {
  return Array.isArray(ad.indicators) && ad.indicators.length > 0 ? ad.indicators : extractIndicators(ad);
}

function createAudit(action: AlertAuditEntry['action'], timestamp: string, note?: string): AlertAuditEntry {
  return { action, timestamp, actor: 'A. Reyes', ...(note ? { note } : {}) };
}

function linkedInvestigation(advertisementIds: string[], investigations: Investigation[]): string | undefined {
  return investigations.find(investigation => advertisementIds.some(id => investigation.linkedAdIds.includes(id)))?.id;
}

function createAlert(input: Omit<Alert, 'status' | 'auditHistory' | 'read'>, createdAt: string): Alert {
  return {
    ...input,
    status: 'new',
    auditHistory: [createAudit('created', createdAt, 'Alert generated from local deterministic analysis.')],
    read: false,
  };
}

function repeatedIndicatorAlerts(ads: Advertisement[], investigations: Investigation[], createdAt: string): Alert[] {
  const groups = new Map<string, { type: 'phone_number' | 'domain' | 'payment_identifier'; adIds: Set<string>; indicatorIds: Set<string> }>();
  for (const ad of ads) {
    for (const indicator of indicatorsFor(ad)) {
      if (!['phone_number', 'domain', 'payment_identifier'].includes(indicator.type)) continue;
      const normalized = indicator.type === 'phone_number'
        ? indicator.matchedValue.replace(/\D/g, '')
        : indicator.matchedValue.trim().toLowerCase();
      if (!normalized || normalized.length < (indicator.type === 'phone_number' ? 8 : 3)) continue;
      const key = `${indicator.type}:${normalized}`;
      const indicatorType = indicator.type as 'phone_number' | 'domain' | 'payment_identifier';
      const group = groups.get(key) ?? { type: indicatorType, adIds: new Set<string>(), indicatorIds: new Set<string>() };
      group.adIds.add(ad.id);
      group.indicatorIds.add(indicator.id);
      groups.set(key, group);
    }
  }

  return [...groups.entries()]
    .filter(([, group]) => group.adIds.size >= 2)
    .map(([key, group]) => {
      const adIds = [...group.adIds].sort();
      const label = group.type === 'phone_number' ? 'phone number' : group.type === 'domain' ? 'domain' : 'payment identifier';
      const id = `alert-repeated-${stableHash(key)}`;
      const firstAd = ads.find(ad => adIds.includes(ad.id));
      return createAlert({
        id,
        type: 'related_pattern',
        severity: group.type === 'phone_number' || group.type === 'payment_identifier' ? 'high' : 'medium',
        title: `Repeated ${label} detected`,
        summary: `The same ${label} appears in ${adIds.length} advertisements. This is an investigative lead, not proof of coordination.`,
        advertisementIds: adIds,
        supportingIndicatorIds: [...group.indicatorIds].sort(),
        supportingEvidenceIds: [],
        ...(firstAd ? { advertisementId: firstAd.id } : {}),
        investigationId: linkedInvestigation(adIds, investigations),
        createdAt,
      }, createdAt);
    });
}

function relatedMatchAlerts(matches: RelatedAdvertisementMatch[], ads: Advertisement[], investigations: Investigation[]): Alert[] {
  return matches.filter(match => {
    const strong = match.reasons.some(reason => ['matching_phone', 'matching_payment_identifier', 'matching_image_hash', 'shared_url', 'shared_domain'].includes(reason.type));
    return strong || (match.reasons.some(reason => reason.type === 'text_similarity') && (match.similarityScore ?? 0) >= 0.9);
  }).map(match => {
    const adIds = [match.advertisementId, match.relatedAdvertisementId].sort();
    const strongCount = match.reasons.filter(reason => reason.type !== 'text_similarity').length;
    const severity = strongCount > 0 ? 'high' : 'medium';
    return createAlert({
      id: `alert-related-${match.id}`,
      type: 'related_pattern',
      severity,
      title: 'Advertisements share investigative signals',
      summary: `${match.reasons.map(reason => reason.explanation).join(' ')} Similarity alone is not proof of criminal coordination.`,
      advertisementIds: adIds,
      supportingIndicatorIds: ads.filter(ad => adIds.includes(ad.id)).flatMap(ad => indicatorsFor(ad).map(indicator => indicator.id)).sort(),
      supportingEvidenceIds: [],
      advertisementId: match.advertisementId,
      investigationId: linkedInvestigation(adIds, investigations),
      createdAt: match.detectedAt,
    }, match.detectedAt);
  });
}

export function generateAlerts(
  advertisements: Advertisement[],
  evidence: EvidenceRecord[],
  relatedMatches: RelatedAdvertisementMatch[],
  investigations: Investigation[],
  evaluationTimestamp = DEFAULT_ALERT_TIMESTAMP,
): Alert[] {
  if (!Array.isArray(advertisements)) return [];
  const generated: Alert[] = [];

  for (const ad of advertisements) {
    if (ad.riskLevel !== 'critical' && ad.riskLevel !== 'high') continue;
    const adIndicators = indicatorsFor(ad);
    const linkedEvidence = evidence.filter(record => record.advertisementId === ad.id);
    generated.push(createAlert({
      id: `alert-risk-${ad.id}`,
      type: 'high_risk',
      severity: ad.riskLevel,
      title: `${ad.riskLevel === 'critical' ? 'Critical' : 'High'}-risk advertisement detected`,
      summary: `${ad.title} scored ${ad.riskScore}/100. Review the recorded risk factors and extracted indicators.`,
      advertisementIds: [ad.id],
      supportingIndicatorIds: adIndicators.map(indicator => indicator.id),
      supportingEvidenceIds: linkedEvidence.map(record => record.id),
      advertisementId: ad.id,
      evidenceId: linkedEvidence[0]?.id,
      investigationId: linkedInvestigation([ad.id], investigations),
      createdAt: ad.detectedAt || evaluationTimestamp,
    }, ad.detectedAt || evaluationTimestamp));
  }

  generated.push(...repeatedIndicatorAlerts(advertisements, investigations, evaluationTimestamp));
  generated.push(...relatedMatchAlerts(relatedMatches, advertisements, investigations));

  for (const record of evidence) {
    generated.push(createAlert({
      id: `alert-evidence-${record.id}`,
      type: 'new_evidence',
      severity: advertisements.find(ad => ad.id === record.advertisementId)?.riskLevel ?? 'medium',
      title: 'New evidence record created',
      summary: `Evidence ${record.id} was created for advertisement ${record.advertisementId}.`,
      advertisementIds: [record.advertisementId],
      supportingIndicatorIds: record.matchedIndicators.map(indicator => indicator.id),
      supportingEvidenceIds: [record.id],
      advertisementId: record.advertisementId,
      evidenceId: record.id,
      investigationId: record.investigationId,
      createdAt: record.createdAt || evaluationTimestamp,
    }, record.createdAt || evaluationTimestamp));
  }

  return generated.filter((alert, index, all) => all.findIndex(candidate => candidate.id === alert.id) === index);
}

export function reconcileAlerts(generated: Alert[], persisted: Alert[]): Alert[] {
  const persistedById = new Map(persisted.map(alert => [alert.id, alert]));
  const merged = generated.map(alert => {
    const saved = persistedById.get(alert.id);
    if (!saved) return alert;
    // A saved undefined link is meaningful: it may represent an investigator's explicit unlink.
    return { ...alert, status: saved.status, auditHistory: saved.auditHistory, read: saved.read, investigationId: saved.investigationId };
  });
  const generatedIds = new Set(generated.map(alert => alert.id));
  return [...merged, ...persisted.filter(alert => !generatedIds.has(alert.id))];
}

export function alertStatusLabel(status: AlertStatus): string {
  return { new: 'New', acknowledged: 'Acknowledged', investigating: 'Investigating', resolved: 'Resolved', dismissed: 'Dismissed' }[status];
}

