import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { createTenant } from '../api';
import type { CreateTenantRequest } from '../types';
import { parseTenantError } from '../utils';
import { tenantKeys } from './use-tenant';

export interface UseCreateTenantResult {
  createTenant: (body: CreateTenantRequest) => void;
  isPending: boolean;
  isSuccess: boolean;
  error: string | null;
}

/**
 * Creates a new tenant via the Platform Admin wizard.
 * On success: invalidates the tenant list cache and navigates to the
 * newly created tenant's management screen.
 */
export function useCreateTenant(): UseCreateTenantResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (body: CreateTenantRequest) => createTenant(body),
    onSuccess: (newTenant) => {
      // Invalidate list so it refreshes next time admin views it
      queryClient.invalidateQueries({ queryKey: tenantKeys.all });
      // Pre-populate the detail cache to avoid a redundant fetch
      queryClient.setQueryData(tenantKeys.detail(newTenant.id), newTenant);
      // Navigate to the new tenant detail (admin would manage it from there)
      router.replace('/(tabs)/home' as never);
    },
  });

  return {
    createTenant: mutation.mutate,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.isError ? parseTenantError(mutation.error) : null,
  };
}
