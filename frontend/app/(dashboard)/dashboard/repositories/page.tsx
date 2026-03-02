'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const repositories = [
  {
    name: 'frontend-app',
    fullName: 'devmetrics/frontend-app',
    language: 'TypeScript',
    lastSync: '5 minutes ago',
    status: 'synced',
    commits: 1243,
    prs: 87,
    isPrivate: false,
  },
  {
    name: 'api-gateway',
    fullName: 'devmetrics/api-gateway',
    language: 'Python',
    lastSync: '12 minutes ago',
    status: 'synced',
    commits: 876,
    prs: 64,
    isPrivate: true,
  },
  {
    name: 'auth-service',
    fullName: 'devmetrics/auth-service',
    language: 'Python',
    lastSync: '1 hour ago',
    status: 'syncing',
    commits: 432,
    prs: 31,
    isPrivate: true,
  },
];

export default function RepositoriesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Repositories</h1>
          <p className="text-gray-600 mt-2">
            Manage connected GitHub repositories
          </p>
        </div>
        <Button>
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
            className="mr-2"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Repository
        </Button>
      </div>

      {/* Repository Cards */}
      <div className="grid grid-cols-1 gap-4">
        {repositories.map((repo) => (
          <Card key={repo.fullName}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-gray-600"
                    >
                      <path d="M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 9a9 9 0 0 1-9 9" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{repo.fullName}</p>
                      {repo.isPrivate && (
                        <Badge variant="outline" className="text-xs">
                          Private
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      <span className="text-xs text-gray-500">
                        {repo.language}
                      </span>
                      <span className="text-xs text-gray-500">
                        {repo.commits} commits
                      </span>
                      <span className="text-xs text-gray-500">
                        {repo.prs} PRs
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <Badge
                      variant={
                        repo.status === 'synced' ? 'success' : 'warning'
                      }
                    >
                      {repo.status}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      Last sync: {repo.lastSync}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
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
                    >
                      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State for when no repos connected */}
      <Card>
        <CardHeader>
          <CardTitle>Connect More Repositories</CardTitle>
          <CardDescription>
            Add GitHub repositories to track your team&apos;s development
            metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            DevMetrics automatically syncs commits, pull requests, and code
            reviews from connected repositories. Data is refreshed every 15
            minutes.
          </p>
          <Button variant="outline">Browse GitHub Repositories</Button>
        </CardContent>
      </Card>
    </div>
  );
}
