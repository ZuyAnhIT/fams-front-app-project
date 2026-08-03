import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef } from "react";

import { ToastProvider, useToast } from "@/components/ui/toast";
import { setupAuthInterceptors } from "@/features/auth/api-interceptors";
import { resolveAuthenticatedSession } from "@/features/auth/session";
import { useAuthStore } from "@/features/auth/store";
import { useCheckinStore } from "@/features/checkin/store/checkin.store";
import {
  getRandomCheckIdFromPush,
  isRandomCheckPush,
  registerCurrentPushDevice,
  subscribeToForegroundPush,
  subscribeToNotificationOpen,
  subscribeToPushTokenRefresh,
} from "@/features/notification/services/push-notification.service";

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
 * 1. Restores token candidates from SecureStore.
 * 2. Verifies the restored session through /auth/me before unlocking the app.
 * 3. Attaches axios interceptors for transparent token refresh.
 *
 * Must be rendered *inside* QueryClientProvider because interceptors trigger
 * router navigation, which requires the navigator to be ready.
 */
function AppInit() {
  const hydrateFromSecureStore = useAuthStore((s) => s.hydrateFromSecureStore);
  const finishHydration = useAuthStore((s) => s.finishHydration);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const accessToken = useAuthStore((s) => s.accessToken);
  const { showToast } = useToast();
  const openedPushIds = useRef(new Set<string>());

  useEffect(() => {
    let disposed = false;
    const ejectInterceptors = setupAuthInterceptors(
      async () => {
        await clearAuth();
        useCheckinStore.getState().resetContext();
        queryClient.clear();
      },
      () => {
        useCheckinStore.getState().resetContext();
        queryClient.clear();
        router.replace('/(tabs)/home');
      },
    );

    void (async () => {
      await hydrateFromSecureStore();
      if (disposed) return;

      const restored = useAuthStore.getState();
      if (!restored.accessToken || !restored.refreshToken) return;

      try {
        const session = await resolveAuthenticatedSession(
          undefined,
          restored.activeTenantId ?? undefined,
        );
        if (disposed) return;
        useAuthStore.getState().setUser(session.user);
        finishHydration();
      } catch {
        if (disposed) return;
        await useAuthStore.getState().clearAuth();
        useCheckinStore.getState().resetContext();
        queryClient.clear();
      }
    })();

    return () => {
      disposed = true;
      ejectInterceptors();
    };
  }, [clearAuth, finishHydration, hydrateFromSecureStore]);

  useEffect(() => {
    if (isHydrating || !isAuthenticated || !accessToken) return;

    let disposed = false;
    let unsubscribeForeground: () => void = () => undefined;
    let unsubscribeOpen: () => void = () => undefined;
    let unsubscribeRefresh: () => void = () => undefined;

    void registerCurrentPushDevice().catch(() => {
      // Push is supplementary: polling and the in-app inbox remain available.
    });
    void subscribeToPushTokenRefresh().then((unsubscribe) => {
      if (disposed) unsubscribe();
      else unsubscribeRefresh = unsubscribe;
    });
    void subscribeToForegroundPush((message) => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (isRandomCheckPush(message)) {
        void queryClient.invalidateQueries({ queryKey: ['random-check'] });
        showToast('Có yêu cầu kiểm tra ngẫu nhiên mới', 'info');
      }
    }).then((unsubscribe) => {
      if (disposed) unsubscribe();
      else unsubscribeForeground = unsubscribe;
    });
    void subscribeToNotificationOpen((message) => {
      if (message.messageId && openedPushIds.current.has(message.messageId)) return;
      if (message.messageId) openedPushIds.current.add(message.messageId);
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (isRandomCheckPush(message)) {
        void queryClient.invalidateQueries({ queryKey: ['random-check'] });
        const checkId = getRandomCheckIdFromPush(message);
        if (checkId) {
          router.push({
            pathname: '/(tabs)/random-check',
            params: { checkId },
          });
        } else {
          router.push('/(tabs)/random-check');
        }
      }
    }).then((unsubscribe) => {
      if (disposed) unsubscribe();
      else unsubscribeOpen = unsubscribe;
    });

    return () => {
      disposed = true;
      unsubscribeForeground();
      unsubscribeOpen();
      unsubscribeRefresh();
    };
  }, [accessToken, isAuthenticated, isHydrating, showToast]);

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
