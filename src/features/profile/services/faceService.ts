import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';

import type {
  DeleteFaceResponse,
  FaceImagePayload,
  FaceStatusResponse,
  RegisterFaceResponse,
  SaveConsentRequest,
  SaveConsentResponse,
} from '../types/Profile';
import { FACE_CONSENT_VERSION } from '../utils/face-quality';

const STORAGE_KEY = '@fams_mock_face_registration';
const MOCK_DELAY_MS = 800;

// In-memory fallback in case AsyncStorage native module is null (e.g., during web or some simulator environments)
let inMemoryStore: string | null = null;

async function getStoredValue(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch (error) {
    // Silent fallback to avoid flooding logs with warnings, but keep debug log
    console.debug('[Mock FaceService] Fallback to Memory Store:', error);
    return inMemoryStore;
  }
}

async function setStoredValue(value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, value);
  } catch (error) {
    console.debug('[Mock FaceService] Fallback to Memory Store (Write):', error);
    inMemoryStore = value;
  }
}

async function removeStoredValue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.debug('[Mock FaceService] Fallback to Memory Store (Remove):', error);
    inMemoryStore = null;
  }
}

function delay(ms = MOCK_DELAY_MS): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface MockStoredData {
  status: 'pending' | 'success' | 'failed';
  consent_given: boolean;
  consent_version?: string;
  consent_at?: string;
  registered_at?: string;
  images: FaceImagePayload[];
  quality_score: number;
  device_info: {
    brand: string | null;
    modelName: string | null;
    osName: string | null;
    osVersion: string | null;
  };
}

/**
 * Lấy trạng thái đăng ký Face ID từ mock AsyncStorage.
 */
export async function getFaceStatus(): Promise<FaceStatusResponse> {
  await delay(300);
  try {
    const raw = await getStoredValue();
    if (!raw) {
      return {
        status: 'not_registered',
        consent_given: false,
        photo_count: 0,
      };
    }

    const parsed = JSON.parse(raw) as MockStoredData;
    
    // Map status 'success' | 'pending' | 'failed' to FaceEnrollmentStatus
    let statusMapped: FaceStatusResponse['status'] = 'not_registered';
    if (parsed.status === 'success') {
      statusMapped = 'registered';
    } else if (parsed.status === 'pending') {
      statusMapped = 'consent_pending';
    }

    return {
      status: statusMapped,
      consent_given: parsed.consent_given,
      consent_version: parsed.consent_version,
      consent_at: parsed.consent_at,
      registered_at: parsed.registered_at,
      photo_count: parsed.images.length,
      quality_score: parsed.quality_score,
      last_updated_at: parsed.registered_at || parsed.consent_at,
    };
  } catch (error) {
    console.error('[Mock FaceService] Error getting face status:', error);
    return {
      status: 'not_registered',
      consent_given: false,
      photo_count: 0,
    };
  }
}

/**
 * Lưu đồng ý điều khoản Face ID.
 */
export async function saveConsent(body: SaveConsentRequest): Promise<SaveConsentResponse> {
  await delay(400);
  const now = new Date().toISOString();
  
  try {
    const raw = await getStoredValue();
    let currentData: MockStoredData = {
      status: 'pending',
      consent_given: body.accepted,
      consent_version: body.consent_version,
      consent_at: now,
      images: [],
      quality_score: 0,
      device_info: {
        brand: Device.brand,
        modelName: Device.modelName,
        osName: Device.osName,
        osVersion: Device.osVersion,
      },
    };

    if (raw) {
      const parsed = JSON.parse(raw) as MockStoredData;
      currentData = {
        ...parsed,
        consent_given: body.accepted,
        consent_version: body.consent_version,
        consent_at: now,
      };
    }

    await setStoredValue(JSON.stringify(currentData));

    return {
      consent_given: body.accepted,
      consent_at: now,
      consent_version: body.consent_version,
    };
  } catch (error) {
    console.error('[Mock FaceService] Error saving consent:', error);
    throw new Error('Không thể lưu thông tin đồng ý điều khoản.');
  }
}

/**
 * Đăng ký Face ID bằng cách lưu danh sách ảnh và metadata vào AsyncStorage.
 * Hỗ trợ từ 3-5 ảnh.
 */
export async function registerFace(images: FaceImagePayload[]): Promise<RegisterFaceResponse> {
  await delay(MOCK_DELAY_MS);
  
  if (!images || images.length < 3 || images.length > 5) {
    throw new Error('Yêu cầu gửi từ 3 đến 5 ảnh khuôn mặt để đăng ký.');
  }

  const now = new Date().toISOString();
  
  // Giả lập tính toán quality score trung bình
  const mockQualityScore = parseFloat((0.85 + Math.random() * 0.12).toFixed(2));

  try {
    const raw = await getStoredValue();
    const existing = raw ? (JSON.parse(raw) as MockStoredData) : null;

    const updatedData: MockStoredData = {
      status: 'success', // Success state
      consent_given: existing?.consent_given ?? true,
      consent_version: existing?.consent_version ?? FACE_CONSENT_VERSION,
      consent_at: existing?.consent_at ?? now,
      registered_at: now,
      images,
      quality_score: mockQualityScore,
      device_info: {
        brand: Device.brand,
        modelName: Device.modelName,
        osName: Device.osName,
        osVersion: Device.osVersion,
      },
    };

    await setStoredValue(JSON.stringify(updatedData));

    return {
      status: 'registered',
      photo_count: images.length,
      quality_score: mockQualityScore,
      registered_at: now,
    };
  } catch (error) {
    console.error('[Mock FaceService] Error registering face:', error);
    throw new Error('Đăng ký Face ID thất bại. Vui lòng thử lại.');
  }
}

/**
 * Xóa thông tin đăng ký Face ID từ AsyncStorage.
 */
export async function deleteFace(): Promise<DeleteFaceResponse> {
  await delay(500);
  const now = new Date().toISOString();
  try {
    await removeStoredValue();
    return {
      status: 'revoked',
      deleted_at: now,
    };
  } catch (error) {
    console.error('[Mock FaceService] Error deleting face:', error);
    throw new Error('Không thể thu hồi Face ID.');
  }
}

/**
 * Reset hoàn toàn dữ liệu mock (gọi khi ứng dụng khởi động lại).
 */
export async function clearMockFaceData(): Promise<void> {
  try {
    await removeStoredValue();
    console.info('[Mock FaceService] Mock Face ID registration data reset successfully.');
  } catch (error) {
    console.error('[Mock FaceService] Error resetting mock data:', error);
  }
}
