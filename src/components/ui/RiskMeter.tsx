import type { RiskLevel } from '../../types';
import { riskHex } from '../../lib/utils';

interface RiskMeterProps {
  score: number;
  level: RiskLevel;
  size?: number;
}

export default function RiskMeter({ score, level, size = 80 }: RiskMeterProps) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = riskHex(level);

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={8}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={`${progress} ${circumference}`}
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        </svg>
        {/* Center score */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-black" style={{ color }}>{score}</span>
        </div>
      </div>
      <span className="text-[10px] font-semibold text-muted uppercase tracking-wide">Risk Score</span>
    </div>
  );
}
