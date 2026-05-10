import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';

export default function DashboardRootLayout() {
  const { user, hydrated } = useAuth();

  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: BrandColors.pageBg }}>
        <ActivityIndicator size="large" color={BrandColors.primaryMid} />
      </View>
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
      <Stack.Screen name="module/[id]" />
    </Stack>
  );
}
