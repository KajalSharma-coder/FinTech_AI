import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import type { DailyThreat } from '../../types';

interface ThreatTrendChartProps {
  data: DailyThreat[];
}

function formatTick(date: string): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-sm text-xs space-y-1 min-w-[140px]">
      <p className="font-semibold text-navy mb-2">
        {new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
      </p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted capitalize">{p.name}</span>
          </span>
          <span className="font-bold text-navy">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function ThreatTrendChart({ data }: ThreatTrendChartProps) {
  // Show last 14 days for readability
  const recent = data.slice(-14);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={recent} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatTick}
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          interval={1}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
        <Line type="monotone" dataKey="critical" stroke="#dc2626" strokeWidth={2} dot={false} name="Critical" />
        <Line type="monotone" dataKey="high"     stroke="#d97706" strokeWidth={2} dot={false} name="High" />
        <Line type="monotone" dataKey="medium"   stroke="#ca8a04" strokeWidth={2} dot={false} name="Medium" />
        <Line type="monotone" dataKey="count"    stroke="#059669" strokeWidth={2.5} dot={false} name="Total" strokeDasharray="4 2" />
      </LineChart>
    </ResponsiveContainer>
  );
}
