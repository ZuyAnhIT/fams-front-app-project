import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';

import { useToast } from '@/components/ui/toast';

import { createTenant } from '../services/tenant.service';
import type { CreateTenantRequest } from '../types/Tenant';
import { parseTenantError } from '../utils/tenant.utils';
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
  const { showToast } = useToast();

  const mutation = useMutation({
    mutationFn: (body: CreateTenantRequest) => createTenant(body),
    onSuccess: (newTenant) => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.all });
      queryClient.setQueryData(tenantKeys.detail(newTenant.id), newTenant);
      showToast('Tạo công ty thành công', 'success');
      router.replace('/(tabs)/home' as never);
    },
    onError: (error) => {
      showToast(parseTenantError(error), 'error');
    },
  });

  return {
    createTenant: mutation.mutate,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.isError ? parseTenantError(mutation.error) : null,
  };
}
