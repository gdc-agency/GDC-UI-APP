import '../global.css';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

SplashScreen.preventAutoHideAsync().catch(() => {});
import 'react-native-reanimated';
import { useEffect } from 'react';
import { View } from 'react-native';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import {
  getApiBaseUrl,
  getApiMode,
  getAttendanceApiBaseUrl,
  getChatApiBaseUrl,
  getTaskApiBaseUrl,
} from '@/data/constants/api-config';
import { AuthProvider } from '../src/context/auth-context';
import { ThemeProvider, useTheme } from '../src/context/theme-context';

function RootShell() {
  const { colors, isDark } = useTheme();
  const navigationTheme = isDark ? DarkTheme : DefaultTheme;

  return (
    <NavigationThemeProvider
      value={{
        ...navigationTheme,
        colors: {
          ...navigationTheme.colors,
          background: colors.pageBg,
          card: colors.card,
          text: colors.text,
          border: colors.border,
          primary: colors.primaryMid,
        },
      }}>
      <View className="flex-1 bg-page">
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.pageBg } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="dashboard" />
        </Stack>
        <StatusBar style={colors.statusBarStyle === 'light' ? 'light' : 'dark'} />
      </View>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  useEffect(() => {
    if (typeof __DEV__ === 'undefined' || !__DEV__) return;
    console.log('[GDC] API mode:', getApiMode());
    console.log('[GDC] Auth:', getApiBaseUrl());
    console.log('[GDC] Task:', getTaskApiBaseUrl());
    console.log('[GDC] Chat:', getChatApiBaseUrl());
    console.log('[GDC] Attendance:', getAttendanceApiBaseUrl());
  }, []);

  return (
    <SafeAreaProvider>
      <KeyboardProvider preload={false} preserveEdgeToEdge>
        <ThemeProvider>
          <AuthProvider>
            <RootShell />
          </AuthProvider>
        </ThemeProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}
