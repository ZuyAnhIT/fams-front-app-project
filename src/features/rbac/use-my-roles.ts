import { useQuery } from '@tanstack/react-query';

import { getMyRoles } from './api';

export const myRolesKey = ['roles', 'me'] as const;

export function useMyRoles() {
  return useQuery({
    queryKey: myRolesKey,
    queryFn: getMyRoles,
  });
}
