'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface PRCycleTimeChartProps {
  data: Array<{ date: string; value: number }>;
}

const getBarColor = (hours: number) => {
  if (hours <= 4) return '#22c55e'; // green - fast
  if (hours <= 12) return '#3b82f6'; // blue - normal
  if (hours <= 24) return '#f59e0b'; // amber - slow
  return '#ef4444'; // red - too slow
};

export default function PRCycleTimeChart({ data }: PRCycleTimeChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    hours: Math.round(d.value * 10) / 10,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={formatted}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: '#6b7280' }}
          tickLine={false}
          axisLine={{ stroke: '#e5e7eb' }}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          width={40}
          label={{
            value: 'Hours',
            angle: -90,
            position: 'insideLeft',
            style: { fontSize: 12, fill: '#6b7280' },
          }}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
          formatter={(value: number) => [`${value}h`, 'Cycle Time']}
        />
        <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
          {formatted.map((entry, index) => (
            <Cell key={index} fill={getBarColor(entry.hours)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
