import { FaceLivenessCamera } from './FaceLivenessCamera';

interface FaceEnrollCameraProps {
  employeeId: string;
  onPassed: (challengeId: string) => void | Promise<void>;
  isRegistering?: boolean;
}

export function FaceEnrollCamera({
  employeeId,
  onPassed,
  isRegistering = false,
}: FaceEnrollCameraProps) {
  return (
    <FaceLivenessCamera
      employeeId={employeeId}
      purpose="enroll"
      onPassed={onPassed}
      isFinalizing={isRegistering}
    />
  );
}
