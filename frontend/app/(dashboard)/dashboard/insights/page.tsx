'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AIChat from '@/components/ai-chat';
import { insightsAPI, type Insight } from '@/lib/api/insights';

const severityVariant: Record<string, string> = {
  high: 'destructive',
  warning: 'warning',
  success: 'success',
  info: 'secondary',
};

const mockInsights: Insight[] = [
  {
    id: '1',
    type: 'team_analysis',
    title: 'High PR Cycle Time Detected',
    summary:
      'Average PR cycle time has increased by 35% over the last two weeks. Consider reducing PR size or improving review processes.',
    severity: 'warning',
    category: 'Productivity',
    is_read: false,
    generated_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: '2',
    type: 'team_analysis',
    title: 'Code Review Bottleneck',
    summary:
      'Bob Smith has 8 pending code reviews older than 24 hours. Reassigning reviews could improve team velocity.',
    severity: 'high',
    category: 'Team',
    is_read: false,
    generated_at: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: '3',
    type: 'team_analysis',
    title: 'Positive Trend: Test Coverage',
    summary:
      'Test coverage has improved from 72% to 81% this month. Great job maintaining code quality!',
    severity: 'success',
    category: 'Quality',
    is_read: true,
    generated_at: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: '4',
    type: 'weekly_report',
    title: 'Weekend Work Pattern',
    summary:
      'Three team members have been consistently working on weekends. Consider workload balancing to prevent burnout.',
    severity: 'warning',
    category: 'Wellbeing',
    is_read: true,
    generated_at: new Date(Date.now() - 48 * 3600000).toISOString(),
  },
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function InsightsPage() {
  const orgId = '00000000-1234-1234-1234-000000000001';
  const queryClient = useQueryClient();
  const [weeklyReport, setWeeklyReport] = useState<string | null>(null);

  const { data: insightsData } = useQuery({
    queryKey: ['insights', orgId],
    queryFn: () => insightsAPI.list(orgId),
    retry: false,
  });

  const { data: suggestionsData } = useQuery({
    queryKey: ['suggestions', orgId],
    queryFn: () => insightsAPI.getSuggestions(orgId),
    retry: false,
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      insightsAPI.generate(orgId, {
        team_size: 12,
        active_developers: 8,
        commits: { total: 245, additions: 12000, deletions: 3400 },
        pull_requests: {
          total: 32,
          merged: 28,
          merge_rate: 87,
          avg_cycle_time_hours: 18,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insights', orgId] });
    },
  });

  const reportMutation = useMutation({
    mutationFn: () =>
      insightsAPI.weeklyReport(orgId, {
        team_size: 12,
        active_developers: 8,
        start_date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        commits: { total: 245, additions: 12000, deletions: 3400, avg_per_developer: 31 },
        pull_requests: { total: 32, merged: 28, merge_rate: 87, avg_cycle_time_hours: 18 },
        reviews: { total: 45, avg_review_time_hours: 4.5 },
        top_contributors: [
          { github_login: 'alice', commits: 42, additions: 3200 },
          { github_login: 'bob', commits: 38, additions: 2800 },
        ],
      }),
    onSuccess: (data) => {
      setWeeklyReport(data.report);
    },
  });

  const insights = insightsData?.insights ?? mockInsights;
  const suggestions = suggestionsData?.suggestions ?? [];

  const unreadCount = insights.filter((i) => !i.is_read).length;
  const warningCount = insights.filter(
    (i) => i.severity === 'warning' || i.severity === 'high'
  ).length;
  const positiveCount = insights.filter((i) => i.severity === 'success').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Insights</h1>
          <p className="text-gray-600 mt-2">
            AI-powered recommendations and interactive analysis
          </p>
        </div>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
        >
          {generateMutation.isPending ? 'Generating...' : 'Generate Insights'}
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{unreadCount}</div>
            <p className="text-sm text-gray-500">Unread Insights</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{warningCount}</div>
            <p className="text-sm text-gray-500">Needs Attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{positiveCount}</div>
            <p className="text-sm text-gray-500">Positive Trends</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="insights">
        <TabsList>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="chat">Ask AI</TabsTrigger>
          <TabsTrigger value="report">Weekly Report</TabsTrigger>
          <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
        </TabsList>

        {/* Insights Tab */}
        <TabsContent value="insights">
          <div className="space-y-4 mt-4">
            {insights.map((insight) => (
              <Card
                key={insight.id}
                className={!insight.is_read ? 'border-l-4 border-l-blue-500' : ''}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{insight.title}</CardTitle>
                      <CardDescription>{timeAgo(insight.generated_at)}</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      {insight.severity && (
                        <Badge
                          variant={
                            (severityVariant[insight.severity] || 'secondary') as 'default'
                          }
                        >
                          {insight.severity}
                        </Badge>
                      )}
                      {insight.category && (
                        <Badge variant="outline">{insight.category}</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{insight.summary}</p>
                </CardContent>
              </Card>
            ))}

            {insights.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">
                    No insights yet. Click &quot;Generate Insights&quot; to get
                    AI-powered analysis of your team.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat">
          <div className="mt-4">
            <AIChat />
          </div>
        </TabsContent>

        {/* Weekly Report Tab */}
        <TabsContent value="report">
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Generate a comprehensive weekly performance report for your team.
              </p>
              <Button
                onClick={() => reportMutation.mutate()}
                disabled={reportMutation.isPending}
                variant="outline"
              >
                {reportMutation.isPending ? 'Generating...' : 'Generate Report'}
              </Button>
            </div>

            {weeklyReport ? (
              <Card>
                <CardHeader>
                  <CardTitle>Weekly Team Report</CardTitle>
                  <CardDescription>
                    Generated {new Date().toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">
                    {weeklyReport}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mx-auto mb-3 text-gray-400"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  <p className="text-gray-500">
                    Click &quot;Generate Report&quot; to create a weekly summary.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Suggestions Tab */}
        <TabsContent value="suggestions">
          <div className="mt-4 space-y-4">
            {suggestions.length > 0 ? (
              suggestions.map((s, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-semibold">{s.title}</h3>
                        <p className="text-sm text-gray-600">{s.description}</p>
                      </div>
                      <Badge
                        variant={
                          (s.priority === 'high'
                            ? 'destructive'
                            : s.priority === 'medium'
                              ? 'warning'
                              : 'secondary') as 'default'
                        }
                      >
                        {s.priority}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-gray-500">
                    Generate insights first to get AI-powered suggestions.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
