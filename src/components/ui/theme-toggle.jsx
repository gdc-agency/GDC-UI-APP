import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/context/theme-context';
import { cn } from '@/theme/cn';

/** @param {{ style?: import('react-native').ViewStyle }} props */
export function ThemeToggleButton({ style }) {
  const { isDark, toggleTheme, colors } = useTheme();

  return (
    <Pressable
      className="h-9 w-9 items-center justify-center rounded-[10px] bg-info-bg"
      style={style}
      onPress={toggleTheme}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <MaterialCommunityIcons
        name={isDark ? 'white-balance-sunny' : 'moon-waning-crescent'}
        size={20}
        color={isDark ? '#FFFFFF' : colors.primaryMid}
      />
    </Pressable>
  );
}

/** @param {{ compact?: boolean; style?: import('react-native').ViewStyle }} props */
export function ThemeToggleRow({ compact = false, style }) {
  const { preference, isDark, setPreference, colors } = useTheme();

  const options = [
    { id: 'system', label: 'System', icon: 'theme-light-dark' },
    { id: 'light', label: 'Light', icon: 'white-balance-sunny' },
    { id: 'dark', label: 'Dark', icon: 'moon-waning-crescent' },
  ];

  return (
    <View className={cn(compact ? 'gap-2' : 'gap-2.5')} style={style}>
      {!compact ? <Text className="text-[15px] font-extrabold" style={{ color: colors.text }}>Appearance</Text> : null}
      <View className="flex-row gap-2 rounded-[14px] border border-border-light bg-surface-muted p-1.5">
        {options.map((opt) => {
          const active = preference === opt.id;
          return (
            <Pressable
              key={opt.id}
              className={cn(
                'min-h-[42px] flex-1 flex-row items-center justify-center gap-1 rounded-[10px] border',
                active ? 'border-primary-mid bg-card' : 'border-transparent',
              )}
              onPress={() => setPreference(opt.id)}>
              <MaterialCommunityIcons
                name={opt.icon}
                size={16}
                color={active ? colors.primaryMid : colors.textMuted}
              />
              <Text
                className="text-xs font-bold"
                style={{ color: active ? colors.primaryMid : colors.textMuted }}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {!compact ? (
        <Text className="text-xs font-semibold" style={{ color: colors.textMuted }}>
          Currently using {isDark ? 'dark' : 'light'} theme
          {preference === 'system' ? ' (system)' : ''}.
        </Text>
      ) : null}
    </View>
  );
}
