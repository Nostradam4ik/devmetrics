'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface Contributor {
  github_login: string;
  commits: number;
  additions: number;
  deletions: number;
}

interface TeamActivityChartProps {
  contributors: Contributor[];
}

export default function TeamActivityChart({
  contributors,
}: TeamActivityChartProps) {
  const data = contributors.slice(0, 8).map((c) => ({
    name: c.github_login,
    commits: c.commits,
    additions: Math.round(c.additions / 100), // Scale down for readability
    deletions: Math.round(c.deletions / 100),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis type="number" tick={{ fontSize: 12, fill: '#6b7280' }} />
        <YAxis
          dataKey="name"
          type="category"
          tick={{ fontSize: 12, fill: '#6b7280' }}
          width={100}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
        />
        <Legend />
        <Bar dataKey="commits" fill="#3b82f6" name="Commits" radius={[0, 4, 4, 0]} />
        <Bar
          dataKey="additions"
          fill="#22c55e"
          name="Additions (x100)"
          radius={[0, 4, 4, 0]}
        />
        <Bar
          dataKey="deletions"
          fill="#ef4444"
          name="Deletions (x100)"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
