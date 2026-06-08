import { Image } from 'expo-image';
import React from 'react';
import { Text, View } from 'react-native';

import { AuthBrandDivider } from '@/components/auth/auth-scene-background';
import {
  BRAND_LOGO_SOURCE,
  BRAND_NAVY,
  BRAND_ORANGE,
  BRAND_SLOGAN,
} from '@/data/constants/brand';
import { useTheme } from '@/context/theme-context';

const LOGO_SIZE = 108;

/**
 * Centered GDC logo + split "Global Digital Care" title.
 * @param {{ showDivider?: boolean; slogan?: string | null; compact?: boolean; lightOnDark?: boolean }} props
 */
export function AuthBrandBlock({
  showDivider = false,
  slogan = BRAND_SLOGAN,
  compact = false,
  lightOnDark = false,
}) {
  const { isDark } = useTheme();
  const onDark = lightOnDark || isDark;
  const titleColor = onDark ? '#FFFFFF' : BRAND_NAVY;
  const sloganColor = onDark ? 'rgba(255,255,255,0.9)' : '#64748B';
  const titleSize = compact ? 24 : 28;

  return (
    <View className="items-center">
      <Image
        source={BRAND_LOGO_SOURCE}
        style={{ width: LOGO_SIZE, height: LOGO_SIZE, backgroundColor: 'transparent' }}
        contentFit="contain"
        accessibilityLabel="Global Digital Care logo"
      />
      <Text className="mt-3 text-center" style={{ fontSize: titleSize, lineHeight: titleSize + 6 }}>
        <Text style={{ color: titleColor, fontWeight: '800' }}>Global </Text>
        <Text style={{ color: BRAND_ORANGE, fontWeight: '800' }}>Digital Care</Text>
      </Text>
      {showDivider ? <AuthBrandDivider isDark={onDark} /> : null}
      {slogan ? (
        <Text
          className="max-w-[300px] text-center"
          style={{ color: sloganColor, fontSize: compact ? 13 : 14, fontWeight: '600', lineHeight: 20 }}>
          {slogan}
        </Text>
      ) : null}
    </View>
  );
}
