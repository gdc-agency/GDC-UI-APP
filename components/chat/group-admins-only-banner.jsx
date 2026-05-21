import { BrandColors } from '@/constants/brand';
import { ChatTheme } from '@/constants/chat-theme';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * WhatsApp-style footer when only group admins may post.
 */
export const GroupAdminsOnlyBanner = memo(function GroupAdminsOnlyBanner({ bottomInset = 0 }) {
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(bottomInset, 10) }]}>
      <Text style={styles.text}>
        Only <Text style={styles.highlight}>admins</Text> can send messages
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  bar: {
    paddingTop: 14,
    paddingHorizontal: 20,
    backgroundColor: ChatTheme.composerBar,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e9edef',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  text: {
    fontSize: 15,
    fontWeight: '500',
    color: ChatTheme.metaMuted,
    textAlign: 'center',
  },
  highlight: {
    fontWeight: '800',
    color: BrandColors.primaryMid,
  },
});
