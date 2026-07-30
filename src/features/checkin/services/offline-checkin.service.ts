import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system/legacy';

import type {
  CheckinPolicy,
  OfflineCheckinQueueItem,
  OfflineCheckinRequest,
  OfflineSyncResultItem,
} from '../types/checkin.type';
import { syncOfflineCheckins } from './checkin.service';

const QUEUE_PREFIX = '@fams_offline_checkins';
const EVIDENCE_DIRECTORY = `${FileSystem.documentDirectory ?? ''}offline-checkin-evidence`;

function queueKey(userId: string, tenantId: string): string {
  return `${QUEUE_PREFIX}:${encodeURIComponent(userId)}:${encodeURIComponent(tenantId)}`;
}

async function readQueue(
  userId: string,
  tenantId: string,
): Promise<OfflineCheckinQueueItem[]> {
  const stored = await AsyncStorage.getItem(queueKey(userId, tenantId));
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored) as OfflineCheckinQueueItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(
  userId: string,
  tenantId: string,
  items: OfflineCheckinQueueItem[],
): Promise<void> {
  await AsyncStorage.setItem(queueKey(userId, tenantId), JSON.stringify(items));
}

async function persistFaceEvidence(
  clientNonce: string,
  photoBase64: string | undefined,
): Promise<string | undefined> {
  if (!photoBase64) return undefined;
  await FileSystem.makeDirectoryAsync(EVIDENCE_DIRECTORY, { intermediates: true });
  const uri = `${EVIDENCE_DIRECTORY}/${clientNonce}.b64`;
  await FileSystem.writeAsStringAsync(uri, photoBase64, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return uri;
}

async function deleteFaceEvidence(uri: string | undefined): Promise<void> {
  if (!uri) return;
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
}

async function readFaceEvidence(uri: string | undefined): Promise<string | undefined> {
  if (!uri) return undefined;
  try {
    return await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  } catch {
    return undefined;
  }
}

export interface EnqueueOfflineCheckinInput {
  tenantId: string;
  userId: string;
  assignmentId: string;
  siteId: string;
  siteName: string;
  effectiveCheckinPolicy: CheckinPolicy;
  checkinAt: string;
  lat: number;
  lon: number;
  accuracy?: number;
  facePhotoBase64?: string;
}

export async function enqueueOfflineCheckin(
  input: EnqueueOfflineCheckinInput,
): Promise<OfflineCheckinQueueItem> {
  const clientNonce = Crypto.randomUUID();
  const faceEvidenceFileUri = await persistFaceEvidence(
    clientNonce,
    input.facePhotoBase64,
  );
  const item: OfflineCheckinQueueItem = {
    clientNonce,
    tenantId: input.tenantId,
    userId: input.userId,
    assignmentId: input.assignmentId,
    siteId: input.siteId,
    siteName: input.siteName,
    effectiveCheckinPolicy: input.effectiveCheckinPolicy,
    checkinAt: input.checkinAt,
    lat: input.lat,
    lon: input.lon,
    accuracy: input.accuracy,
    faceEvidenceFileUri,
    status: 'pending',
    reason: null,
    attempts: 0,
  };

  const queue = await readQueue(input.userId, input.tenantId);
  await writeQueue(input.userId, input.tenantId, [...queue, item]);
  return item;
}

export async function getOfflineCheckinQueue(
  userId: string,
  tenantId: string,
): Promise<OfflineCheckinQueueItem[]> {
  return readQueue(userId, tenantId);
}

export async function removeOfflineCheckin(
  userId: string,
  tenantId: string,
  clientNonce: string,
): Promise<void> {
  const queue = await readQueue(userId, tenantId);
  const removed = queue.find((item) => item.clientNonce === clientNonce);
  await deleteFaceEvidence(removed?.faceEvidenceFileUri);
  await writeQueue(
    userId,
    tenantId,
    queue.filter((item) => item.clientNonce !== clientNonce),
  );
}

export interface OfflineSyncSummary {
  results: OfflineSyncResultItem[];
  accepted: number;
  needsAttention: number;
  acceptedRecords: {
    item: OfflineCheckinQueueItem;
    checkinRecordId: string;
  }[];
}

/**
 * Only pending items are retried automatically. Rejected/conflict items stay
 * visible until the employee reviews and removes them.
 */
export async function flushOfflineCheckins(
  userId: string,
  tenantId: string,
): Promise<OfflineSyncSummary> {
  const queue = await readQueue(userId, tenantId);
  const pending = queue.filter((item) => item.status === 'pending');
  if (pending.length === 0) {
    return {
      results: [],
      accepted: 0,
      needsAttention: queue.filter((item) => item.status !== 'pending').length,
      acceptedRecords: [],
    };
  }

  const payload: OfflineCheckinRequest[] = await Promise.all(
    pending.map(async (item) => ({
      assignmentId: item.assignmentId,
      checkinAt: item.checkinAt,
      lat: item.lat,
      lon: item.lon,
      accuracy: item.accuracy,
      facePhotoBase64: await readFaceEvidence(item.faceEvidenceFileUri),
      clientNonce: item.clientNonce,
    })),
  );
  const results = await syncOfflineCheckins(tenantId, payload);
  const byNonce = new Map(results.map((result) => [result.clientNonce, result]));
  const nextQueue: OfflineCheckinQueueItem[] = [];
  const acceptedRecords: OfflineSyncSummary['acceptedRecords'] = [];
  let accepted = 0;

  for (const item of queue) {
    const result = byNonce.get(item.clientNonce);
    if (!result) {
      nextQueue.push(item);
      continue;
    }
    if (result.status === 'accepted') {
      accepted += 1;
      if (result.checkinRecordId) {
        acceptedRecords.push({ item, checkinRecordId: result.checkinRecordId });
      }
      await deleteFaceEvidence(item.faceEvidenceFileUri);
      continue;
    }
    nextQueue.push({
      ...item,
      status: result.status,
      reason: result.reason,
      attempts: item.attempts + 1,
    });
  }

  await writeQueue(userId, tenantId, nextQueue);
  return {
    results,
    accepted,
    needsAttention: nextQueue.filter((item) => item.status !== 'pending').length,
    acceptedRecords,
  };
}
