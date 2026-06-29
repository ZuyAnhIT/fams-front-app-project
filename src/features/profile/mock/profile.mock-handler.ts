import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import type {
  DeleteFaceResponse,
  FaceImagePayload,
  FaceStatusResponse,
  RegisterFaceRequest,
  RegisterFaceResponse,
  SaveConsentRequest,
  SaveConsentResponse,
  TenantInvitation,
} from '../types';
import { checkFaceImageQuality } from '../utils/face-quality';
import {
  DEFAULT_FACE_STATUS,
  FACE_CONSENT_VERSION,
  MOCK_PENDING_INVITATIONS,
} from './mock-data';

type MockResult =
  | { response: AxiosResponse; error?: never }
  | { error: AxiosError; response?: never };

let faceStatus: FaceStatusResponse = { ...DEFAULT_FACE_STATUS };
let invitations: TenantInvitation[] = [...MOCK_PENDING_INVITATIONS];

const MOCK_DELAY_MS = 350;

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePath(url: string | undefined): string {
  if (!url) return '';
  return url
    .replace(/^https?:\/\/[^/]+/, '')
    .replace(/^\/api\/v1/, '')
    .replace(/^\/api/, '')
    .split('?')[0]
    .replace(/\/$/, '');
}

function ok<T>(config: InternalAxiosRequestConfig, data: T, status = 200): MockResult {
  return {
    response: { data: { success: true, message: 'OK', data }, status, statusText: 'OK', headers: {}, config },
  };
}

function fail(config: InternalAxiosRequestConfig, status: number, message: string): MockResult {
  const data = { message };
  const error = new AxiosError(message, String(status), config, undefined, {
    data,
    status,
    statusText: 'Error',
    headers: {},
    config,
  });
  return { error };
}

function validateImages(images: FaceImagePayload[]): { valid: boolean; score: number; message?: string } {
  if (!images?.length) {
    return { valid: false, score: 0, message: 'Cần ít nhất 3 ảnh khuôn mặt' };
  }
  if (images.length < 3 || images.length > 5) {
    return { valid: false, score: 0, message: 'Số ảnh phải từ 3 đến 5' };
  }

  let totalScore = 0;
  for (const img of images) {
    const q = checkFaceImageQuality(img);
    if (!q.isValid) {
      return { valid: false, score: q.score, message: q.issues[0] ?? 'Ảnh không đạt chất lượng' };
    }
    totalScore += q.score;
  }

  return { valid: true, score: totalScore / images.length };
}

export async function handleProfileMockRequest(
  config: InternalAxiosRequestConfig,
): Promise<MockResult | null> {
  const method = (config.method ?? 'get').toLowerCase();
  const path = normalizePath(config.url);

  if (!path.startsWith('/profile')) return null;

  await delay();

  // ─── Face status ────────────────────────────────────────────────────────────
  if (method === 'get' && path === '/profile/face/status') {
    return ok(config, faceStatus);
  }

  // ─── Consent ────────────────────────────────────────────────────────────────
  if (method === 'post' && path === '/profile/face/consent') {
    const body = (config.data ? JSON.parse(config.data as string) : {}) as SaveConsentRequest;

    if (!body.accepted) {
      return fail(config, 400, 'Bạn cần đồng ý điều khoản để sử dụng Face ID');
    }

    const now = new Date().toISOString();
    faceStatus = {
      ...faceStatus,
      status: faceStatus.status === 'registered' ? 'registered' : 'consent_pending',
      consent_given: true,
      consent_version: body.consent_version ?? FACE_CONSENT_VERSION,
      consent_at: now,
      last_updated_at: now,
    };

    const response: SaveConsentResponse = {
      consent_given: true,
      consent_at: now,
      consent_version: faceStatus.consent_version!,
    };
    return ok(config, response);
  }

  // ─── Register face ──────────────────────────────────────────────────────────
  if (method === 'post' && path === '/profile/face/register') {
    if (!faceStatus.consent_given) {
      return fail(config, 403, 'Chưa ghi nhận đồng ý Face ID');
    }

    const body = (config.data ? JSON.parse(config.data as string) : {}) as RegisterFaceRequest;
    const validation = validateImages(body.images);

    if (!validation.valid) {
      return fail(config, 422, validation.message ?? 'Ảnh không hợp lệ');
    }

    const now = new Date().toISOString();
    faceStatus = {
      status: 'registered',
      consent_given: true,
      consent_version: faceStatus.consent_version ?? FACE_CONSENT_VERSION,
      consent_at: faceStatus.consent_at,
      registered_at: now,
      photo_count: body.images.length,
      quality_score: validation.score,
      last_updated_at: now,
    };

    const response: RegisterFaceResponse = {
      status: 'registered',
      photo_count: body.images.length,
      quality_score: validation.score,
      registered_at: now,
    };
    return ok(config, response);
  }

  // ─── Delete face ────────────────────────────────────────────────────────────
  if (method === 'delete' && path === '/profile/face') {
    const now = new Date().toISOString();
    faceStatus = {
      ...DEFAULT_FACE_STATUS,
      status: 'revoked',
      consent_given: false,
      last_updated_at: now,
    };

    const response: DeleteFaceResponse = {
      status: 'revoked',
      deleted_at: now,
    };
    return ok(config, response);
  }

  // ─── Invitations ────────────────────────────────────────────────────────────
  if (method === 'get' && path === '/profile/invitations/pending') {
    const pending = invitations.filter((i) => i.status === 'pending');
    return ok(config, pending);
  }

  const acceptMatch = path.match(/^\/profile\/invitations\/([^/]+)\/accept$/);
  if (method === 'post' && acceptMatch) {
    const id = acceptMatch[1];
    const idx = invitations.findIndex((i) => i.id === id);
    if (idx === -1) return fail(config, 404, 'Không tìm thấy lời mời');

    const updated: TenantInvitation = {
      ...invitations[idx],
      status: 'accepted',
    };
    invitations[idx] = updated;

    return ok(config, {
      invitation: updated,
      message: `Đã tham gia ${updated.tenant_name}`,
    });
  }

  const declineMatch = path.match(/^\/profile\/invitations\/([^/]+)\/decline$/);
  if (method === 'post' && declineMatch) {
    const id = declineMatch[1];
    const idx = invitations.findIndex((i) => i.id === id);
    if (idx === -1) return fail(config, 404, 'Không tìm thấy lời mời');

    const updated: TenantInvitation = {
      ...invitations[idx],
      status: 'declined',
    };
    invitations[idx] = updated;
    return ok(config, updated);
  }

  return fail(config, 404, `[Mock Profile] Route chưa mock: ${method.toUpperCase()} ${path}`);
}

/** Reset mock state — hữu ích khi dev/test */
export function resetProfileMockState(): void {
  faceStatus = { ...DEFAULT_FACE_STATUS };
  invitations = [...MOCK_PENDING_INVITATIONS];
}
