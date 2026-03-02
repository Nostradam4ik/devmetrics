'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const weeklyData = [
  { day: 'Mon', commits: 23, prs: 5 },
  { day: 'Tue', commits: 31, prs: 8 },
  { day: 'Wed', commits: 28, prs: 6 },
  { day: 'Thu', commits: 35, prs: 9 },
  { day: 'Fri', commits: 42, prs: 12 },
  { day: 'Sat', commits: 12, prs: 2 },
  { day: 'Sun', commits: 8, prs: 1 },
];

const maxCommits = Math.max(...weeklyData.map((d) => d.commits));

const repositoryStats = [
  { name: 'frontend-app', commits: 89, prs: 15, language: 'TypeScript' },
  { name: 'api-gateway', commits: 67, prs: 12, language: 'Python' },
  { name: 'auth-service', commits: 45, prs: 8, language: 'Python' },
  { name: 'mobile-app', commits: 34, prs: 6, language: 'React Native' },
  { name: 'infra-config', commits: 12, prs: 3, language: 'HCL' },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-gray-600 mt-2">
          Detailed metrics and trends for your team
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="commits">Commits</TabsTrigger>
          <TabsTrigger value="prs">Pull Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            {/* Weekly Activity Chart (simplified bar chart) */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Activity</CardTitle>
                <CardDescription>Commits per day this week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end space-x-2 h-48">
                  {weeklyData.map((d) => (
                    <div
                      key={d.day}
                      className="flex-1 flex flex-col items-center"
                    >
                      <div className="text-xs text-gray-500 mb-1">
                        {d.commits}
                      </div>
                      <div
                        className="w-full bg-blue-500 rounded-t-sm transition-all hover:bg-blue-600"
                        style={{
                          height: `${(d.commits / maxCommits) * 150}px`,
                        }}
                      />
                      <div className="text-xs text-gray-500 mt-2">{d.day}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Code Velocity */}
            <Card>
              <CardHeader>
                <CardTitle>Code Velocity</CardTitle>
                <CardDescription>Lines of code changed per day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Additions</span>
                    <span className="text-sm font-bold text-green-600">
                      +4,231
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: '72%' }}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Deletions</span>
                    <span className="text-sm font-bold text-red-600">
                      -1,847
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: '45%' }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <span className="text-sm font-medium">Net Change</span>
                    <span className="text-sm font-bold text-blue-600">
                      +2,384
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Files Changed</span>
                    <span className="text-sm font-bold">187</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Repository Stats */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Repository Activity</CardTitle>
              <CardDescription>
                Activity breakdown by repository
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {repositoryStats.map((repo) => (
                  <div
                    key={repo.name}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center space-x-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-gray-400"
                      >
                        <path d="M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 9a9 9 0 0 1-9 9" />
                      </svg>
                      <div>
                        <p className="text-sm font-medium">{repo.name}</p>
                        <p className="text-xs text-gray-500">{repo.language}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6 text-sm">
                      <div className="text-center">
                        <p className="font-medium">{repo.commits}</p>
                        <p className="text-xs text-gray-500">commits</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">{repo.prs}</p>
                        <p className="text-xs text-gray-500">PRs</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commits">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Commit History</CardTitle>
              <CardDescription>
                Detailed commit analytics will be available once repositories are
                connected
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-48 text-gray-400">
                <div className="text-center">
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
                    className="mx-auto mb-3"
                  >
                    <path d="M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 9a9 9 0 0 1-9 9" />
                  </svg>
                  <p>Connect a repository to see commit analytics</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prs">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Pull Request Analytics</CardTitle>
              <CardDescription>
                PR cycle time, review time, and merge rate analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-48 text-gray-400">
                <div className="text-center">
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
                    className="mx-auto mb-3"
                  >
                    <path d="M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 9a9 9 0 0 1-9 9" />
                  </svg>
                  <p>Connect a repository to see PR analytics</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
