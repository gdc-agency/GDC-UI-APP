import { Image } from 'expo-image';
import React from 'react';
import { Text, View } from 'react-native';

import { AuthBrandDivider } from '@/components/auth/auth-scene-background';
import {
  BRAND_LOGO_DARK_SOURCE,
  BRAND_LOGO_SOURCE,
  BRAND_NAVY,
  BRAND_ORANGE,
  BRAND_SLOGAN,
} from '@/data/constants/brand';
import { useTheme } from '@/context/theme-context';

const LOGO_SIZE = 108;

/**
 * Centered WorkTym logo + "WorkTym" title (orange T).
 * Light: blue WT. Dark: white WT.
 * @param {{ showDivider?: boolean; showAcronym?: boolean; slogan?: string | null; compact?: boolean; lightOnDark?: boolean }} props
 */
export function AuthBrandBlock({
  showDivider = false,
  showAcronym = false,
  slogan = BRAND_SLOGAN,
  compact = false,
  lightOnDark = false,
}) {
  const { isDark } = useTheme();
  const onDark = lightOnDark || isDark;
  const titleColor = onDark ? '#FFFFFF' : BRAND_NAVY;
  const sloganColor = onDark ? 'rgba(255,255,255,0.9)' : '#64748B';
  const titleSize = compact ? 24 : 28;
  const logoSource = onDark ? BRAND_LOGO_DARK_SOURCE : BRAND_LOGO_SOURCE;

  return (
    <View className="items-center">
      <Image
        source={logoSource}
        style={{ width: LOGO_SIZE, height: LOGO_SIZE, backgroundColor: 'transparent' }}
        contentFit="contain"
        accessibilityLabel="WorkTym logo"
      />
      {showAcronym ? (
        <View className="mt-4 w-full max-w-[240px] flex-row items-center">
          <View className="h-px flex-1" style={{ backgroundColor: onDark ? 'rgba(255,255,255,0.25)' : '#CBD5E1' }} />
          <Text className="mx-3 text-[22px] font-extrabold tracking-[1px]">
            <Text style={{ color: onDark ? '#FFFFFF' : BRAND_NAVY }}>W</Text>
            <Text style={{ color: BRAND_ORANGE }}>T</Text>
          </Text>
          <View className="h-px flex-1" style={{ backgroundColor: onDark ? 'rgba(255,255,255,0.25)' : '#CBD5E1' }} />
        </View>
      ) : null}
      <Text
        className={showAcronym ? 'mt-3 text-center' : 'mt-3 text-center'}
        style={{ fontSize: titleSize, lineHeight: titleSize + 6 }}>
        <Text style={{ color: titleColor, fontWeight: '800' }}>Work</Text>
        <Text style={{ color: BRAND_ORANGE, fontWeight: '800' }}>T</Text>
        <Text style={{ color: titleColor, fontWeight: '800' }}>ym</Text>
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
