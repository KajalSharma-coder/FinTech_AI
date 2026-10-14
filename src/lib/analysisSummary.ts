import type { Advertisement, RiskLevel } from '../types';

export interface AdvertisementAnalysisSummary {
  total: number;
  counts: Record<RiskLevel, number>;
  highRiskCount: number;
  flaggedAdvertisements: Advertisement[];
}

export function summarizeAdvertisements(ads: Advertisement[]): AdvertisementAnalysisSummary {
  const counts: Record<RiskLevel, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const ad of ads) counts[ad.riskLevel] += 1;
  const flaggedAdvertisements = [...ads]
    .filter(ad => ad.riskLevel === 'critical' || ad.riskLevel === 'high')
    .sort((left, right) => right.riskScore - left.riskScore);
  return { total: ads.length, counts, highRiskCount: flaggedAdvertisements.length, flaggedAdvertisements };
}

