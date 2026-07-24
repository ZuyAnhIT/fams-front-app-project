import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getTenantSettings, updateTenantSettings } from '../services/tenant.service';
import type { UpdateTenantSettingsRequest } from '../types/Tenant';
import { parseTenantError } from '../utils/tenant.utils';
import { tenantKeys } from './use-tenant';

// ─── useTenantSettings ────────────────────────────────────────────────────────

/**
 * Fetches the settings for a given tenant.
 * Pass `enabled: false` while the tenant ID is not yet known.
 */
export function useTenantSettings(tenantId: string | undefined) {
  const query = useQuery({
    queryKey: tenantKeys.settings(tenantId ?? ''),
    queryFn: () => getTenantSettings(tenantId!),
    enabled: !!tenantId,
    staleTime: 10 * 60 * 1000,
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// ─── useUpdateTenantSettings ──────────────────────────────────────────────────

export interface UseUpdateTenantSettingsResult {
  update: (body: UpdateTenantSettingsRequest) => void;
  isPending: boolean;
  isSuccess: boolean;
  error: string | null;
}

/**
 * Updates settings for a given tenant (partial PATCH).
 * Optimistically updates the cache on success.
 */
export function useUpdateTenantSettings(
  tenantId: string,
): UseUpdateTenantSettingsResult {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (body: UpdateTenantSettingsRequest) =>
      updateTenantSettings(tenantId, body),
    onSuccess: (updatedSettings) => {
      // Refresh both settings cache and parent tenant (which embeds settings)
      queryClient.setQueryData(tenantKeys.settings(tenantId), updatedSettings);
      queryClient.invalidateQueries({ queryKey: tenantKeys.detail(tenantId) });
    },
  });

  return {
    update: mutation.mutate,
    isPending: mutation.isPending,
    isSuccess: mutation.isSuccess,
    error: mutation.isError ? parseTenantError(mutation.error) : null,
  };
}
