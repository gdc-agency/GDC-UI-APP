import { Image } from 'expo-image';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/context/theme-context';
import { resolveProfileImageUri } from '@/utils/chat-directory';

/** First letter of first name + first letter of last name (or single name initial). */
export function nameInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Profile image with initials fallback.
 * Initials always render underneath so APK never shows an empty avatar slot.
 */
export function ProfileAvatar({
  uri,
  name,
  size = 44,
  style,
  textStyle,
  fallbackBg,
  fallbackTextColor,
  contentFit = 'cover',
}) {
  const { moduleStyles, colors } = useTheme();
  const TsColors = moduleStyles.timesheet.colors;
  const resolved = uri ? resolveProfileImageUri(uri) : null;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [resolved]);

  const radius = size / 2;
  const rootStyle = useMemo(
    () => [{ width: size, height: size, borderRadius: radius, overflow: 'hidden', flexShrink: 0 }, style],
    [size, radius, style],
  );

  const fallbackBgColor = fallbackBg || TsColors.avatarBg || colors.chipActiveBg;
  const fallbackColor = fallbackTextColor || TsColors.blue || colors.primaryMid;
  const fontSize = size < 40 ? Math.max(10, Math.round(size * 0.34)) : Math.round(size * 0.32);

  return (
    <View style={rootStyle} accessibilityLabel={name ? `${name} profile` : 'Profile photo'}>
      <View
        style={[
          StyleSheet.absoluteFillObject,
          {
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: fallbackBgColor,
          },
        ]}>
        <Text style={[{ fontSize, fontWeight: '800', color: fallbackColor }, textStyle]}>{nameInitials(name)}</Text>
      </View>
      {resolved && !failed ? (
        <Image
          source={{ uri: resolved }}
          style={StyleSheet.absoluteFillObject}
          contentFit={contentFit}
          recyclingKey={resolved}
          onError={() => setFailed(true)}
        />
      ) : null}
    </View>
  );
}
