import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getMyProfile, updateMyProfile } from '../services/auth.service';
import { useAuthStore } from '../store/auth.store';
import type { UpdateProfileRequest, UserProfile } from '../types/Auth';
import { parseAuthError } from '../utils/auth.utils';

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const profileKeys = {
  me: () => ['auth', 'me'] as const,
};

// ─── useProfile ───────────────────────────────────────────────────────────────

export interface UseProfileResult {
  profile: UserProfile | undefined;
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Fetches the authenticated user's full profile from GET /auth/me.
 *
 * Also keeps the Zustand authStore in sync when fresh data arrives,
 * so other parts of the app reading `useAuthStore().user` stay current.
 */
export function useProfile(): UseProfileResult {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const setUser = useAuthStore((s) => s.setUser);
  const currentUser = useAuthStore((s) => s.user);

  const query = useQuery({
    queryKey: profileKeys.me(),
    queryFn: () => getMyProfile(currentUser),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (query.data) setUser(query.data);
  }, [query.data, setUser]);

  return {
    profile: query.data,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── useUpdateProfile ─────────────────────────────────────────────────────────

export interface UseUpdateProfileResult {
  update: (body: UpdateProfileRequest) => void;
  isPending: boolean;
  isSuccess: boolean;
  error: string | null;
  reset: () => void;
}

/**
 * Sends a PATCH /auth/me request to update profile fields.
 *
 * On success:
 * - Updates the TanStack Query cache for profileKeys.me()
 * - Syncs the updated profile into Zustand authStore
 */
export function useUpdateProfile(): UseUpdateProfileResult {
  const setUser = useAuthStore((s) => s.setUser);
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (body: UpdateProfileRequest) => updateMyProfile(body, currentUser),
    onSuccess: (updatedProfile) => {
      setUser(updatedProfile);
      queryClient.setQueryData(profileKeys.me(), updatedProfile);
    },
  });

  return {
    update: mutation.mutate,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.isError ? parseAuthError(mutation.error) : null,
    reset: mutation.reset,
  };
}
