export type InvitationType = 'tenant' | 'platform';

export interface InvitationValidation {
  email: string;
  phone?: string;
  isExistingUser?: boolean;
  existingUser?: boolean;
  isExistingPhoneUser?: boolean;
  tenantName?: string;
}

export interface AcceptInvitationRequest {
  token: string;
  password?: string;
  displayName?: string;
  deviceId?: string;
  existingPhone?: string;
  existingPassword?: string;
}
