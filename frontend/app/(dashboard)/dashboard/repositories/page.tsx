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
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { repositoriesAPI, type Repository } from '@/lib/api/repositories';

const mockRepositories: Repository[] = [
  {
    id: '1',
    organization_id: '00000000-1234-1234-1234-000000000001',
    github_repo_id: 1001,
    full_name: 'devmetrics/frontend-app',
    name: 'frontend-app',
    description: 'Next.js frontend application',
    default_branch: 'main',
    is_private: false,
    language: 'TypeScript',
    is_active: true,
    last_synced_at: new Date(Date.now() - 5 * 60000).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    organization_id: '00000000-1234-1234-1234-000000000001',
    github_repo_id: 1002,
    full_name: 'devmetrics/api-gateway',
    name: 'api-gateway',
    description: 'FastAPI backend services',
    default_branch: 'main',
    is_private: true,
    language: 'Python',
    is_active: true,
    last_synced_at: new Date(Date.now() - 12 * 60000).toISOString(),
    created_at: new Date().toISOString(),
  },
  {
    id: '3',
    organization_id: '00000000-1234-1234-1234-000000000001',
    github_repo_id: 1003,
    full_name: 'devmetrics/auth-service',
    name: 'auth-service',
    description: 'Authentication microservice',
    default_branch: 'main',
    is_private: true,
    language: 'Python',
    is_active: true,
    last_synced_at: new Date(Date.now() - 60 * 60000).toISOString(),
    created_at: new Date().toISOString(),
  },
];

function timeSince(dateStr?: string) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function RepositoriesPage() {
  const orgId = '00000000-1234-1234-1234-000000000001';
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [newRepo, setNewRepo] = useState({ full_name: '', github_access_token: '' });

  const { data: repoData } = useQuery({
    queryKey: ['repositories', orgId],
    queryFn: () => repositoriesAPI.list(orgId),
    retry: false,
  });

  const addMutation = useMutation({
    mutationFn: () => {
      const [owner, name] = newRepo.full_name.split('/');
      return repositoriesAPI.add(orgId, {
        github_repo_id: Date.now(),
        full_name: newRepo.full_name,
        name: name || owner,
        default_branch: 'main',
        github_access_token: newRepo.github_access_token,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories', orgId] });
      setShowAddDialog(false);
      setNewRepo({ full_name: '', github_access_token: '' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => repositoriesAPI.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories', orgId] });
      setShowDeleteDialog(null);
    },
  });

  const syncMutation = useMutation({
    mutationFn: (id: string) => repositoriesAPI.triggerSync(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories', orgId] });
    },
  });

  const repositories = repoData?.repositories || mockRepositories;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Repositories</h1>
          <p className="text-gray-600 mt-2">
            Manage connected GitHub repositories
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{repositories.length}</div>
            <p className="text-sm text-gray-500">Connected Repos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {repositories.filter((r) => r.is_active).length}
            </div>
            <p className="text-sm text-gray-500">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {repositories.filter((r) => r.is_private).length}
            </div>
            <p className="text-sm text-gray-500">Private</p>
          </CardContent>
        </Card>
      </div>

      {/* Repository List */}
      <div className="space-y-4">
        {repositories.map((repo) => (
          <Card key={repo.id}>
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
                      <p className="font-medium">{repo.full_name}</p>
                      {repo.is_private && (
                        <Badge variant="outline" className="text-xs">
                          Private
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 mt-1">
                      {repo.language && (
                        <span className="text-xs text-gray-500">{repo.language}</span>
                      )}
                      {repo.description && (
                        <span className="text-xs text-gray-500">{repo.description}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <Badge variant={repo.is_active ? 'success' : 'secondary'}>
                      {repo.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      Synced: {timeSince(repo.last_synced_at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => syncMutation.mutate(repo.id)}
                    disabled={syncMutation.isPending}
                    title="Sync now"
                  >
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
                      className={syncMutation.isPending ? 'animate-spin' : ''}
                    >
                      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                    </svg>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteDialog(repo.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    title="Remove"
                  >
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
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Connect More */}
      <Card>
        <CardHeader>
          <CardTitle>Connect More Repositories</CardTitle>
          <CardDescription>
            Add GitHub repositories to track your team&apos;s development metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            DevMetrics automatically syncs commits, pull requests, and code
            reviews from connected repositories. Data is refreshed every 15
            minutes.
          </p>
          <Button variant="outline" onClick={() => setShowAddDialog(true)}>
            Browse GitHub Repositories
          </Button>
        </CardContent>
      </Card>

      {/* Add Repository Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Repository</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="repoName">Repository (owner/name)</Label>
              <Input
                id="repoName"
                placeholder="e.g. octocat/hello-world"
                value={newRepo.full_name}
                onChange={(e) =>
                  setNewRepo((prev) => ({ ...prev, full_name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="token">GitHub Access Token</Label>
              <Input
                id="token"
                type="password"
                placeholder="ghp_..."
                value={newRepo.github_access_token}
                onChange={(e) =>
                  setNewRepo((prev) => ({
                    ...prev,
                    github_access_token: e.target.value,
                  }))
                }
              />
              <p className="text-xs text-gray-500">
                Personal access token with repo read permissions.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={
                !newRepo.full_name.includes('/') ||
                !newRepo.github_access_token ||
                addMutation.isPending
              }
            >
              {addMutation.isPending ? 'Adding...' : 'Add Repository'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog !== null}
        onOpenChange={() => setShowDeleteDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Repository</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-4">
            Are you sure you want to remove this repository? Historical data will
            be preserved but syncing will stop.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => showDeleteDialog && removeMutation.mutate(showDeleteDialog)}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
