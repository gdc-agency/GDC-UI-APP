import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import React, { useMemo } from 'react';
import { Text, View } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

import { PressableScale } from '@/theme/animations/PressableScale';
import { useTheme } from '@/context/theme-context';

function MiniSparkline({ color, seed = 1 }) {
  const points = useMemo(() => {
    const heights = [14, 11, 16, 9, 13, 8, 15, 10];
    return heights
      .map((h, i) => {
        const x = (i / (heights.length - 1)) * 48;
        const y = 18 - ((h + seed * 2) % 12);
        return `${x},${y}`;
      })
      .join(' ');
  }, [seed]);

  return (
    <Svg width={48} height={20} viewBox="0 0 48 20">
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.85}
      />
    </Svg>
  );
}

/** Compact dashboard stat tile — icon + count top, full-width label below. */
export function DashboardMetricCard({
  label,
  value,
  icon,
  tint,
  iconColor,
  onPress,
  height = 118,
  animSeed = 0,
}) {
  const { colors, isDark } = useTheme();
  const cardTint = isDark ? `${iconColor}24` : tint;
  const Wrapper = onPress ? PressableScale : View;

  return (
    <Wrapper
      className="rounded-[14px] border border-border-strong bg-card p-3"
      style={{
        width: '100%',
        height,
        shadowColor: colors.text,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.1 : 0.05,
        shadowRadius: 6,
        elevation: 2,
      }}
      onPress={onPress}>
      <View className="flex-1">
        <View className="w-full flex-row items-center justify-between">
          <View
            className="h-[40px] w-[40px] shrink-0 items-center justify-center rounded-[8px]"
            style={{ backgroundColor: cardTint }}>
            <MaterialCommunityIcons name={icon} size={28} color={iconColor} />
          </View>
          <Text className="text-[24px] font-black leading-[28px]" style={{ color: colors.text }} numberOfLines={1}>
            {value}
          </Text>
        </View>

        <Text
          className="mt-3 w-full text-[14px] font-bold leading-[14px]"
          style={{ color: colors.text, width: '100%' }}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}>
          {label}
        </Text>

        <View className="mt-2 w-full flex-row items-end justify-between">
          <Text className="text-[12px] font-semibold" style={{ color: colors.textMuted }}>
             0%
          </Text>
          <MiniSparkline color={iconColor} seed={animSeed} />
        </View>
      </View>
    </Wrapper>
  );
}
