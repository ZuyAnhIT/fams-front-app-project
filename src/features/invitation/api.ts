import { mapLoginResponse } from '@/features/auth/api-mappers';
import type { LoginResponse } from '@/features/auth/types';
import { apiClient } from '@/services/api-client';
import { unwrapApiData } from '@/services/api-response';

import type {
  AcceptInvitationRequest,
  InvitationType,
  InvitationValidation,
} from './types';

interface BackendLoginResponse {
  userId?: string;
  activeTenantId?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  totpRequired?: boolean;
  pendingToken?: string;
}

function endpoints(type: InvitationType) {
  return type === 'platform'
    ? {
        validate: '/platform-invitations/validate',
        accept: '/platform-invitations/accept',
      }
    : {
        validate: '/invitations/validate',
        accept: '/invitations/accept',
      };
}

export async function validateInvitation(
  token: string,
  type: InvitationType,
): Promise<InvitationValidation> {
  const { data } = await apiClient.get(endpoints(type).validate, {
    params: { token },
  });
  return unwrapApiData<InvitationValidation>(data);
}

export async function acceptInvitation(
  request: AcceptInvitationRequest,
  type: InvitationType,
): Promise<LoginResponse> {
  const { data } = await apiClient.post(endpoints(type).accept, request);
  return mapLoginResponse(unwrapApiData<BackendLoginResponse>(data));
}
