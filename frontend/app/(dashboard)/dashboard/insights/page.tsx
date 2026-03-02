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
import { Textarea } from '@/components/ui/textarea';
import { insightsAPI, type Insight } from '@/lib/api/insights';

const severityVariant: Record<string, string> = {
  high: 'destructive',
  warning: 'warning',
  success: 'success',
  info: 'secondary',
};

// Fallback mock data
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
    type: 'team_analysis',
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
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

export default function InsightsPage() {
  const orgId = 'demo-org';
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);

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

  const queryMutation = useMutation({
    mutationFn: (q: string) => insightsAPI.query(q),
    onSuccess: (data) => setAnswer(data.answer),
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

  const insights = insightsData?.insights || mockInsights;
  const suggestions = suggestionsData?.suggestions || [];

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
            AI-powered recommendations to improve your team&apos;s productivity
          </p>
        </div>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
        >
          {generateMutation.isPending ? 'Generating...' : 'Generate New Insights'}
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
            <div className="text-2xl font-bold text-orange-600">
              {warningCount}
            </div>
            <p className="text-sm text-gray-500">Needs Attention</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {positiveCount}
            </div>
            <p className="text-sm text-gray-500">Positive Trends</p>
          </CardContent>
        </Card>
      </div>

      {/* Ask AI */}
      <Card>
        <CardHeader>
          <CardTitle>Ask AI about your metrics</CardTitle>
          <CardDescription>
            Ask any question about your team&apos;s performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-3">
            <Textarea
              placeholder="e.g. Which developer has the highest PR merge rate this month?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="flex-1"
              rows={2}
            />
            <Button
              onClick={() => {
                if (question.trim()) {
                  queryMutation.mutate(question);
                }
              }}
              disabled={queryMutation.isPending || !question.trim()}
              className="self-end"
            >
              {queryMutation.isPending ? 'Thinking...' : 'Ask'}
            </Button>
          </div>
          {answer && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-800 mb-1">AI Answer:</p>
              <p className="text-sm text-blue-700 whitespace-pre-wrap">{answer}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Recent Insights</h2>
        {insights.map((insight) => (
          <Card
            key={insight.id}
            className={!insight.is_read ? 'border-l-4 border-l-blue-500' : ''}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{insight.title}</CardTitle>
                  <CardDescription>
                    {timeAgo(insight.generated_at)}
                  </CardDescription>
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
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI Suggestions</CardTitle>
            <CardDescription>
              Actionable recommendations for your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {suggestions.map((s, i) => (
                <div key={i} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{s.title}</h3>
                    <Badge
                      variant={
                        s.priority === 'high'
                          ? 'destructive'
                          : s.priority === 'medium'
                            ? 'warning'
                            : ('secondary' as 'default')
                      }
                    >
                      {s.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{s.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About AI Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-sm">
            Insights are generated by analyzing your team&apos;s development
            patterns using GPT-4. They are refreshed daily and take into account
            commit frequency, PR cycle times, code review patterns, and team
            workload distribution. Connect your repositories in Settings to
            enable real-time insights.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
