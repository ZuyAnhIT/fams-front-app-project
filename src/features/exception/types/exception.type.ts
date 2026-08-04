export type ExceptionSourceType = 'checkin' | 'violation';

export interface MyExceptionItem {
  id: string;
  sourceType: ExceptionSourceType;
  reasonType: 'pending_review' | 'no_response' | 'location_fail' | 'face_fail' | 'liveness_fail' | string;
  date: string | null;
  description: string | null;
  explainEndpoint: string;
  hasExplanation: boolean;
  employeeNote: string | null;
  createdAt: string | null;
}

export interface SubmitExceptionExplanationRequest {
  note: string;
  photo?: { uri: string; name: string; type: string };
}

export interface ExceptionExplanationResponse {
  id: string;
  employeeNote: string;
  employeePhotoUrl: string | null;
  updatedAt: string;
}
