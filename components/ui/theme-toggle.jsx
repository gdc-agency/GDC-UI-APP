import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/theme-context';

/** @param {{ compact?: boolean; style?: import('react-native').ViewStyle }} props */
export function ThemeToggleRow({ compact = false, style }) {
  const { preference, isDark, setPreference, colors } = useTheme();

  const options = [
    { id: 'system', label: 'System', icon: 'theme-light-dark' },
    { id: 'light', label: 'Light', icon: 'white-balance-sunny' },
    { id: 'dark', label: 'Dark', icon: 'moon-waning-crescent' },
  ];

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact, style]}>
      {!compact ? <Text style={[styles.title, { color: colors.text }]}>Appearance</Text> : null}
      <View style={[styles.row, { backgroundColor: colors.surfaceMuted, borderColor: colors.borderLight }]}>
        {options.map((opt) => {
          const active = preference === opt.id;
          return (
            <Pressable
              key={opt.id}
              style={[
                styles.chip,
                active && { backgroundColor: colors.card, borderColor: colors.primaryMid },
              ]}
              onPress={() => setPreference(opt.id)}>
              <MaterialCommunityIcons
                name={opt.icon}
                size={16}
                color={active ? colors.primaryMid : colors.textMuted}
              />
              <Text style={[styles.chipText, { color: active ? colors.primaryMid : colors.textMuted }]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {!compact ? (
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Currently using {isDark ? 'dark' : 'light'} theme
          {preference === 'system' ? ' (system)' : ''}.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  wrapCompact: { gap: 8 },
  title: { fontSize: 15, fontWeight: '800' },
  row: {
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    padding: 6,
  },
  chip: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    flexDirection: 'row',
  },
  chipText: { fontSize: 12, fontWeight: '700' },
  hint: { fontSize: 12, fontWeight: '600' },
});
