import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { AdCategory } from '../../types';
import { categoryLabel } from '../../lib/utils';

interface CategoryPieChartProps {
  data: { category: AdCategory; count: number }[];
}

const COLORS = ['#059669', '#dc2626', '#d97706', '#3b82f6', '#8b5cf6', '#ec4899'];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card-sm text-xs">
      <p className="font-semibold text-navy">{categoryLabel(payload[0].name)}</p>
      <p className="text-muted">{payload[0].value} advertisements</p>
    </div>
  );
};

export default function CategoryPieChart({ data }: CategoryPieChartProps) {
  const chartData = data.map(d => ({ name: d.category, value: d.count }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => categoryLabel(value as AdCategory)}
          wrapperStyle={{ fontSize: 10 }}
          iconSize={8}
          iconType="circle"
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
