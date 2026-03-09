'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import CommitChart from '@/components/charts/CommitChart';
import PRCycleTimeChart from '@/components/charts/PRCycleTimeChart';
import TeamActivityChart from '@/components/charts/TeamActivityChart';
import { metricsAPI } from '@/lib/api/metrics';
import { exportsAPI } from '@/lib/api/exports';
import { useToast } from '@/components/ui/toast';

const dateRanges = [
  { label: '7 days', days: 7 },
  { label: '14 days', days: 14 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

// Seeded pseudo-random so the same (days, min, max, index) always gives the same value
function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

// Cache keyed by "days-min-max" so switching periods never re-randomizes
const mockSeriesCache = new Map<string, Array<{ date: string; value: number }>>();

const generateMockTimeSeries = (days: number, min = 5, max = 40) => {
  const key = `${days}-${min}-${max}`;
  if (mockSeriesCache.has(key)) return mockSeriesCache.get(key)!;
  const series = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    return {
      date: date.toISOString().split('T')[0],
      value: Math.floor(seededRandom(days * 1000 + i) * (max - min)) + min,
    };
  });
  mockSeriesCache.set(key, series);
  return series;
};

const mockContributors = [
  { github_login: 'alice', commits: 42, additions: 3200, deletions: 800 },
  { github_login: 'bob', commits: 38, additions: 2800, deletions: 600 },
  { github_login: 'carol', commits: 35, additions: 2100, deletions: 450 },
  { github_login: 'david', commits: 28, additions: 1500, deletions: 300 },
  { github_login: 'eve', commits: 24, additions: 1200, deletions: 200 },
  { github_login: 'frank', commits: 18, additions: 900, deletions: 150 },
];

// Real org UUID from the demo seed data
const DEMO_ORG_ID = '00000000-1234-1234-1234-000000000001';

// Fixed "today" for the lifetime of this module — prevents date from drifting
// between renders/remounts and causing different query keys for the same period
const TODAY = new Date().toISOString().split('T')[0];

