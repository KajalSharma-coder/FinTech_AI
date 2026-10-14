import type { RiskLevel } from '../../types';
import { riskHex } from '../../lib/utils';

interface RiskBreakdownProps {
  reasons: {
    factor: string;
    weight: number;
    maxWeight: number;
    description: string;
  }[];
}

export default function RiskBreakdown({ reasons }: RiskBreakdownProps) {
  return (
    <div className="space-y-3">
      {reasons.map((r) => {
        const pct = Math.round((r.weight / r.maxWeight) * 100);
        // determine level based on percentage
        const level: RiskLevel =
          pct >= 75 ? 'critical' : pct >= 50 ? 'high' : pct >= 25 ? 'medium' : 'low';
        const color = riskHex(level);

        return (
          <div key={r.factor}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-navy-3">{r.factor}</span>
              <span className="text-xs font-bold tabular-nums" style={{ color }}>
                {r.weight}/{r.maxWeight}
              </span>
            </div>
            <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <p className="text-[11px] text-muted mt-1 leading-relaxed">{r.description}</p>
          </div>
        );
      })}
    </div>
  );
}
