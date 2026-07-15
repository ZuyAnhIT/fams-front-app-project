import { useCallback, useState } from 'react';

import { getCurrentLocation } from '../services/gps.service';
import type { GpsCoordinates } from '../types/gps.type';

export interface UseGpsResult {
  isLocating: boolean;
  errorMessage: string | null;
  requestLocation: () => Promise<GpsCoordinates | null>;
}

/** Xin quyền vị trí (nếu chưa có) và lấy toạ độ hiện tại của thiết bị. */
export function useGps(): UseGpsResult {
  const [isLocating, setIsLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const requestLocation = useCallback(async (): Promise<GpsCoordinates | null> => {
    setIsLocating(true);
    setErrorMessage(null);
    try {
      const result = await getCurrentLocation();
      if (result.status === 'success') {
        return result.coords;
      }
      setErrorMessage(result.message);
      return null;
    } finally {
      setIsLocating(false);
    }
  }, []);

  return { isLocating, errorMessage, requestLocation };
}
