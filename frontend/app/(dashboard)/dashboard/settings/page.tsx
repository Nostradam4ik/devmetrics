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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { usersAPI } from '@/lib/api/users';

interface FormErrors {
  fullName?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

interface Notification {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

const defaultNotifications: Notification[] = [
  {
    key: 'weekly_digest',
    label: 'Weekly digest email',
    description: 'Receive a weekly summary of team activity',
    enabled: true,
  },
  {
    key: 'pr_reminders',
    label: 'PR review reminders',
    description: 'Get reminded about pending code reviews',
    enabled: true,
  },
  {
    key: 'ai_alerts',
    label: 'AI insight alerts',
    description: 'Be notified when new AI insights are generated',
    enabled: false,
  },
  {
    key: 'sync_updates',
    label: 'Sync status updates',
    description: 'Get notified about repository sync status changes',
    enabled: false,
  },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Profile state
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileErrors, setProfileErrors] = useState<FormErrors>({});

  // Password state
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<FormErrors>({});

  // Notifications state
  const [notifications, setNotifications] = useState(defaultNotifications);
  const [notifSaved, setNotifSaved] = useState(false);

  // Delete dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const updateProfileMutation = useMutation({
    mutationFn: () => usersAPI.updateProfile({ full_name: fullName }),
    onSuccess: () => {
      setProfileSuccess(true);
      setProfileErrors({});
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setTimeout(() => setProfileSuccess(false), 3000);
    },
    onError: () => {
      setProfileErrors({ fullName: 'Failed to update profile. Try again.' });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      usersAPI.changePassword({
        current_password: passwords.currentPassword,
        new_password: passwords.newPassword,
      }),
    onSuccess: () => {
      setPasswordSuccess(true);
      setPasswordErrors({});
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(false), 3000);
    },
    onError: () => {
      setPasswordErrors({ currentPassword: 'Incorrect current password.' });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: () => usersAPI.deleteAccount(),
    onSuccess: () => {
      window.location.href = '/login';
    },
  });

  const validateProfile = () => {
    const errors: FormErrors = {};
    if (!fullName.trim()) errors.fullName = 'Full name is required.';
    setProfileErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePassword = () => {
    const errors: FormErrors = {};
    if (!passwords.currentPassword) errors.currentPassword = 'Current password required.';
    if (passwords.newPassword.length < 8)
      errors.newPassword = 'Password must be at least 8 characters.';
    if (passwords.newPassword !== passwords.confirmPassword)
      errors.confirmPassword = 'Passwords do not match.';
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const toggleNotification = (key: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.key === key ? { ...n, enabled: !n.enabled } : n))
    );
  };

  const saveNotifications = () => {
    // TODO: persist to backend
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600 mt-2">
          Manage your account and application preferences
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="space-y-6 mt-4">
            {/* Profile Info */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-xl font-bold text-white">
                    {(user?.full_name || user?.email || 'U')
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium">{user?.full_name || 'User'}</p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                    {user?.github_login && (
                      <p className="text-xs text-gray-400">@{user.github_login}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                    />
                    {profileErrors.fullName && (
                      <p className="text-xs text-red-500">{profileErrors.fullName}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" value={user?.email || ''} disabled />
                    <p className="text-xs text-gray-400">Email cannot be changed.</p>
                  </div>
                </div>

                {profileSuccess && (
                  <p className="text-sm text-green-600">Profile updated successfully.</p>
                )}

                <Button
                  onClick={() => validateProfile() && updateProfileMutation.mutate()}
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwords.currentPassword}
                    onChange={(e) =>
                      setPasswords((p) => ({ ...p, currentPassword: e.target.value }))
                    }
                  />
                  {passwordErrors.currentPassword && (
                    <p className="text-xs text-red-500">{passwordErrors.currentPassword}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwords.newPassword}
                      onChange={(e) =>
                        setPasswords((p) => ({ ...p, newPassword: e.target.value }))
                      }
                    />
                    {passwordErrors.newPassword && (
                      <p className="text-xs text-red-500">{passwordErrors.newPassword}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwords.confirmPassword}
                      onChange={(e) =>
                        setPasswords((p) => ({ ...p, confirmPassword: e.target.value }))
                      }
                    />
                    {passwordErrors.confirmPassword && (
                      <p className="text-xs text-red-500">{passwordErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                {passwordSuccess && (
                  <p className="text-sm text-green-600">Password changed successfully.</p>
                )}

                <Button
                  variant="outline"
                  onClick={() => validatePassword() && changePasswordMutation.mutate()}
                  disabled={changePasswordMutation.isPending}
                >
                  {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                </Button>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible actions for your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Deleting your account will permanently remove all your data.
                  This action cannot be undone.
                </p>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <div className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>GitHub</CardTitle>
                <CardDescription>
                  Connect your GitHub account to sync repositories
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium">GitHub</p>
                      <p className="text-sm text-gray-500">
                        {user?.github_login
                          ? `Connected as @${user.github_login}`
                          : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  <Button variant={user?.github_login ? 'outline' : 'default'}>
                    {user?.github_login ? 'Disconnect' : 'Connect'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>More Integrations</CardTitle>
                <CardDescription>Coming soon</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['GitLab', 'Jira', 'Slack', 'Linear'].map((name) => (
                    <div
                      key={name}
                      className="p-4 border border-gray-200 rounded-lg opacity-50"
                    >
                      <p className="font-medium">{name}</p>
                      <p className="text-sm text-gray-500">Coming soon</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notifications.map((pref) => (
                  <div
                    key={pref.key}
                    className="flex items-center justify-between py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{pref.label}</p>
                      <p className="text-xs text-gray-500">{pref.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pref.enabled}
                        onChange={() => toggleNotification(pref.key)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                    </label>
                  </div>
                ))}
              </div>

              {notifSaved && (
                <p className="text-sm text-green-600 mt-4">Preferences saved.</p>
              )}

              <Button className="mt-6" onClick={saveNotifications}>
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Account Confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Account</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-4">
            This will permanently delete your account and all associated data.
            This action <strong>cannot be undone</strong>.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteAccountMutation.mutate()}
              disabled={deleteAccountMutation.isPending}
            >
              {deleteAccountMutation.isPending ? 'Deleting...' : 'Delete My Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
