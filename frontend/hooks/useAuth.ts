'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authAPI } from '@/lib/api/auth';
import {
  setAuthTokens,
  clearAuthTokens,
  LoginCredentials,
  RegisterData,
} from '@/lib/auth';

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: authAPI.getCurrentUser,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: authAPI.login,
    onSuccess: (data) => {
      setAuthTokens(data.tokens);
      queryClient.setQueryData(['currentUser'], data.user);
      router.push('/dashboard');
    },
  });

  const registerMutation = useMutation({
    mutationFn: authAPI.register,
    onSuccess: (data) => {
      setAuthTokens(data.tokens);
      queryClient.setQueryData(['currentUser'], data.user);
      router.push('/dashboard');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authAPI.logout,
    onSuccess: () => {
      clearAuthTokens();
      queryClient.setQueryData(['currentUser'], null);
      router.push('/login');
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    loginError: loginMutation.error,
    registerError: registerMutation.error,
  };
}
