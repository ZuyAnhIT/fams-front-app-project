import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { useCheckinStore } from '@/features/checkin/store/checkin.store';
import type { AvailableTenant } from '@/features/rbac/api';
import { useAvailableTenants } from '@/features/rbac/use-available-tenants';

import { switchActiveTenant } from '../api';
import { useAuthStore } from '../store';

export interface UseSelectTenantResult {
  tenants: AvailableTenant[];
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  selectedId: string | null;
  select: (tenantId: string) => void;
  confirm: () => Promise<void>;
  retry: () => void;
  isConfirming: boolean;
  activeTenantId: string | null;
}

/** Selects a tenant through the backend and replaces the complete token pair. */
export function useSelectTenant(): UseSelectTenantResult {
  const queryClient = useQueryClient();
  const setTenantSession = useAuthStore((s) => s.setTenantSession);
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const activeTenantId = useAuthStore((s) => s.activeTenantId);
  const [selectedId, setSelectedId] = useState<string | null>(activeTenantId);
  const [isConfirming, setIsConfirming] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const query = useAvailableTenants();

  useEffect(() => {
    if (
      query.data &&
      selectedId &&
      !query.data.some((tenant) => tenant.id === selectedId)
    ) {
      setSelectedId(null);
    }
  }, [query.data, selectedId]);

  const confirm = async () => {
    if (!selectedId || isConfirming) return;
    if (!refreshToken) {
      setErrorMessage('Phiên đăng nhập không còn đầy đủ. Vui lòng đăng nhập lại.');
      return;
    }
    setIsConfirming(true);
    setErrorMessage(null);

    try {
      // Stop observers belonging to the old company before rotating the JWT.
      await queryClient.cancelQueries();
      const session = await switchActiveTenant(selectedId, refreshToken);

      await setTenantSession(
        session.access_token,
        session.refresh_token,
        session.active_tenant_id,
      );
      if (user) {
        setUser({ ...user, tenant_id: session.active_tenant_id });
      }

      // The persisted open-checkin/offline queues are tenant-keyed. Reset only
      // the in-memory context so the new tenant hydrates its own values.
      useCheckinStore.getState().resetContext();
      queryClient.clear();
      router.replace('/(tabs)/home');
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      if (status === 403) {
        setErrorMessage(
          'Bạn không còn vai trò hoạt động tại công ty này. Danh sách công ty đã được tải lại.',
        );
        const refreshed = await query.refetch();
        if (!refreshed.data?.some((tenant) => tenant.id === selectedId)) {
          setSelectedId(null);
        }
      } else if (status === 404) {
        setErrorMessage('Công ty không còn tồn tại hoặc không còn khả dụng.');
        await query.refetch();
        setSelectedId(null);
      } else if (status !== 401) {
        setErrorMessage('Không thể chuyển công ty. Vui lòng kiểm tra kết nối và thử lại.');
      }
      // A terminal 401 is handled globally by the auth interceptor: tokens,
      // tenant cache and navigation are reset back to Login.
    } finally {
      setIsConfirming(false);
    }
  };

  return {
    tenants: query.data ?? [],
    isLoading: query.isLoading || query.isRefetching,
    isError: query.isError,
    errorMessage,
    selectedId,
    select: (tenantId) => {
      setSelectedId(tenantId);
      setErrorMessage(null);
    },
    confirm,
    retry: () => {
      setErrorMessage(null);
      void query.refetch();
    },
    isConfirming,
    activeTenantId,
  };
}
