import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useTheme } from '@/context/theme-context';
import { cn } from '@/theme/cn';

/**
 * Pill CTA with trailing arrow — matches auth mockup.
 * @param {{ label: string; onPress: () => void; loading?: boolean; disabled?: boolean; variant?: 'primary' | 'outline' }} props
 */
export function AuthPrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}) {
  const { colors, isDark } = useTheme();
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      className={cn(
        'min-h-[54px] w-full max-w-[360px] flex-row items-center justify-between rounded-full px-5 py-3.5',
        isPrimary ? 'bg-primary-mid' : 'border border-border-strong bg-card',
        (loading || disabled) && 'opacity-75',
      )}
      style={
        isPrimary
          ? {
              shadowColor: colors.primaryMid,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.28,
              shadowRadius: 12,
              elevation: 6,
            }
          : undefined
      }
      onPress={onPress}
      disabled={loading || disabled}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <View className="flex-1 items-center pl-8">
        {loading ? (
          <ActivityIndicator color={isPrimary ? '#fff' : colors.primaryMid} />
        ) : (
          <Text
            className="text-[17px] font-bold"
            style={{ color: isPrimary ? '#FFFFFF' : isDark ? colors.text : colors.text }}>
            {label}
          </Text>
        )}
      </View>
      {isPrimary && !loading ? (
        <View className="h-9 w-9 items-center justify-center rounded-full bg-white/20">
          <MaterialCommunityIcons name="arrow-right" size={20} color="#FFFFFF" />
        </View>
      ) : (
        <View className="w-9" />
      )}
    </Pressable>
  );
}
