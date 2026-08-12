import NetInfo from '@react-native-community/netinfo';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useToast } from '@/components/ui/toast';

import {
  flushOfflineCheckins,
  getOfflineCheckinQueue,
  removeOfflineCheckin,
} from '../services/offline-checkin.service';
import type { OfflineCheckinQueueItem } from '../types/checkin.type';
import { useCheckinStore } from '../store/checkin.store';

export function useOfflineCheckinSync(
  userId: string | null | undefined,
  tenantId: string | null,
) {
  const { showToast } = useToast();
  const setOpenCheckin = useCheckinStore((state) => state.setOpenCheckin);
  const [items, setItems] = useState<OfflineCheckinQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const hasObservedNetwork = useRef(false);

  const refresh = useCallback(async () => {
    if (!userId || !tenantId) {
      setItems([]);
      return;
    }
    setItems(await getOfflineCheckinQueue(userId, tenantId));
  }, [tenantId, userId]);

  const syncNow = useCallback(
    async (announce = true) => {
      if (!userId || !tenantId || isSyncing) return;
      setIsSyncing(true);
      try {
        const summary = await flushOfflineCheckins(userId, tenantId);
        const acceptedOpenRecord = summary.acceptedRecords.at(-1);
        if (acceptedOpenRecord) {
          await setOpenCheckin({
            checkinId: acceptedOpenRecord.checkinRecordId,
            siteId: acceptedOpenRecord.item.siteId,
            siteName: acceptedOpenRecord.item.siteName,
            effectiveCheckinPolicy:
              acceptedOpenRecord.item.effectiveCheckinPolicy,
          });
        }
        await refresh();
        if (summary.accepted > 0) {
          showToast(
            `Đã đồng bộ ${summary.accepted} lượt chấm công offline.`,
            'success',
          );
        } else if (announce && summary.results.length === 0) {
          showToast('Không có lượt chấm công nào đang chờ đồng bộ.', 'info');
        }
        if (summary.needsAttention > 0) {
          showToast(
            `${summary.needsAttention} lượt offline cần bạn kiểm tra.`,
            'info',
          );
        }
      } catch {
        if (announce) {
          showToast('Chưa thể đồng bộ. Dữ liệu vẫn nằm trong vùng riêng của ứng dụng.', 'error');
        }
      } finally {
        setIsSyncing(false);
      }
    },
    [isSyncing, refresh, setOpenCheckin, showToast, tenantId, userId],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    let wasOffline = false;
    return NetInfo.addEventListener((state) => {
      const connected = state.isConnected === true && state.isInternetReachable !== false;
      setIsConnected(connected);
      if (connected && (wasOffline || !hasObservedNetwork.current)) {
        hasObservedNetwork.current = true;
        void syncNow(false);
      }
      wasOffline = !connected;
    });
  }, [syncNow]);

  const remove = useCallback(
    async (clientNonce: string) => {
      if (!userId || !tenantId) return;
      await removeOfflineCheckin(userId, tenantId, clientNonce);
      await refresh();
    },
    [refresh, tenantId, userId],
  );

  return {
    items,
    pendingCount: items.filter((item) => item.status === 'pending').length,
    isConnected,
    isSyncing,
    syncNow,
    remove,
    refresh,
  };
}
