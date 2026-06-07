import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SystemUI from 'expo-system-ui';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { createAvailabilityStyles } from '@/theme/module-styles/availability-styles';
import { createRouteDetailStyles } from '@/theme/module-styles/route-detail-styles';
import { createRequestStyles } from '@/theme/module-styles/request-styles';
import { createTimesheetStyles } from '@/theme/module-styles/timesheet-styles';
import { createTlStyles } from '@/theme/module-styles/timesheet-tl-styles';
import { buildThemeVars } from '@/theme/nativewind-vars';
import { getChatTheme } from '@/data/constants/chat-theme';
import { getAvColors, getRqColors, getTlColors, getTsColors } from '@/data/constants/themed-palettes';
import { darkTheme, getThemeColors, lightTheme } from '@/data/constants/themes';

const STORAGE_THEME_MODE = 'gdc_theme_mode';

/** @typedef {'system' | 'light' | 'dark'} ThemePreference */

const ThemeContext = createContext(null);

/** @param {ThemePreference} preference @param {'light' | 'dark' | null | undefined} systemScheme */
export function resolveThemeMode(preference, systemScheme) {
  if (preference === 'light' || preference === 'dark') return preference;
  return systemScheme === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState(/** @type {ThemePreference} */ ('system'));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_THEME_MODE);
        if (!cancelled && (saved === 'system' || saved === 'light' || saved === 'dark')) {
          setPreferenceState(saved);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const mode = resolveThemeMode(preference, systemScheme);
  const isDark = mode === 'dark';
  const colors = useMemo(() => getThemeColors(mode), [mode]);
  const chatTheme = useMemo(() => getChatTheme(isDark), [isDark]);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.pageBg).catch(() => {});
  }, [colors.pageBg]);

  const moduleStyles = useMemo(() => {
    const tsColors = getTsColors(colors);
    const rqColors = getRqColors(colors);
    const avColors = getAvColors(colors);
    const tlColors = getTlColors(colors);
    return {
      routeDetail: createRouteDetailStyles(colors),
      timesheet: { styles: createTimesheetStyles(colors), colors: tsColors },
      request: { styles: createRequestStyles(colors), colors: rqColors },
      availability: { styles: createAvailabilityStyles(colors), colors: avColors },
      timesheetTl: { styles: createTlStyles(colors), colors: tlColors },
    };
  }, [colors]);

  const setPreference = useCallback(async (next) => {
    setPreferenceState(next);
    try {
      await AsyncStorage.setItem(STORAGE_THEME_MODE, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const next = isDark ? 'light' : 'dark';
    void setPreference(next);
  }, [isDark, setPreference]);

  const value = useMemo(
    () => ({
      preference,
      mode,
      isDark,
      hydrated,
      colors,
      chatTheme,
      moduleStyles,
      setPreference,
      toggleTheme,
      lightTheme,
      darkTheme,
    }),
    [preference, mode, isDark, hydrated, colors, chatTheme, moduleStyles, setPreference, toggleTheme],
  );

  const themeVars = useMemo(() => buildThemeVars(colors, chatTheme), [colors, chatTheme]);

  return (
    <ThemeContext.Provider value={value}>
      <View key={mode} style={themeVars} className="flex-1 bg-page">
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

/** Safe fallback for modules imported before provider wiring (should not happen in app). */
export function useThemeOptional() {
  return useContext(ThemeContext);
}
