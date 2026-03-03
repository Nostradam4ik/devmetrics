import apiClient from '@/lib/api-client';
import type { User } from '@/lib/auth';

export interface UserUpdate {
  full_name?: string;
  avatar_url?: string;
}

export interface PasswordChange {
  current_password: string;
  new_password: string;
}

export interface TeamMember {
  id: string;
  user_id: string;
  organization_id: string;
  role: string;
  joined_at: string;
  user: {
    email: string;
    full_name: string | null;
    avatar_url: string | null;
    github_login: string | null;
    is_active: boolean;
  };
}

export interface InviteRequest {
  email: string;
  role?: string;
}

export const usersAPI = {
  getProfile: async () => {
    const response = await apiClient.get<User>('/users/me');
    return response.data;
  },

  updateProfile: async (data: UserUpdate) => {
    const response = await apiClient.patch<User>('/users/me', data);
    return response.data;
  },

  changePassword: async (data: PasswordChange) => {
    const response = await apiClient.post('/users/me/change-password', data);
    return response.data;
  },

  deleteAccount: async () => {
    const response = await apiClient.delete('/users/me');
    return response.data;
  },
};

export const teamAPI = {
  listMembers: async (organizationId: string) => {
    const response = await apiClient.get<{ members: TeamMember[]; total: number }>(
      `/organizations/${organizationId}/members`
    );
    return response.data;
  },

  inviteMember: async (organizationId: string, data: InviteRequest) => {
    const response = await apiClient.post(
      `/organizations/${organizationId}/members/invite`,
      data
    );
    return response.data;
  },

  updateRole: async (organizationId: string, memberId: string, role: string) => {
    const response = await apiClient.patch(
      `/organizations/${organizationId}/members/${memberId}`,
      { role }
    );
    return response.data;
  },

  removeMember: async (organizationId: string, memberId: string) => {
    const response = await apiClient.delete(
      `/organizations/${organizationId}/members/${memberId}`
    );
    return response.data;
  },
};
