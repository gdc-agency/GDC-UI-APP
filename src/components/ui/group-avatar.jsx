import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { Image } from 'expo-image';
import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { useTheme } from '@/context/theme-context';
import { resolveProfileImageUri } from '@/utils/chat-directory';
import { nameInitials } from '@/components/ui/profile-avatar';

/**
 * Group chat avatar — resolves data/http paths; explicit px size for APK.
 */
export function GroupAvatar({
  uri,
  name = 'Group',
  size = 108,
  radius,
  iconSize,
  style,
  showInitialsFallback = false,
}) {
  const { colors } = useTheme();
  const resolved = uri ? resolveProfileImageUri(uri) : null;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [resolved]);

  const r = radius ?? Math.round(size * 0.5);
  const boxStyle = useMemo(
    () => [{ width: size, height: size, borderRadius: r, overflow: 'hidden' }, style],
    [size, r, style],
  );

  const fallbackBg = colors.chipActiveBg || '#eff6ff';
  const fallbackColor = colors.primaryMid || '#2563eb';
  const glyph = Math.round(size * 0.36);

  if (resolved && !failed) {
    return (
      <Image
        source={{ uri: resolved }}
        style={boxStyle}
        contentFit="cover"
        recyclingKey={resolved}
        onError={() => setFailed(true)}
        accessibilityLabel={`${name} group photo`}
      />
    );
  }

  if (showInitialsFallback && name) {
    return (
      <View style={[boxStyle, { alignItems: 'center', justifyContent: 'center', backgroundColor: fallbackBg }]}>
        <Text style={{ fontSize: Math.round(size * 0.32), fontWeight: '800', color: fallbackColor }}>
          {nameInitials(name)}
        </Text>
      </View>
    );
  }

  return (
    <View style={[boxStyle, { alignItems: 'center', justifyContent: 'center', backgroundColor: fallbackBg }]}>
      <MaterialCommunityIcons name="account-group" size={iconSize ?? glyph} color={fallbackColor} />
    </View>
  );
}
