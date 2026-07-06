import { useLocalSearchParams } from 'expo-router';

import { SiteDetail } from '@/features/site/components/SiteDetail';

export default function SiteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SiteDetail siteId={id} />;
}
