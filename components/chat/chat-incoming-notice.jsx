import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { useTheme } from '@/context/theme-context';
import { Image } from 'expo-image';
import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

function formatRelativeTime(atMs) {
  if (!atMs || !Number.isFinite(atMs)) return 'Just now';
  const diffSec = Math.max(0, Math.floor((Date.now() - atMs) / 1000));
  if (diffSec < 60) return 'Just now';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatUnreadLabel(count) {
  const n = Number(count) || 0;
  if (n <= 0) return '';
  if (n === 1) return '1 New Message';
  return `${n} New Messages`;
}

/**
 * In-app chat notification banner (reference-style card).
 * @param {{
 *   title: string;
 *   preview: string;
 *   senderName?: string;
 *   unreadCount?: number;
 *   avatarUrl?: string | null;
 *   isOnline?: boolean;
 *   at?: number;
 *   onPress: () => void;
 *   onDismiss: () => void;
 * }} props
 */
export function ChatIncomingNotice({
  title,
  preview,
  senderName,
  unreadCount = 1,
  avatarUrl,
  isOnline = false,
  at,
  onPress,
  onDismiss,
}) {
  const { colors } = useTheme();
  const slide = useRef(new Animated.Value(-120)).current;
  const displayName = senderName && senderName !== title ? senderName : title;
  const unreadLabel = formatUnreadLabel(unreadCount);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          paddingHorizontal: 14,
          zIndex: 20,
          elevation: 14,
        },
        card: {
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
          backgroundColor: colors.card,
          borderRadius: 18,
          paddingVertical: 14,
          paddingHorizontal: 14,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.borderStrong,
          shadowColor: '#0b2c6a',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.12,
          shadowRadius: 14,
          elevation: 8,
        },
        avatarCol: { position: 'relative' },
        avatarImg: {
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.borderStrong,
        },
        avatarFallback: {
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.primaryMid,
          alignItems: 'center',
          justifyContent: 'center',
        },
        onlineDot: {
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 13,
          height: 13,
          borderRadius: 7,
          backgroundColor: '#22c55e',
          borderWidth: 2,
          borderColor: colors.card,
        },
        textCol: { flex: 1, minWidth: 0, paddingTop: 2 },
        title: { fontSize: 15, fontWeight: '800', color: colors.text },
        preview: { marginTop: 3, fontSize: 13, color: colors.textMuted, lineHeight: 18 },
        newMsgPill: {
          marginTop: 8,
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          backgroundColor: colors.primaryMid,
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 5,
        },
        newMsgPillText: { color: '#fff', fontSize: 11, fontWeight: '800' },
        metaCol: { alignItems: 'flex-end', justifyContent: 'space-between', minHeight: 48 },
        closeBtn: { padding: 2 },
        relativeTime: { marginTop: 'auto', fontSize: 11, color: colors.textSecondary, fontWeight: '600' },
      }),
    [colors],
  );

  useEffect(() => {
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 5 }).start();
    const t = setTimeout(() => onDismiss(), 6000);
    return () => clearTimeout(t);
  }, [onDismiss, slide]);

  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateY: slide }] }]}>
      <Pressable style={styles.card} onPress={onPress}>
        <View style={styles.avatarCol}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImg} contentFit="cover" />
          ) : (
            <View style={styles.avatarFallback}>
              <MaterialCommunityIcons name="message-text" size={22} color="#fff" />
            </View>
          )}
          {isOnline ? <View style={styles.onlineDot} /> : null}
        </View>

        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.preview} numberOfLines={1}>
            {preview}
          </Text>
          {unreadLabel ? (
            <View style={styles.newMsgPill}>
              <MaterialCommunityIcons name="bell-ring-outline" size={13} color="#fff" />
              <Text style={styles.newMsgPillText}>{unreadLabel}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.metaCol}>
          <Pressable onPress={onDismiss} hitSlop={12} style={styles.closeBtn}>
            <MaterialCommunityIcons name="close" size={18} color={colors.textSecondary} />
          </Pressable>
          <Text style={styles.relativeTime}>{formatRelativeTime(at)}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
