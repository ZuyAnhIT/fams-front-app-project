import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";

import { ToastProvider } from "@/components/ui/toast";
import { setupAuthInterceptors } from "@/features/auth/api-interceptors";
import { useAuthStore } from "@/features/auth/store";
import { setupMockApi } from "@/features/auth/mock/setup-mock-api";
import { clearMockFaceData } from "@/features/profile/services/faceService";

WebBrowser.maybeCompleteAuthSession();

// #region agent log
fetch("http://127.0.0.1:7569/ingest/cdcc833e-b1f1-4602-a45f-9f9830cbf8bc", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Debug-Session-Id": "03d2d2",
  },
  body: JSON.stringify({
    sessionId: "03d2d2",
    location: "app/_layout.tsx:boot",
    message: "JS bundle loaded — native modules OK",
    data: { platform: "android-simulator-check" },
    timestamp: Date.now(),
    hypothesisId: "A-verify",
    runId: "post-fix",
  }),
}).catch(() => {});
// #endregion

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
    setupMockApi();
    clearMockFaceData();
    hydrateFromSecureStore();
    setupAuthInterceptors(() => {
      clearAuth();
    });
    // Intentionally run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AppInit />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="modal/checkin-result" options={{ presentation: 'modal' }} />
          <Stack.Screen name="modal/random-check-result" options={{ presentation: 'modal' }} />
        </Stack>
      </ToastProvider>
    </QueryClientProvider>
  );
}
