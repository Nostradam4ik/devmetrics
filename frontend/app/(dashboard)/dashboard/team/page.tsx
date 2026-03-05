'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { teamAPI } from '@/lib/api/users';

const mockMembers = [
  {
    id: '1',
    user_id: 'u1',
    organization_id: 'demo-org',
    role: 'owner',
    joined_at: '2024-01-01T00:00:00Z',
    user: {
      email: 'alice@example.com',
      full_name: 'Alice Johnson',
      avatar_url: null,
      github_login: 'alice',
      is_active: true,
    },
    commits: 42,
    prs: 8,
    reviews: 15,
  },
  {
    id: '2',
    user_id: 'u2',
    organization_id: 'demo-org',
    role: 'admin',
    joined_at: '2024-01-15T00:00:00Z',
    user: {
      email: 'bob@example.com',
      full_name: 'Bob Smith',
      avatar_url: null,
      github_login: 'bob',
      is_active: true,
    },
    commits: 38,
    prs: 6,
    reviews: 12,
  },
  {
    id: '3',
    user_id: 'u3',
    organization_id: 'demo-org',
    role: 'member',
    joined_at: '2024-02-01T00:00:00Z',
    user: {
      email: 'carol@example.com',
      full_name: 'Carol White',
      avatar_url: null,
      github_login: 'carol',
      is_active: true,
    },
    commits: 35,
    prs: 10,
    reviews: 8,
  },
  {
    id: '4',
    user_id: 'u4',
    organization_id: 'demo-org',
    role: 'member',
    joined_at: '2024-02-15T00:00:00Z',
    user: {
      email: 'david@example.com',
      full_name: 'David Brown',
      avatar_url: null,
      github_login: 'david',
      is_active: false,
    },
    commits: 28,
    prs: 5,
    reviews: 11,
  },
  {
    id: '5',
    user_id: 'u5',
    organization_id: 'demo-org',
    role: 'viewer',
    joined_at: '2024-03-01T00:00:00Z',
    user: {
      email: 'eve@example.com',
      full_name: 'Eve Davis',
      avatar_url: null,
      github_login: 'eve',
      is_active: true,
    },
    commits: 24,
    prs: 4,
    reviews: 6,
  },
];

const roleColors: Record<string, string> = {
  owner: 'destructive',
  admin: 'warning',
  member: 'secondary',
  viewer: 'outline',
};

const roles = ['admin', 'member', 'viewer'];

function getInitials(name: string | null, email: string) {
  if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  return email.slice(0, 2).toUpperCase();
}

export default function TeamPage() {
  const orgId = 'demo-org';
  const queryClient = useQueryClient();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState<string | null>(null);
  const [invite, setInvite] = useState({ email: '', role: 'member' });
  const [members] = useState(mockMembers);

  const inviteMutation = useMutation({
    mutationFn: () => teamAPI.inviteMember(orgId, invite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', orgId] });
      setShowInviteDialog(false);
      setInvite({ email: '', role: 'member' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => teamAPI.removeMember(orgId, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', orgId] });
      setShowRemoveDialog(null);
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      teamAPI.updateRole(orgId, memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team', orgId] });
    },
  });

  const activeCount = members.filter((m) => m.user.is_active).length;
  const totalCommits = members.reduce((s, m) => s + m.commits, 0);
  const totalPRs = members.reduce((s, m) => s + m.prs, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team</h1>
          <p className="text-gray-600 dark:text-slate-400 mt-2">
            Manage and monitor your team members
          </p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)}>
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
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
          Invite Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{members.length}</div>
            <p className="text-sm text-gray-500 dark:text-slate-400">Total Members</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
            <p className="text-sm text-gray-500 dark:text-slate-400">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{totalCommits}</div>
            <p className="text-sm text-gray-500 dark:text-slate-400">Total Commits (7d)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">{totalPRs}</div>
            <p className="text-sm text-gray-500 dark:text-slate-400">PRs Opened (7d)</p>
          </CardContent>
        </Card>
      </div>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            View activity and manage roles for each team member
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-slate-400">Member</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-slate-400">Role</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 dark:text-slate-400">Commits</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 dark:text-slate-400">PRs</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 dark:text-slate-400">Reviews</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 dark:text-slate-400">Status</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 dark:text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr
                    key={member.id}
                    className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/30"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-xs font-medium text-white">
                          {getInitials(member.user.full_name, member.user.email)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{member.user.full_name}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">{member.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {member.role === 'owner' ? (
                        <Badge variant="destructive">owner</Badge>
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) =>
                            updateRoleMutation.mutate({
                              memberId: member.id,
                              role: e.target.value,
                            })
                          }
                          className="text-xs border border-gray-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                        >
                          {roles.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center text-sm font-medium">{member.commits}</td>
                    <td className="py-3 px-4 text-center text-sm font-medium">{member.prs}</td>
                    <td className="py-3 px-4 text-center text-sm font-medium">{member.reviews}</td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={member.user.is_active ? 'success' : 'secondary'}>
                        {member.user.is_active ? 'active' : 'inactive'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {member.role !== 'owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => setShowRemoveDialog(member.id)}
                        >
                          Remove
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Email Address</Label>
              <Input
                id="inviteEmail"
                type="email"
                placeholder="colleague@company.com"
                value={invite.email}
                onChange={(e) => setInvite((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteRole">Role</Label>
              <select
                id="inviteRole"
                value={invite.role}
                onChange={(e) => setInvite((p) => ({ ...p, role: e.target.value }))}
                className="w-full border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="admin">Admin — Can manage repos and team</option>
                <option value="member">Member — Can view all data</option>
                <option value="viewer">Viewer — Read-only access</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => inviteMutation.mutate()}
              disabled={!invite.email || inviteMutation.isPending}
            >
              {inviteMutation.isPending ? 'Sending...' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Confirmation */}
      <Dialog open={showRemoveDialog !== null} onOpenChange={() => setShowRemoveDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-slate-400 py-4">
            Are you sure you want to remove this member from the team? They will
            lose access to all team data.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => showRemoveDialog && removeMutation.mutate(showRemoveDialog)}
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
