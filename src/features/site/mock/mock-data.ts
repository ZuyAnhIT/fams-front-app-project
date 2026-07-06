import type { Assignment, Geofence, Shift, Site, SiteDetailResponse } from '../types/Site';

const MOCK_TENANT_ID = 'tenant-001';

export const MOCK_SITES: Site[] = [
  {
    id: 'site-001',
    tenantId: MOCK_TENANT_ID,
    name: 'Hanoi Tower Project',
    code: 'HN-001',
    description: 'Công trình trung tâm Hà Nội',
    address: '12 Nguyễn Huệ, Ba Đình, Hà Nội',
    latitude: 21.0285,
    longitude: 105.8542,
    timezone: 'Asia/Ho_Chi_Minh',
    status: 'active',
    createdBy: 'user-001',
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'site-002',
    tenantId: MOCK_TENANT_ID,
    name: 'Thu Duc Warehouse',
    code: 'HCM-002',
    description: null,
    address: '45 Võ Văn Ngân, Thủ Đức',
    latitude: 10.8494464,
    longitude: 106.7717237,
    timezone: 'Asia/Ho_Chi_Minh',
    status: 'inactive',
    createdBy: 'user-001',
    createdAt: '2025-11-01T00:00:00Z',
    updatedAt: '2025-11-01T00:00:00Z',
  },
  {
    id: 'site-003',
    tenantId: MOCK_TENANT_ID,
    name: 'Cau Giay Office',
    code: 'HN-003',
    description: null,
    address: '88 Xuân Thủy, Cầu Giấy, Hà Nội',
    latitude: 21.0369784,
    longitude: 105.7827925,
    timezone: 'Asia/Ho_Chi_Minh',
    status: 'inactive',
    createdBy: 'user-001',
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2025-12-31T00:00:00Z',
  },
];

const MOCK_GEOFENCES: Record<string, Geofence | null> = {
  'site-001': {
    id: 'geo-001',
    siteId: 'site-001',
    tenantId: MOCK_TENANT_ID,
    coordinates: [
      [105.854, 21.028],
      [105.8545, 21.028],
      [105.8545, 21.029],
      [105.854, 21.029],
      [105.854, 21.028],
    ],
    bufferMeters: 25,
    status: 'active',
    createdBy: 'user-001',
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
  },
  'site-002': null,
  'site-003': null,
};

const MOCK_SHIFTS: Record<string, Shift[]> = {
  'site-001': [
    {
      id: 'shift-001',
      siteId: 'site-001',
      tenantId: MOCK_TENANT_ID,
      name: 'Morning Shift',
      startTime: '08:00',
      endTime: '17:00',
      allowOvernight: false,
      allowOvertime: true,
      earlyCheckinMinutes: 15,
      lateCheckoutMinutes: 30,
      status: 'active',
      createdBy: 'user-001',
      createdAt: '2026-01-15T00:00:00Z',
      updatedAt: '2026-01-15T00:00:00Z',
    },
  ],
  'site-002': [],
  'site-003': [],
};

const MOCK_ACTIVE_ASSIGNMENT_COUNTS: Record<string, number> = {
  'site-001': 12,
  'site-002': 3,
  'site-003': 0,
};

export const MOCK_ASSIGNMENTS: Record<string, Assignment[]> = {
  'site-001': [
    {
      id: 'asg-101',
      tenantId: MOCK_TENANT_ID,
      siteId: 'site-001',
      employeeId: 'employee-201',
      shiftId: 'shift-001',
      startDate: '2026-01-15',
      endDate: null,
      role: 'supervisor',
      status: 'active',
      notes: null,
      createdBy: 'user-001',
      createdAt: '2026-01-15T00:00:00Z',
      updatedAt: '2026-01-15T00:00:00Z',
    },
  ],
  'site-002': [],
  'site-003': [],
};

export function buildMockSiteDetail(id: string): SiteDetailResponse | null {
  const site = MOCK_SITES.find((s) => s.id === id);
  if (!site) return null;

  return {
    ...site,
    geofence: MOCK_GEOFENCES[id] ?? null,
    shifts: MOCK_SHIFTS[id] ?? [],
    activeAssignmentCount: MOCK_ACTIVE_ASSIGNMENT_COUNTS[id] ?? 0,
  };
}
