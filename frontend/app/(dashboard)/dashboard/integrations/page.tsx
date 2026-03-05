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
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { integrationsAPI, Integration, JiraProject } from '@/lib/api/integrations';
import { useToast } from '@/components/ui/toast';

const ORG_ID = 'demo-org';

// ---------------------------------------------------------------------------
// Slack Logo SVG
// ---------------------------------------------------------------------------
function SlackLogo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 122.8 122.8" xmlns="http://www.w3.org/2000/svg">
      <path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9z" fill="#E01E5A"/>
      <path d="M32.3 77.6c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" fill="#E01E5A"/>
      <path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2z" fill="#36C5F0"/>
      <path d="M45.2 32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" fill="#36C5F0"/>
      <path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2z" fill="#2EB67D"/>
      <path d="M90.5 45.2c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z" fill="#2EB67D"/>
      <path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9z" fill="#ECB22E"/>
      <path d="M77.6 90.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" fill="#ECB22E"/>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Jira Logo SVG
// ---------------------------------------------------------------------------
function JiraLogo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="jira-grad" x1="100%" x2="4.52%" y1="0.018%" y2="100%">
          <stop offset="0%" stopColor="#0052CC"/>
          <stop offset="100%" stopColor="#2684FF"/>
        </linearGradient>
      </defs>
      <path d="M15.997 0C12.019 3.977 8.04 7.957 4.063 11.934c-.08.08-.08.211 0 .292l7.7 7.7c.08.08.211.08.292 0L16 15.98l3.945 3.946c.08.08.211.08.292 0l7.7-7.7c.08-.08.08-.211 0-.292L15.997 0z" fill="url(#jira-grad)"/>
      <path d="M16.003 32C19.981 28.023 23.96 24.043 27.937 20.066c.08-.08.08-.211 0-.292l-7.7-7.7c-.08-.08-.211-.08-.292 0L16 16.02l-3.945-3.946c-.08-.08-.211-.08-.292 0l-7.7 7.7c-.08.08-.08.211 0 .292L16.003 32z" fill="#2684FF"/>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Connected badge
// ---------------------------------------------------------------------------
function ConnectedBadge() {
  return (
    <span className="flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
      Connected
    </span>
  );
}

