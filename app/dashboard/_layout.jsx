import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';

import { BrandColors } from '@/constants/brand';
import { SkeletonCardGrid, SkeletonGroup, SkeletonText } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth-context';

export default function DashboardRootLayout() {
  const { user, hydrated } = useAuth();

  if (!hydrated) {
    return (
      <SkeletonGroup speedMs={1700} delayMs={120}>
        <View style={{ flex: 1, backgroundColor: BrandColors.pageBg, paddingTop: 28, paddingHorizontal: 18 }}>
          <SkeletonText lines={2} widths={['52%', '34%']} lineH={14} />
          <View style={{ height: 14 }} />
          <SkeletonCardGrid cols={2} rows={2} />
          <View style={{ height: 14 }} />
          <SkeletonCardGrid cols={2} rows={2} />
        </View>
      </SkeletonGroup>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F2F4FC' },
      }}>
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
