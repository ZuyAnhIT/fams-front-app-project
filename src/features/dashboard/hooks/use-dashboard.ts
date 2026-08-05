import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store';
import { useMyRoles } from '@/features/rbac/use-my-roles';
import { getEmployeeDashboard, getSupervisorDashboard } from '../services/dashboard.service';

export const dashboardKeys = {
  employee: (tenantId: string) => ['dashboard', tenantId, 'employee'] as const,
  supervisor: (tenantId: string) => ['dashboard', tenantId, 'supervisor'] as const,
};

export function useEmployeeDashboard() {
  const tenantId = useAuthStore((state) => state.activeTenantId);
  return useQuery({
    queryKey: dashboardKeys.employee(tenantId ?? ''),
    queryFn: () => getEmployeeDashboard(tenantId!),
    enabled: Boolean(tenantId),
    staleTime: 30_000,
  });
}

export function useSupervisorDashboard(enabled = true) {
  const tenantId = useAuthStore((state) => state.activeTenantId);
  return useQuery({
    queryKey: dashboardKeys.supervisor(tenantId ?? ''),
    queryFn: () => getSupervisorDashboard(tenantId!),
    enabled: Boolean(tenantId) && enabled,
    refetchInterval: enabled ? 60_000 : false,
  });
}

export function useIsCurrentTenantSupervisor() {
  const tenantId = useAuthStore((state) => state.activeTenantId);
  const roles = useMyRoles();
  return {
    isSupervisor: Boolean(roles.data?.some((role) =>
      role.tenantId === tenantId && role.roleName === 'SITE_SUPERVISOR')),
    isLoading: roles.isLoading,
  };
}