export default function AnalyticsPage() {
  const [selectedRange, setSelectedRange] = useState(14);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  // Stable dates — endStr is always TODAY (module-level constant),
  // startStr only changes when selectedRange changes
  const { startStr, endStr } = useMemo(() => {
    const start = new Date(TODAY);
    start.setDate(start.getDate() - selectedRange);
    return {
      startStr: start.toISOString().split('T')[0],
      endStr: TODAY,
    };
  }, [selectedRange]);

  const { data: commitSeries } = useQuery({
    queryKey: ['timeseries-commits', DEMO_ORG_ID, startStr, endStr],
    queryFn: () => metricsAPI.getTimeSeries(DEMO_ORG_ID, 'commits', startStr, endStr),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const { data: cycleSeries } = useQuery({
    queryKey: ['timeseries-cycle', DEMO_ORG_ID, startStr, endStr],
    queryFn: () => metricsAPI.getTimeSeries(DEMO_ORG_ID, 'cycle_time', startStr, endStr),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const { data: teamMetrics } = useQuery({
    queryKey: ['team-metrics-analytics', DEMO_ORG_ID, startStr, endStr],
    queryFn: () => metricsAPI.getTeamMetrics(DEMO_ORG_ID, startStr, endStr),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportsAPI.downloadTeamPDF(DEMO_ORG_ID, startStr, endStr, 'Team Performance Report');
      toast('success', 'PDF downloaded', 'Your report is ready.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Backend unavailable.';
      toast('error', 'Export failed', msg);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      await exportsAPI.downloadTeamCSV(DEMO_ORG_ID, startStr, endStr);
      toast('success', 'CSV downloaded', 'Your data export is ready.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Backend unavailable.';
      toast('error', 'Export failed', msg);
    } finally {
      setIsExporting(false);
    }
  };

  // Memoize fallback data so it doesn't re-randomize on every render
  const fallbackCommitData = useMemo(() => generateMockTimeSeries(selectedRange), [selectedRange]);
  const fallbackCycleData = useMemo(() => generateMockTimeSeries(selectedRange, 2, 24), [selectedRange]);

  const commitData = commitSeries?.data || fallbackCommitData;
  const cycleData = cycleSeries?.data || fallbackCycleData;
  const contributors = teamMetrics?.top_contributors || mockContributors;

  const totalCommits = commitData.reduce((s, d) => s + d.value, 0);
  const avgCommitsPerDay = Math.round(totalCommits / selectedRange);
  const avgCycleTime =
    Math.round(
      (cycleData.reduce((s, d) => s + d.value, 0) / cycleData.length) * 10
    ) / 10;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-gray-600 mt-2">
            Detailed metrics and trends for your team
          </p>
        </div>

        {/* Controls: Date Range + Export */}
        <div className="flex items-center gap-3">
          {/* Export buttons */}
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportPDF}
              disabled={isExporting}
              className="gap-1.5"
            >
              {isExporting ? (
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              ) : (
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              )}
              PDF
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              disabled={isExporting}
              className="gap-1.5"
            >
              <svg className="h-3.5 w-3.5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              CSV
            </Button>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center space-x-2">
          {dateRanges.map((range) => (
            <Button
              key={range.days}
              variant={selectedRange === range.days ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedRange(range.days)}
            >
              {range.label}
            </Button>
          ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalCommits.toLocaleString()}</div>
            <p className="text-sm text-gray-500">Total Commits</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{avgCommitsPerDay}</div>
            <p className="text-sm text-gray-500">Avg Commits/Day</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{avgCycleTime}h</div>
            <p className="text-sm text-gray-500">Avg Cycle Time</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{contributors.length}</div>
            <p className="text-sm text-gray-500">Active Contributors</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="commits">Commits</TabsTrigger>
          <TabsTrigger value="prs">Pull Requests</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Commit Activity</CardTitle>
                <CardDescription>
                  Commits per day over the last {selectedRange} days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CommitChart data={commitData} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>PR Cycle Time</CardTitle>
                <CardDescription>
                  Average hours from PR open to merge
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PRCycleTimeChart data={cycleData} />
              </CardContent>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Team Contributions</CardTitle>
              <CardDescription>Developer activity breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <TeamActivityChart contributors={contributors} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commits">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Commit History</CardTitle>
              <CardDescription>
                Detailed commit activity over {selectedRange} days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CommitChart data={commitData} />
              <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {totalCommits.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">Total Commits</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {avgCommitsPerDay}
                  </p>
                  <p className="text-sm text-gray-500">Avg per Day</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {Math.max(...commitData.map((d) => d.value))}
                  </p>
                  <p className="text-sm text-gray-500">Peak Day</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prs">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>PR Cycle Time Analysis</CardTitle>
              <CardDescription>Time from PR creation to merge</CardDescription>
            </CardHeader>
            <CardContent>
              <PRCycleTimeChart data={cycleData} />
              <div className="mt-6 grid grid-cols-3 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{avgCycleTime}h</p>
                  <p className="text-sm text-gray-500">Average</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {Math.min(...cycleData.map((d) => d.value))}h
                  </p>
                  <p className="text-sm text-gray-500">Fastest</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {Math.max(...cycleData.map((d) => d.value))}h
                  </p>
                  <p className="text-sm text-gray-500">Slowest</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Team Activity</CardTitle>
              <CardDescription>Individual developer contributions</CardDescription>
            </CardHeader>
            <CardContent>
              <TeamActivityChart contributors={contributors} />
              <div className="mt-6 space-y-3 pt-4 border-t">
                {contributors.map((c, i) => (
                  <div
                    key={c.github_login}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-sm text-gray-400 w-5">#{i + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-xs font-medium text-white">
                        {c.github_login.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium text-sm">{c.github_login}</span>
                    </div>
                    <div className="flex items-center space-x-6 text-sm">
                      <span>
                        <span className="font-semibold">{c.commits}</span>{' '}
                        <span className="text-gray-500">commits</span>
                      </span>
                      <span className="text-green-600">+{c.additions.toLocaleString()}</span>
                      <span className="text-red-600">-{c.deletions.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
