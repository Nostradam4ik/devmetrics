'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const stats = [
  {
    name: 'Total Commits',
    value: '2,543',
    change: '+12.5%',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    name: 'Pull Requests',
    value: '127',
    change: '+8.2%',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    name: 'Active Developers',
    value: '12',
    change: '+2',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    name: 'Avg Cycle Time',
    value: '2.3 days',
    change: '-15%',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
];

const recentActivity = [
  {
    message: 'Fixed authentication bug in login flow',
    author: 'Alice Johnson',
    time: '2 hours ago',
  },
  {
    message: 'Added unit tests for user service',
    author: 'Bob Smith',
    time: '4 hours ago',
  },
  {
    message: 'Refactored API client interceptors',
    author: 'Carol White',
    time: '6 hours ago',
  },
];

const topContributors = [
  { name: 'Alice Johnson', commits: 42 },
  { name: 'Bob Smith', commits: 38 },
  { name: 'Carol White', commits: 35 },
  { name: 'David Brown', commits: 28 },
  { name: 'Eve Davis', commits: 24 },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Overview of your team&apos;s productivity metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.name}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <div className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-green-600 mt-1">
                {stat.change} from last week
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity & Contributors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest commits and pull requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="w-2 h-2 bg-blue-600 rounded-full" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.message}</p>
                    <p className="text-xs text-gray-500">
                      {activity.author} - {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Contributors</CardTitle>
            <CardDescription>
              This week&apos;s most active developers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topContributors.map((contributor) => (
                <div
                  key={contributor.name}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                      {contributor.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{contributor.name}</p>
                      <p className="text-xs text-gray-500">
                        {contributor.commits} commits
                      </p>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-blue-600">
                    {contributor.commits}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coming Soon */}
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            We&apos;re working on bringing you more insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold mb-2">Advanced Analytics</h3>
              <p className="text-sm text-gray-600">
                Deep dive into code quality metrics and trends
              </p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold mb-2">AI Insights</h3>
              <p className="text-sm text-gray-600">
                Get personalized recommendations powered by GPT-4
              </p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold mb-2">Team Reports</h3>
              <p className="text-sm text-gray-600">
                Automated weekly and monthly team performance reports
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
