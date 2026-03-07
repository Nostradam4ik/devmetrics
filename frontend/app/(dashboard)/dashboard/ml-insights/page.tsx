'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { mlAPI, type VelocityTrend, type AnomalyDetection, type TeamHealth, type SprintPrediction } from '@/lib/api/ml';

const ORG_ID = '00000000-1234-1234-1234-000000000001';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TrendBadge({ trend }: { trend: VelocityTrend['trend'] }) {
  const map: Record<string, { label: string; className: string }> = {
    increasing: { label: 'Increasing', className: 'bg-green-100 text-green-800' },
    decreasing: { label: 'Decreasing', className: 'bg-red-100 text-red-800' },
    stable: { label: 'Stable', className: 'bg-blue-100 text-blue-800' },
    volatile: { label: 'Volatile', className: 'bg-orange-100 text-orange-800' },
    insufficient_data: { label: 'Insufficient data', className: 'bg-gray-100 text-gray-600' },
  };
  const { label, className } = map[trend] ?? map.insufficient_data;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function HealthStatusBadge({ status }: { status: TeamHealth['status'] }) {
  const map: Record<string, { label: string; className: string }> = {
    healthy: { label: 'Healthy', className: 'bg-green-100 text-green-800' },
    fair: { label: 'Fair', className: 'bg-yellow-100 text-yellow-800' },
    at_risk: { label: 'At Risk', className: 'bg-orange-100 text-orange-800' },
    critical: { label: 'Critical', className: 'bg-red-100 text-red-800' },
  };
  const { label, className } = map[status] ?? map.fair;
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${className}`}>
      {label}
    </span>
  );
}

function ScoreRing({ score, grade }: { score: number; label: string; grade: string }) {
  const gradeColor: Record<string, string> = {
    A: 'text-green-600', B: 'text-blue-600', C: 'text-yellow-600',
    D: 'text-orange-600', F: 'text-red-600',
  };
  const strokeColor: Record<string, string> = {
    A: '#16a34a', B: '#2563eb', C: '#ca8a04', D: '#ea580c', F: '#dc2626',
  };
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="50" cy="50" r="40" fill="none"
          stroke={strokeColor[grade] ?? '#6b7280'}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
        <text x="50" y="46" textAnchor="middle" className="text-lg font-bold" style={{ fontSize: 20, fontWeight: 700, fill: strokeColor[grade] }}>
          {score}
        </text>
        <text x="50" y="64" textAnchor="middle" style={{ fontSize: 11, fill: '#6b7280' }}>/ 100</text>
      </svg>
      <span className={`text-2xl font-bold ${gradeColor[grade] ?? 'text-gray-600'}`}>{grade}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function CardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-40 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-64 bg-gray-100 rounded animate-pulse mt-1" />
      </CardHeader>
      <CardContent>
        <div className="h-40 bg-gray-100 rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Velocity Trend Tab
// ---------------------------------------------------------------------------

function VelocityTab({ orgId }: { orgId: string }) {
  const [metric, setMetric] = useState<'commits' | 'prs' | 'additions'>('commits');
  const [days, setDays] = useState(30);

  const { data, isLoading, error } = useQuery({
    queryKey: ['ml-velocity', orgId, metric, days],
    queryFn: () => mlAPI.getVelocityTrend(orgId, { metric, days }),
    retry: false,
  });

  const forecastData = data?.forecast_7d.map((v, i) => ({
    day: `+${i + 1}d`,
    value: v,
  })) ?? [];

  return (
    <div className="space-y-4 mt-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2">
          {(['commits', 'prs', 'additions'] as const).map((m) => (
            <Button
              key={m}
              size="sm"
              variant={metric === m ? 'default' : 'outline'}
              onClick={() => setMetric(m)}
            >
              {m === 'commits' ? 'Commits' : m === 'prs' ? 'Pull Requests' : 'Lines Added'}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          {[14, 30, 60, 90].map((d) => (
            <Button
              key={d}
              size="sm"
              variant={days === d ? 'default' : 'outline'}
              onClick={() => setDays(d)}
            >
              {d}d
            </Button>
          ))}
        </div>
      </div>

      {isLoading && <CardSkeleton />}
      {error && (
        <Card><CardContent className="py-8 text-center text-gray-500">Unable to load trend data.</CardContent></Card>
      )}

      {data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">Trend</p>
                <div className="mt-1"><TrendBadge trend={data.trend} /></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">Slope</p>
                <p className="text-2xl font-bold">
                  {data.slope > 0 ? '+' : ''}{data.slope}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">R² Fit</p>
                <p className="text-2xl font-bold">{(data.r_squared * 100).toFixed(0)}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">Change</p>
                <p className={`text-2xl font-bold ${data.change_percent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.change_percent > 0 ? '+' : ''}{data.change_percent}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Interpretation */}
          <Card>
            <CardContent className="py-4">
              <p className="text-sm text-gray-700">{data.interpretation}</p>
            </CardContent>
          </Card>

          {/* 7-day Forecast */}
          <Card>
            <CardHeader>
              <CardTitle>7-Day Forecast</CardTitle>
              <CardDescription>Linear regression projection for the next 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <ReferenceLine y={data.mean_value} stroke="#6b7280" strokeDasharray="4 4" label={{ value: 'avg', position: 'right', fontSize: 11 }} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Anomaly Detection Tab
// ---------------------------------------------------------------------------

function AnomaliesTab({ orgId }: { orgId: string }) {
  const [metric, setMetric] = useState<'commits' | 'prs' | 'additions'>('commits');
  const [method, setMethod] = useState<'combined' | 'zscore' | 'iqr'>('combined');

  const { data, isLoading, error } = useQuery({
    queryKey: ['ml-anomalies', orgId, metric, method],
    queryFn: () => mlAPI.getAnomalies(orgId, { metric, method, days: 60 }),
    retry: false,
  });

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2">
          {(['commits', 'prs', 'additions'] as const).map((m) => (
            <Button key={m} size="sm" variant={metric === m ? 'default' : 'outline'} onClick={() => setMetric(m)}>
              {m === 'commits' ? 'Commits' : m === 'prs' ? 'PRs' : 'Lines Added'}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          {(['combined', 'zscore', 'iqr'] as const).map((mth) => (
            <Button key={mth} size="sm" variant={method === mth ? 'default' : 'outline'} onClick={() => setMethod(mth)}>
              {mth === 'combined' ? 'Combined' : mth === 'zscore' ? 'Z-Score' : 'IQR'}
            </Button>
          ))}
        </div>
      </div>

      {isLoading && <CardSkeleton />}
      {error && (
        <Card><CardContent className="py-8 text-center text-gray-500">Unable to load anomaly data.</CardContent></Card>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">Anomalies Found</p>
                <p className="text-2xl font-bold text-orange-600">{data.total_anomalies}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">Baseline Mean</p>
                <p className="text-2xl font-bold">{data.baseline_mean}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">Baseline Std Dev</p>
                <p className="text-2xl font-bold">{data.baseline_std}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">Detection Method</p>
                <p className="text-lg font-semibold capitalize">{data.method}</p>
              </CardContent>
            </Card>
          </div>

          {data.anomalies.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Detected Anomalies</CardTitle>
                <CardDescription>Days with statistically unusual activity (last 60 days)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.anomalies.map((a, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{a.date}</p>
                        <p className="text-sm text-gray-500">
                          {a.direction === 'spike' ? '↑ Spike' : '↓ Drop'} — value: {a.value}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Z={a.z_score}</span>
                        <Badge variant={a.severity === 'high' ? 'destructive' : 'secondary'}>
                          {a.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-4xl mb-3">✓</div>
                <p className="text-gray-500 font-medium">No anomalies detected in the last 60 days.</p>
                <p className="text-gray-400 text-sm mt-1">Team activity is within normal statistical bounds.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Team Health Tab
// ---------------------------------------------------------------------------

function TeamHealthTab({ orgId }: { orgId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['ml-team-health', orgId],
    queryFn: () => mlAPI.getTeamHealth(orgId),
    retry: false,
  });

  const radarData = data ? [
    { metric: 'Participation', value: data.dimensions.participation },
    { metric: 'Stability', value: data.dimensions.stability },
    { metric: 'PR Health', value: data.dimensions.pr_health },
  ] : [];

  return (
    <div className="space-y-4 mt-4">
      {isLoading && <CardSkeleton />}
      {error && (
        <Card><CardContent className="py-8 text-center text-gray-500">Unable to load team health data.</CardContent></Card>
      )}
      {data && (
        <>
          {/* Score + Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Team Health Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-5xl font-bold">{data.score}</div>
                    <div className="text-sm text-gray-500 mt-1">/ 100</div>
                  </div>
                  <div>
                    <HealthStatusBadge status={data.status} />
                    <p className="text-sm text-gray-500 mt-2">Based on {data.period_days}-day analysis</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dimension Radar</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                    <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Dimension breakdown */}
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(data.dimensions).map(([key, val]) => (
              <Card key={key}>
                <CardContent className="pt-4">
                  <p className="text-sm text-gray-500 capitalize">{key.replace('_', ' ')}</p>
                  <p className="text-2xl font-bold">{val}</p>
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${Math.min(val, 100)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Flags */}
          {data.flags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Action Items</CardTitle>
                <CardDescription>{data.flags.length} issue(s) detected</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.flags.map((flag, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                      <div className={`mt-0.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${flag.severity === 'high' ? 'bg-red-500' : flag.severity === 'medium' ? 'bg-orange-400' : 'bg-yellow-400'}`} />
                      <div>
                        <p className="text-sm font-medium capitalize">{flag.type.replace(/_/g, ' ')}</p>
                        <p className="text-sm text-gray-500">{flag.message}</p>
                      </div>
                      <Badge variant={flag.severity === 'high' ? 'destructive' : 'secondary'} className="ml-auto">
                        {flag.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {data.flags.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center">
                <div className="text-4xl mb-2">🎉</div>
                <p className="font-medium text-green-700">No critical issues detected</p>
                <p className="text-sm text-gray-500 mt-1">Your team is operating healthily.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sprint Prediction Tab
// ---------------------------------------------------------------------------

function SprintPredictionTab({ orgId }: { orgId: string }) {
  const [sprintDays, setSprintDays] = useState(14);

  const { data, isLoading, error } = useQuery<SprintPrediction>({
    queryKey: ['ml-sprint', orgId, sprintDays],
    queryFn: () => mlAPI.getSprintPrediction(orgId, { sprint_length_days: sprintDays }),
    retry: false,
  });

  const chartData = data?.historical_velocities.map((v, i) => ({
    sprint: `Sprint ${i + 1}`,
    velocity: v,
  })) ?? [];

  if (data) {
    chartData.push({
      sprint: 'Predicted',
      velocity: data.predicted,
    });
  }

  const confidenceColor: Record<string, string> = {
    high: 'text-green-600',
    medium: 'text-yellow-600',
    low: 'text-gray-500',
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-2">
        {([7, 14, 21] as const).map((d) => (
          <Button key={d} size="sm" variant={sprintDays === d ? 'default' : 'outline'} onClick={() => setSprintDays(d)}>
            {d}-day sprints
          </Button>
        ))}
      </div>

      {isLoading && <CardSkeleton />}
      {error && (
        <Card><CardContent className="py-8 text-center text-gray-500">Unable to load sprint data.</CardContent></Card>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">Predicted Velocity</p>
                <p className="text-3xl font-bold text-blue-600">{data.predicted}</p>
                <p className="text-xs text-gray-400">commits / sprint</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">Confidence</p>
                <p className={`text-2xl font-bold capitalize ${confidenceColor[data.confidence]}`}>
                  {data.confidence}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">Expected Range</p>
                <p className="text-lg font-bold">[{data.range[0]} – {data.range[1]}]</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-gray-500">Trend</p>
                <p className={`text-2xl font-bold ${data.trend === 'up' ? 'text-green-600' : data.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                  {data.trend === 'up' ? '↑ Up' : data.trend === 'down' ? '↓ Down' : '→ Flat'}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Historical + Predicted Velocity</CardTitle>
              <CardDescription>
                Last {data.num_sprints_analyzed} sprints + next sprint forecast
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sprint" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="velocity"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <ReferenceLine
                    x="Predicted"
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{ value: 'forecast', position: 'top', fontSize: 11 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {data.r_squared !== undefined && (
            <Card>
              <CardContent className="py-3">
                <p className="text-sm text-gray-500">
                  R² fit: <span className="font-semibold">{(data.r_squared * 100).toFixed(0)}%</span> —
                  {data.r_squared > 0.7
                    ? ' Strong linear pattern detected.'
                    : data.r_squared > 0.4
                      ? ' Moderate pattern — prediction may vary.'
                      : ' Weak pattern — treat as rough estimate.'}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MLInsightsPage() {
  const orgId = ORG_ID;

  // Prefetch team health for summary card
  const { data: healthData } = useQuery({
    queryKey: ['ml-team-health', orgId],
    queryFn: () => mlAPI.getTeamHealth(orgId),
    retry: false,
  });

  const { data: velocityData } = useQuery({
    queryKey: ['ml-velocity', orgId, 'commits', 30],
    queryFn: () => mlAPI.getVelocityTrend(orgId, { metric: 'commits', days: 30 }),
    retry: false,
  });

  const { data: anomalyData } = useQuery({
    queryKey: ['ml-anomalies', orgId, 'commits', 'combined'],
    queryFn: () => mlAPI.getAnomalies(orgId, { metric: 'commits', method: 'combined', days: 60 }),
    retry: false,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">ML Insights</h1>
        <p className="text-gray-600 mt-2">
          Statistical analysis — velocity trends, anomaly detection, team health scoring, and sprint prediction
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Velocity Trend</p>
            {velocityData ? (
              <div className="mt-1"><TrendBadge trend={velocityData.trend} /></div>
            ) : (
              <div className="h-5 w-24 bg-gray-100 rounded animate-pulse mt-1" />
            )}
            <p className="text-xs text-gray-400 mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Anomalies Detected</p>
            {anomalyData ? (
              <p className="text-2xl font-bold text-orange-600">{anomalyData.total_anomalies}</p>
            ) : (
              <div className="h-8 w-12 bg-gray-100 rounded animate-pulse mt-1" />
            )}
            <p className="text-xs text-gray-400 mt-1">Last 60 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Team Health</p>
            {healthData ? (
              <>
                <p className="text-2xl font-bold">{healthData.score}</p>
                <HealthStatusBadge status={healthData.status} />
              </>
            ) : (
              <div className="h-8 w-16 bg-gray-100 rounded animate-pulse mt-1" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500">Action Items</p>
            {healthData ? (
              <p className={`text-2xl font-bold ${healthData.flags.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {healthData.flags.length}
              </p>
            ) : (
              <div className="h-8 w-8 bg-gray-100 rounded animate-pulse mt-1" />
            )}
            <p className="text-xs text-gray-400 mt-1">Flags raised</p>
          </CardContent>
        </Card>
      </div>

      {/* Main tabs */}
      <Tabs defaultValue="velocity">
        <TabsList>
          <TabsTrigger value="velocity">Velocity Trend</TabsTrigger>
          <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
          <TabsTrigger value="health">Team Health</TabsTrigger>
          <TabsTrigger value="sprint">Sprint Prediction</TabsTrigger>
        </TabsList>

        <TabsContent value="velocity">
          <VelocityTab orgId={orgId} />
        </TabsContent>

        <TabsContent value="anomalies">
          <AnomaliesTab orgId={orgId} />
        </TabsContent>

        <TabsContent value="health">
          <TeamHealthTab orgId={orgId} />
        </TabsContent>

        <TabsContent value="sprint">
          <SprintPredictionTab orgId={orgId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
