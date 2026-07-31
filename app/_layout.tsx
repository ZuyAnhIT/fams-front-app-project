import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { ToastProvider } from "@/components/ui/toast";
import { setupAuthInterceptors } from "@/features/auth/api-interceptors";
import { useAuthStore } from "@/features/auth/store";
import { useCheckinStore } from "@/features/checkin/store/checkin.store";

/** Shared QueryClient instance – lives for the lifetime of the app */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
});

/**
 * Initialises auth on mount:
 * 1. Hydrates tokens from SecureStore so the app knows if the session is live.
 * 2. Attaches axios interceptors for transparent token refresh.
 *
 * Must be rendered *inside* QueryClientProvider because interceptors trigger
 * router navigation, which requires the navigator to be ready.
 */
function AppInit() {
  const hydrateFromSecureStore = useAuthStore((s) => s.hydrateFromSecureStore);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    void hydrateFromSecureStore();
    const ejectInterceptors = setupAuthInterceptors(
      async () => {
        await clearAuth();
        useCheckinStore.getState().resetContext();
        queryClient.clear();
        router.replace('/(auth)/login');
      },
      () => {
        useCheckinStore.getState().resetContext();
        queryClient.clear();
        router.replace('/(tabs)/home');
      },
    );

    return ejectInterceptors;
  }, [clearAuth, hydrateFromSecureStore]);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <StatusBar style="dark" />
        <AppInit />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="modal/checkin-result" options={{ presentation: 'modal' }} />
          <Stack.Screen name="modal/random-check-result" options={{ presentation: 'modal' }} />
        </Stack>
      </ToastProvider>
    </QueryClientProvider>
  );
}
