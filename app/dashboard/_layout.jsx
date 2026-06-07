import { Redirect, Stack } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { SkeletonCardGrid, SkeletonGroup, SkeletonText } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth-context';
import { GdcInboxProvider } from '@/context/gdc-inbox-context';
import { useTheme } from '@/context/theme-context';

export default function DashboardRootLayout() {
  const { user, hydrated } = useAuth();
  const { colors } = useTheme();

  if (!hydrated) {
    return (
      <SkeletonGroup speedMs={1400} delayMs={0}>
        <View style={{ flex: 1, backgroundColor: colors.pageBg, paddingTop: 28, paddingHorizontal: 18 }}>
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
    <GdcInboxProvider>
      <PrefetchSecondaryScreens />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.pageBg },
        }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="group-info" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </GdcInboxProvider>
  );
}

function PrefetchSecondaryScreens() {
  useEffect(() => {
    void import('@/screens/dashboard/route-detail-screen');
    void import('@/screens/chat/group-info-screen');
  }, []);
  return null;
}
