import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { useTheme } from '@/context/theme-context';
import { mergeStyle } from '@/utils/merge-style';
import { Image } from 'expo-image';
import React, { useEffect, useRef } from 'react';
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

const CARD_SHADOW = {
  shadowColor: '#0b2c6a',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.12,
  shadowRadius: 14,
  elevation: 8,
};

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

  useEffect(() => {
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, speed: 16, bounciness: 5 }).start();
    const t = setTimeout(() => onDismiss(), 6000);
    return () => clearTimeout(t);
  }, [onDismiss, slide]);

  return (
    <Animated.View
      className="z-20 px-3.5 elevation-[14]"
      style={{ transform: [{ translateY: slide }] }}>
      <Pressable
        className="flex-row items-start gap-3 rounded-[18px] bg-card px-3.5 py-3.5"
        style={mergeStyle(CARD_SHADOW, { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.borderStrong })}
        onPress={onPress}>
        <View className="relative">
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.borderStrong }}
              contentFit="cover"
            />
          ) : (
            <View className="h-12 w-12 items-center justify-center rounded-full bg-primary-mid">
              <MaterialCommunityIcons name="message-text" size={22} color="#fff" />
            </View>
          )}
          {isOnline ? (
            <View className="absolute bottom-0 right-0 h-[13px] w-[13px] rounded-[7px] border-2 border-card bg-green-500" />
          ) : null}
        </View>

        <View className="min-w-0 flex-1 pt-0.5">
          <Text className="text-[15px] font-extrabold text-text" numberOfLines={1}>
            {displayName}
          </Text>
          <Text className="mt-[3px] text-[13px] leading-[18px] text-text-muted" numberOfLines={1}>
            {preview}
          </Text>
          {unreadLabel ? (
            <View className="mt-2 flex-row items-center gap-[5px] self-start rounded-pill bg-primary-mid px-2.5 py-[5px]">
              <MaterialCommunityIcons name="bell-ring-outline" size={13} color="#fff" />
              <Text className="text-[11px] font-extrabold text-white">{unreadLabel}</Text>
            </View>
          ) : null}
        </View>

        <View className="min-h-12 items-end justify-between">
          <Pressable onPress={onDismiss} hitSlop={12} className="p-0.5">
            <MaterialCommunityIcons name="close" size={18} color={colors.textSecondary} />
          </Pressable>
          <Text className="mt-auto text-[11px] font-semibold text-text-secondary">{formatRelativeTime(at)}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
