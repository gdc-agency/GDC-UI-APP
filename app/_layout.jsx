import '../global.css';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

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
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <RootShell />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
