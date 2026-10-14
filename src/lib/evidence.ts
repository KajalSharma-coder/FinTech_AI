import type { Advertisement, EvidenceRecord, ExtractedIndicator } from '../types';
import type { AdvertisementImageMetadata } from './imageHash';

const EVIDENCE_TIMESTAMP = '2026-10-14T00:00:00.000Z';

function createEvidenceId(advertisementId: string): string {
  const random = globalThis.crypto?.randomUUID?.();
  return `evidence-${advertisementId}-${random ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
}

export function createEvidenceRecord(
  advertisement: Advertisement,
  indicators: ExtractedIndicator[],
  investigationId?: string,
  image?: AdvertisementImageMetadata,
  investigatorNotes = '',
  createdAt = new Date().toISOString(),
): EvidenceRecord {
  const provenance = advertisement.provenance;
  const timestamp = createdAt || EVIDENCE_TIMESTAMP;
  return {
    id: createEvidenceId(advertisement.id),
    advertisementId: advertisement.id,
    evidenceType: image ? 'image_attachment' : 'advertisement_snapshot',
    ...(investigationId ? { investigationId } : {}),
    sourceUrl: provenance?.sourceUrl || advertisement.sourceUrl,
    platform: provenance?.platform || advertisement.platform,
    capturedAt: provenance?.capturedAt || advertisement.detectedAt,
    collectionMethod: provenance?.collectionMethod || 'synthetic_demo',
    matchedIndicators: indicators,
    riskExplanation: advertisement.riskReasons,
    investigatorNotes,
    createdAt: timestamp,
    history: [{ action: 'created', timestamp, actor: 'A. Reyes', note: 'Evidence record created from advertisement analysis.' }],
    ...(image ? { fileHash: image.sha256, fileName: image.fileName, fileMimeType: image.mimeType, fileSize: image.size } : {}),
  };
}

