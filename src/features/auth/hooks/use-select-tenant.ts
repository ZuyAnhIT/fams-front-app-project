import { useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";

import { getAvailableTenants, type AvailableTenant } from "@/features/rbac/api";
import { useCheckinStore } from "@/features/checkin/store/checkin.store";

import { useAuthStore } from "../store";

export interface UseSelectTenantResult {
  tenants: AvailableTenant[];
  isLoading: boolean;
  isError: boolean;
  selectedId: string | null;
  select: (tenantId: string) => void;
  confirm: () => Promise<void>;
  isConfirming: boolean;
}

/**
 * Lets the user pick which tenant to operate in when they can act in more
 * than one — both right after login (no candidate active yet) and later
 * from Profile to switch companies without signing out.
 */
export function useSelectTenant(): UseSelectTenantResult {
  const queryClient = useQueryClient();
  const setActiveTenantId = useAuthStore((s) => s.setActiveTenantId);
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);
  const activeTenantId = useAuthStore((s) => s.activeTenantId);
  const [selectedId, setSelectedId] = useState<string | null>(activeTenantId);
  const [isConfirming, setIsConfirming] = useState(false);

  const query = useQuery({
    queryKey: ["auth", "available-tenants"],
    queryFn: getAvailableTenants,
    staleTime: 5 * 60 * 1000,
  });

  const confirm = async () => {
    if (!selectedId) return;
    setIsConfirming(true);
    try {
      useCheckinStore.getState().resetContext();
      await queryClient.cancelQueries();
      await setActiveTenantId(selectedId);
      queryClient.removeQueries({
        predicate: (cachedQuery) => cachedQuery.queryKey[0] !== 'auth',
      });
      if (user) setUser({ ...user, tenant_id: selectedId });
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(tabs)/home");
      }
    } finally {
      setIsConfirming(false);
    }
  };

  return {
    tenants: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    selectedId,
    select: setSelectedId,
    confirm,
    isConfirming,
  };
}
