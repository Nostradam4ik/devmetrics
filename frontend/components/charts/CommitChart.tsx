'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from 'next-themes';

interface CommitChartProps {
  data: Array<{ date: string; value: number }>;
}

export default function CommitChart({ data }: CommitChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={formatted}>
        <defs>
          <linearGradient id="commitGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={isDark ? '#334155' : '#f0f0f0'}
        />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#6b7280' }}
          tickLine={false}
          axisLine={{ stroke: isDark ? '#334155' : '#e5e7eb' }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#6b7280' }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '8px',
            border: `1px solid ${isDark ? '#334155' : '#e5e7eb'}`,
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            color: isDark ? '#f1f5f9' : '#0f172a',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
          labelStyle={{ color: isDark ? '#cbd5e1' : '#374151' }}
          labelFormatter={(label) => `Date: ${label}`}
          formatter={(value: number) => [value, 'Commits']}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#commitGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
