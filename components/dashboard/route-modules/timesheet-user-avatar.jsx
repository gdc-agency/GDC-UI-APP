import { Image } from 'expo-image';
import React from 'react';
import { Text, View } from 'react-native';

import { TsColors, timesheetStyles as ts } from './timesheet-styles';

export function initialsFromName(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/** Profile image with initials fallback for timesheet lists. */
export function TimesheetUserAvatar({ name, avatarUrl, size = 44 }) {
  const radius = size / 2;
  const boxStyle = [ts.avatar, { width: size, height: size, borderRadius: radius }];

  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={[boxStyle, ts.avatarImage]}
        contentFit="cover"
        recyclingKey={avatarUrl}
        accessibilityLabel={name ? `${name} profile` : 'Profile photo'}
      />
    );
  }

  return (
    <View style={boxStyle}>
      <Text style={[ts.avatarText, size < 40 && { fontSize: 12 }]}>{initialsFromName(name)}</Text>
    </View>
  );
}
