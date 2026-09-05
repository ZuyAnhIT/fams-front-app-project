import type { CheckinHistoryParams } from '../types/checkin.type';

export const checkinKeys = {
  all: ['checkin'] as const,
  availableSites: (tenantId: string) => [...checkinKeys.all, 'available-sites', tenantId] as const,
  openSession: (tenantId: string) => [...checkinKeys.all, 'open-session', tenantId] as const,
  results: () => [...checkinKeys.all, 'result'] as const,
  result: (tenantId: string, checkinId: string) =>
    [...checkinKeys.results(), tenantId, checkinId] as const,
  history: (tenantId: string, params: CheckinHistoryParams) =>
    [...checkinKeys.all, 'history', tenantId, params] as const,
};
