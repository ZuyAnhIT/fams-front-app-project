import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store';
import { apiClient } from '@/services/api-client';
import { unwrapApiData } from '@/services/api-response';

export interface SitePresenceEntry {
  siteId: string;
  siteName: string;
  timezone: string;
  assignedCount: number;
  presentCount: number;
  absentCount: number;
  presentEmployees: { employeeId: string; employeeName: string; employeeCode: string | null }[];
  absentEmployees: { employeeId: string; employeeName: string; employeeCode: string | null }[];
}

export interface SitePresenceReport {
  reportedAt: string;
  totalSites: number;
  totalPresent: number;
  totalAssigned: number;
  totalAbsent: number;
  sites: { content: SitePresenceEntry[]; page: number; size: number; totalElements: number; totalPages: number };
}

async function getSitePresenceReport(tenantId: string): Promise<SitePresenceReport> {
  const { data } = await apiClient.get(`/tenants/${tenantId}/reports/sites/presence`, { params: { page: 0, size: 100 } });
  return unwrapApiData<SitePresenceReport>(data);
}

export function useSitePresenceReport(enabled = true) {
  const tenantId = useAuthStore((state) => state.activeTenantId);
  return useQuery({
    queryKey: ['reports', tenantId, 'site-presence'],
    queryFn: () => getSitePresenceReport(tenantId!),
    enabled: Boolean(tenantId) && enabled,
    refetchInterval: enabled ? 60_000 : false,
  });
}
