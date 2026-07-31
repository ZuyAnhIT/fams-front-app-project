import { useQuery } from '@tanstack/react-query';

import { getAvailableTenants } from './api';

export const availableTenantsKey = ['auth', 'available-tenants'] as const;

/** Always refresh on mount because tenant membership may have changed. */
export function useAvailableTenants() {
  return useQuery({
    queryKey: availableTenantsKey,
    queryFn: getAvailableTenants,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}
