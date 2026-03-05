'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { metricsAPI, type MetricsSummary, type TeamMetrics } from '@/lib/api/metrics';
import CommitChart from '@/components/charts/CommitChart';

// Fallback mock data when API is not available
const mockSummary: MetricsSummary = {
  total_commits: { value: 2543, change: 12.5 },
  pull_requests: { value: 127, change: 8.2 },
  active_developers: { value: 12, change: 2 },
  avg_cycle_time: { value: 2.3, change: -15 },
};

const mockTimeSeries = Array.from({ length: 14 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (13 - i));
  return {
    date: date.toISOString().split('T')[0],
    value: Math.floor(Math.random() * 30) + 10,
  };
});

const mockContributors = [
  { developer_id: '1', github_login: 'alice', commits: 42, additions: 3200, deletions: 800 },
  { developer_id: '2', github_login: 'bob', commits: 38, additions: 2800, deletions: 600 },
  { developer_id: '3', github_login: 'carol', commits: 35, additions: 2100, deletions: 450 },
  { developer_id: '4', github_login: 'david', commits: 28, additions: 1500, deletions: 300 },
  { developer_id: '5', github_login: 'eve', commits: 24, additions: 1200, deletions: 200 },
];

const statCards = [
  {
    key: 'total_commits' as const,
    name: 'Total Commits',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><line x1="1.05" y1="12" x2="7" y2="12"/><line x1="17.01" y1="12" x2="22.96" y2="12"/></svg>
    ),
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: 'pull_requests' as const,
    name: 'Pull Requests',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" y1="9" x2="6" y2="21"/></svg>
    ),
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/30',
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: 'active_developers' as const,
    name: 'Active Developers',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    ),
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/30',
    format: (v: number) => String(v),
  },
  {
    key: 'avg_cycle_time' as const,
    name: 'Avg Cycle Time',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    ),
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/30',
    format: (v: number) => `${v} days`,
  },
];

function TrendIndicator({ change }: { change: number }) {
  const isPositive = change >= 0;
  const color =
    change === 0
      ? 'text-gray-500 dark:text-slate-400'
      : isPositive
        ? 'text-green-600 dark:text-green-400'
        : 'text-red-600 dark:text-red-400';

  return (
    <span className={`text-xs font-medium ${color}`}>
      {isPositive ? '+' : ''}
      {change}%{' '}
      <span className="text-gray-400 dark:text-slate-500">vs last week</span>
    </span>
  );
}

export default function DashboardPage() {
  // TODO: replace 'demo-org' with real organization ID from auth context
  const orgId = 'demo-org';

  const { data: summary } = useQuery({
    queryKey: ['metrics-summary', orgId],
    queryFn: () => metricsAPI.getSummary(orgId),
    retry: false,
  });

  const { data: timeSeries } = useQuery({
    queryKey: ['timeseries-commits', orgId],
    queryFn: () => metricsAPI.getTimeSeries(orgId, 'commits'),
    retry: false,
  });

  const { data: teamMetrics } = useQuery({
    queryKey: ['team-metrics', orgId],
    queryFn: () => metricsAPI.getTeamMetrics(orgId),
    retry: false,
  });

  const stats = summary || mockSummary;
  const chartData = timeSeries?.data || mockTimeSeries;
  const contributors =
    (teamMetrics as TeamMetrics)?.top_contributors || mockContributors;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600 dark:text-slate-400 mt-2">
          Overview of your team&apos;s productivity metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const metric = stats[card.key];
          return (
            <Card key={card.key}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-slate-400">
                  {card.name}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor} ${card.color}`}>
                  {card.icon}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {card.format(metric.value)}
                </div>
                <TrendIndicator change={metric.change} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Commit Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Commit Activity</CardTitle>
          <CardDescription>Commits over the last 14 days</CardDescription>
        </CardHeader>
        <CardContent>
          <CommitChart data={chartData} />
        </CardContent>
      </Card>

      {/* Contributors */}
      <Card>
        <CardHeader>
          <CardTitle>Top Contributors</CardTitle>
          <CardDescription>
            This week&apos;s most active developers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {contributors.map((contributor, i) => (
              <div
                key={contributor.developer_id || i}
                className="flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-6 text-sm text-gray-400 dark:text-slate-500 font-medium">
                    #{i + 1}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-xs font-medium text-white">
                    {contributor.github_login.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {contributor.github_login}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      +{contributor.additions.toLocaleString()} / -{contributor.deletions.toLocaleString()} lines
                    </p>
                  </div>
                </div>
                <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                  {contributor.commits} commits
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
