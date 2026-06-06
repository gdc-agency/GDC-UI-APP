import { useTheme } from '@/context/theme-context';
import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * WhatsApp-style footer when only group admins may post.
 */
export const GroupAdminsOnlyBanner = memo(function GroupAdminsOnlyBanner({ bottomInset = 0 }) {
  const { colors, chatTheme } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        bar: {
          paddingTop: 14,
          paddingHorizontal: 20,
          backgroundColor: chatTheme.composerBar,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.borderStrong,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 52,
        },
        text: {
          fontSize: 15,
          fontWeight: '500',
          color: chatTheme.metaMuted,
          textAlign: 'center',
        },
        highlight: {
          fontWeight: '800',
          color: colors.primaryMid,
        },
      }),
    [colors, chatTheme],
  );

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(bottomInset, 10) }]}>
      <Text style={styles.text}>
        Only <Text style={styles.highlight}>admins</Text> can send messages
      </Text>
    </View>
  );
});
