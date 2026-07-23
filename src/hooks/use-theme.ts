import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Returns a stable light/dark palette; React Native may report null initially. */
export function useTheme() {
  const scheme = useColorScheme();
  return Colors[scheme ?? 'light'];
}
