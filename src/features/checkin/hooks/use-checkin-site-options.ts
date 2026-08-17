import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useAuthStore } from '@/features/auth/store';

import { getCheckinHistory } from '../services/checkin.service';
import { checkinKeys } from './use-checkin';

export interface CheckinSiteOption {
  siteId: string;
  siteName: string;
}

/** #77 gap fix (2026-08-17): distinct sites the employee has ever checked into, derived from their
 *  own recent history — used to populate the site filter dropdown on the history screen. A
 *  lightweight, unfiltered, larger-page fetch (separate from the paginated list itself) is enough
 *  since this only needs to be "good enough recent options", not exhaustive. */
export function useCheckinSiteOptions() {
  const tenantId = useAuthStore((s) => s.activeTenantId);

  const query = useQuery({
    queryKey: [...checkinKeys.all, 'site-options', tenantId ?? ''] as const,
    queryFn: () => getCheckinHistory(tenantId!, { page: 0, size: 100 }),
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const options = useMemo<CheckinSiteOption[]>(() => {
    const seen = new Map<string, string>();
    for (const record of query.data?.content ?? []) {
      if (!seen.has(record.siteId)) {
        seen.set(record.siteId, record.siteName ?? record.siteId);
      }
    }
    return Array.from(seen, ([siteId, siteName]) => ({ siteId, siteName }));
  }, [query.data]);

  return { options, isLoading: query.isLoading };
}