// ---------------------------------------------------------------------------
// Slack Panel
// ---------------------------------------------------------------------------
function SlackPanel({
  integration,
  orgId,
}: {
  integration: Integration | undefined;
  orgId: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [notifConfig, setNotifConfig] = useState(
    integration?.notification_config ?? {
      sync_complete: true,
      sync_failed: true,
      new_insight: true,
      weekly_report: true,
      pr_merged: false,
      daily_digest: false,
    }
  );

  const connectMutation = useMutation({
    mutationFn: async () => {
      const { url } = await integrationsAPI.getSlackOAuthUrl(orgId);
      window.location.href = url;
    },
    onError: () => toast('error', 'Cannot connect Slack', 'SLACK_CLIENT_ID not configured in backend.'),
  });

  const testMutation = useMutation({
    mutationFn: () => integrationsAPI.testSlack(orgId),
    onSuccess: () => toast('success', 'Test sent!', 'Check your Slack channel.'),
    onError: () => toast('error', 'Test failed', 'Could not deliver message.'),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => integrationsAPI.disconnect(orgId, 'slack'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast('success', 'Slack disconnected', '');
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => integrationsAPI.updateSlackNotifications(orgId, notifConfig),
    onSuccess: () => toast('success', 'Settings saved', ''),
    onError: () => toast('error', 'Save failed', ''),
  });

  const notifLabels: Record<string, string> = {
    sync_complete: 'Sync completed',
    sync_failed: 'Sync failed',
    new_insight: 'New AI insight',
    weekly_report: 'Weekly report',
    pr_merged: 'PR merged',
    daily_digest: 'Daily digest',
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <SlackLogo />
              <div>
                <h3 className="font-semibold">Slack</h3>
                <p className="text-sm text-gray-500">
                  {integration
                    ? `Connected to ${integration.name} — #${integration.channel_name}`
                    : 'Receive notifications in your Slack workspace'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {integration ? <ConnectedBadge /> : null}
              {integration ? (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => testMutation.mutate()}
                    disabled={testMutation.isPending}
                  >
                    Test
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => disconnectMutation.mutate()}
                    disabled={disconnectMutation.isPending}
                  >
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => connectMutation.mutate()}
                  disabled={connectMutation.isPending}
                >
                  <svg className="h-4 w-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  Connect Slack
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification settings — only if connected */}
      {integration && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notification Settings</CardTitle>
            <CardDescription>Choose which events trigger a Slack message</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(notifLabels).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between py-1 cursor-pointer">
                <span className="text-sm text-gray-700">{label}</span>
                <button
                  role="switch"
                  aria-checked={!!notifConfig[key as keyof typeof notifConfig]}
                  onClick={() =>
                    setNotifConfig((prev) => ({
                      ...prev,
                      [key]: !prev[key as keyof typeof prev],
                    }))
                  }
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                    notifConfig[key as keyof typeof notifConfig]
                      ? 'bg-blue-600'
                      : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform ${
                      notifConfig[key as keyof typeof notifConfig]
                        ? 'translate-x-4'
                        : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
            ))}
            <div className="pt-2 flex justify-end">
              <Button
                size="sm"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                Save Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Jira Panel
// ---------------------------------------------------------------------------
function JiraPanel({
  integration,
  orgId,
}: {
  integration: Integration | undefined;
  orgId: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProject, setSelectedProject] = useState<string>('');

  const connectMutation = useMutation({
    mutationFn: async () => {
      const { url } = await integrationsAPI.getJiraOAuthUrl(orgId);
      window.location.href = url;
    },
    onError: () => toast('error', 'Cannot connect Jira', 'JIRA_CLIENT_ID not configured in backend.'),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => integrationsAPI.disconnect(orgId, 'jira'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast('success', 'Jira disconnected', '');
    },
  });

  const { data: projectsData } = useQuery({
    queryKey: ['jira-projects', orgId],
    queryFn: () => integrationsAPI.getJiraProjects(orgId),
    enabled: !!integration,
    retry: false,
  });

  const { data: metricsData } = useQuery({
    queryKey: ['jira-metrics', orgId, selectedProject],
    queryFn: () => integrationsAPI.getJiraMetrics(orgId, selectedProject),
    enabled: !!integration && !!selectedProject,
    retry: false,
  });

  const { data: sprintData } = useQuery({
    queryKey: ['jira-sprint', orgId, selectedProject],
    queryFn: () => integrationsAPI.getJiraSprint(orgId, selectedProject),
    enabled: !!integration && !!selectedProject,
    retry: false,
  });

  const projects = projectsData?.projects ?? [];

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <JiraLogo />
              <div>
                <h3 className="font-semibold">Jira</h3>
                <p className="text-sm text-gray-500">
                  {integration
                    ? `Connected to ${integration.name}`
                    : 'Correlate Jira issues with your code metrics'}
                </p>
                {integration?.external_url && (
                  <a
                    href={integration.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {integration.external_url}
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {integration ? <ConnectedBadge /> : null}
              {integration ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700"
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending}
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => connectMutation.mutate()}
                  disabled={connectMutation.isPending}
                >
                  <svg className="h-4 w-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  Connect Jira
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {integration && projects.length > 0 && (
        <>
          {/* Project selector */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Project</CardTitle>
              <CardDescription>View metrics for a Jira project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {projects.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setSelectedProject(p.key)}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                      selectedProject === p.key
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-mono text-xs text-gray-400 mr-1.5">{p.key}</span>
                    {p.name}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Metrics */}
          {metricsData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Issue Metrics (30 days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{metricsData.total_issues}</p>
                      <p className="text-xs text-gray-500">Total Issues</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{metricsData.resolved}</p>
                      <p className="text-xs text-gray-500">Resolved</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{metricsData.resolution_rate}%</p>
                      <p className="text-xs text-gray-500">Resolution Rate</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {Object.entries(metricsData.by_status).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{status}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {sprintData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Current Sprint</CardTitle>
                    <CardDescription>{sprintData.total} issues</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {Object.entries(sprintData.status_summary).map(([status, count]) => (
                        <div
                          key={status}
                          className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs"
                        >
                          {status}: <strong>{count}</strong>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2 max-h-52 overflow-y-auto">
                      {sprintData.issues.slice(0, 10).map((issue) => (
                        <div
                          key={issue.key}
                          className="flex items-start gap-2 text-xs border-b border-gray-50 pb-1.5"
                        >
                          <span className="font-mono text-gray-400 shrink-0">{issue.key}</span>
                          <span className="text-gray-700 flex-1 line-clamp-1">{issue.summary}</span>
                          <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-xs ${
                            issue.status === 'Done'
                              ? 'bg-green-50 text-green-700'
                              : issue.status === 'In Progress'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {issue.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function IntegrationsPage() {
  const orgId = ORG_ID;

  const { data, isLoading } = useQuery({
    queryKey: ['integrations', orgId],
    queryFn: () => integrationsAPI.list(orgId),
    retry: false,
  });

  const integrations = data?.integrations ?? [];
  const slack = integrations.find((i) => i.provider === 'slack');
  const jira = integrations.find((i) => i.provider === 'jira');

  const connectedCount = integrations.length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-gray-600 mt-2">
            Connect DevMetrics with your existing tools to get richer insights.
          </p>
        </div>
        {connectedCount > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            {connectedCount} connected
          </span>
        )}
      </div>

      {/* Integration status overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          className={`flex items-center gap-3 rounded-xl border p-4 ${
            slack ? 'border-green-200 bg-green-50/40' : 'border-gray-200'
          }`}
        >
          <SlackLogo className="h-6 w-6" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Slack</p>
            <p className="text-xs text-gray-500 truncate">
              {slack ? `#${slack.channel_name} · ${slack.name}` : 'Not connected'}
            </p>
          </div>
          {slack ? <ConnectedBadge /> : <span className="text-xs text-gray-400">—</span>}
        </div>
        <div
          className={`flex items-center gap-3 rounded-xl border p-4 ${
            jira ? 'border-green-200 bg-green-50/40' : 'border-gray-200'
          }`}
        >
          <JiraLogo className="h-6 w-6" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">Jira</p>
            <p className="text-xs text-gray-500 truncate">
              {jira ? jira.name : 'Not connected'}
            </p>
          </div>
          {jira ? <ConnectedBadge /> : <span className="text-xs text-gray-400">—</span>}
        </div>
      </div>

      {/* Detail tabs */}
      <Tabs defaultValue="slack">
        <TabsList>
          <TabsTrigger value="slack" className="flex items-center gap-2">
            <SlackLogo className="h-4 w-4" />
            Slack
          </TabsTrigger>
          <TabsTrigger value="jira" className="flex items-center gap-2">
            <JiraLogo className="h-4 w-4" />
            Jira
          </TabsTrigger>
        </TabsList>

        <TabsContent value="slack" className="mt-4">
          <SlackPanel integration={slack} orgId={orgId} />
        </TabsContent>

        <TabsContent value="jira" className="mt-4">
          <JiraPanel integration={jira} orgId={orgId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
