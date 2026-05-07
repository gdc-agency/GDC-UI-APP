import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/context/auth-context';

export default function DashboardRootLayout() {
  const { user } = useAuth();

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
