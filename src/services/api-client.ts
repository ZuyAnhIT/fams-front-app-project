import { create } from 'axios';

import { API_BASE_URL } from '@/config/env';

export const apiClient = create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});
