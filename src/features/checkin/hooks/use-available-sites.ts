import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { useAuthStore } from '@/features/auth/store';

import { getAvailableSites } from '../services/checkin.service';
import {
  readAvailableSitesCache,
  writeAvailableSitesCache,
  type AvailableSitesCache,
} from '../services/available-sites-cache';
import { sortAvailableSites } from '../utils/available-site';
import { checkinKeys } from './use-checkin';

/** US1: site nhân viên được phép check-in hôm nay, theo assignment đang active. */
export function useAvailableSites() {
  const tenantId = useAuthStore((s) => s.activeTenantId);
  const userId = useAuthStore((s) => s.user?.id);

  const query = useQuery({
    queryKey: [...checkinKeys.availableSites(tenantId ?? ''), userId ?? ''],
    queryFn: async (): Promise<AvailableSitesCache & { offline: boolean }> => {
      try {
        const sites = await getAvailableSites(tenantId!);
        const cachedAt = Date.now();
        // Local persistence is a resilience enhancement; storage pressure must
        // never turn a successful online API response into a failed screen.
        await writeAvailableSitesCache(userId!, tenantId!, sites, cachedAt).catch(
          () => undefined,
        );
        return { cachedAt, sites, offline: false };
      } catch (error) {
        if (isAxiosError(error) && !error.response) {
          const cache = await readAvailableSitesCache(userId!, tenantId!).catch(
            () => null,
          );
          if (cache) return { ...cache, offline: true };
        }
        throw error;
      }
    },
    enabled: !!tenantId && !!userId,
    staleTime: 30 * 1000,
    select: (data) => ({ ...data, sites: sortAvailableSites(data.sites) }),
    retry: (failureCount, error) =>
      !(isAxiosError(error) && !error.response) && failureCount < 2,
  });

  const isForbidden = isAxiosError(query.error) && query.error.response?.status === 403;

  return {
    sites: query.data?.sites ?? [],
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isError: query.isError,
    isForbidden,
    error: query.error,
    dataUpdatedAt: query.data?.cachedAt ?? query.dataUpdatedAt,
    isUsingOfflineCache: query.data?.offline === true,
    refetch: () => {
      void query.refetch();
    },
  };
}
