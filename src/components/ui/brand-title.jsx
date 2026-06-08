import React from 'react';
import { Text } from 'react-native';

import { BRAND_NAVY, BRAND_ORANGE } from '@/data/constants/brand';
import { useTheme } from '@/context/theme-context';

const SIZES = {
  sm: { fontSize: 14, lineHeight: 18 },
  md: { fontSize: 16, lineHeight: 20 },
  lg: { fontSize: 17, lineHeight: 22 },
};

/** Inline "Global Digital Care" — navy/white + orange split (topbar, drawer). */
export function BrandTitle({ size = 'md', numberOfLines = 1, className }) {
  const { isDark } = useTheme();
  const titleColor = isDark ? '#FFFFFF' : BRAND_NAVY;
  const { fontSize, lineHeight } = SIZES[size] ?? SIZES.md;

  return (
    <Text
      className={className}
      numberOfLines={numberOfLines}
      style={{ fontSize, lineHeight }}>
      <Text style={{ color: titleColor, fontWeight: '800' }}>Global </Text>
      <Text style={{ color: BRAND_ORANGE, fontWeight: '800' }}>Digital Care</Text>
    </Text>
  );
}
