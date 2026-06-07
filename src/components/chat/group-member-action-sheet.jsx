import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { useTheme } from '@/context/theme-context';
import { cn } from '@/theme/cn';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SHEET_SLIDE = 380;

const ActionCard = React.memo(function ActionCard({
  tone,
  icon,
  title,
  subtitle,
  onPress,
  disabled,
  colors,
}) {
  const isDanger = tone === 'danger';
  return (
    <Pressable
      className={cn(
        'flex-row items-center gap-3 rounded-2xl p-3.5',
        isDanger ? 'bg-danger-bg' : 'bg-info-bg',
      )}
      onPress={onPress}
      disabled={disabled}>
      <View
        className={cn(
          'h-11 w-11 items-center justify-center rounded-xl',
          isDanger ? 'bg-[#fee2e2]' : '',
        )}
        style={!isDanger ? { backgroundColor: colors.chipActiveBg } : undefined}>
        <MaterialCommunityIcons name={icon} size={22} color={isDanger ? '#dc2626' : colors.primaryMid} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className={cn('text-base font-extrabold', isDanger ? 'text-[#dc2626]' : 'text-primary-mid')}>
          {title}
        </Text>
        {subtitle ? <Text className="mt-[3px] text-xs leading-4 text-text-muted">{subtitle}</Text> : null}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />
    </Pressable>
  );
});

/**
 * Bottom sheet for group member actions (promote / demote / remove).
 */
export function GroupMemberActionSheet({
  visible,
  member,
  role,
  busy = false,
  onClose,
  onRemove,
  onMakeAdmin,
  onMakeMember,
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && member) {
      progress.setValue(0);
      Animated.spring(progress, { toValue: 1, useNativeDriver: true, stiffness: 340, damping: 32 }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible, member, progress]);

  const closeAnimated = useCallback(() => {
    if (busy) return;
    Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: true }).start(({ finished }) => {
      if (finished) onClose();
    });
  }, [busy, onClose, progress]);

  const sheetY = progress.interpolate({ inputRange: [0, 1], outputRange: [SHEET_SLIDE, 0] });
  const backdropOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  if (!visible || !member) return null;

  const displayName = String(member.displayName || member.name || 'Member').trim();
  const isAdmin = role === 'admin';

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={closeAnimated}>
      <View className="flex-1 justify-end">
        <Pressable style={StyleSheet.absoluteFill} onPress={closeAnimated}>
          <Animated.View
            pointerEvents="none"
            className="absolute inset-0"
            style={{ backgroundColor: colors.modalBackdrop, opacity: backdropOpacity }}
          />
        </Pressable>
        <Animated.View
          className="w-full max-w-[520px] self-center rounded-t-[22px] px-[18px] pt-2"
          style={{
            backgroundColor: colors.modalSheetBg,
            paddingBottom: Math.max(insets.bottom, 16),
            transform: [{ translateY: sheetY }],
          }}>
          <View className="mb-3.5 h-1 w-10 self-center rounded-sm bg-border-strong" />

          <View className="mb-[18px] flex-row items-center gap-3">
            <View>
              {member.avatarUrl ? (
                <Image source={{ uri: member.avatarUrl }} className="h-[52px] w-[52px] rounded-[26px]" contentFit="cover" />
              ) : (
                <View
                  className="h-[52px] w-[52px] items-center justify-center rounded-[26px]"
                  style={{ backgroundColor: colors.chipActiveBg }}>
                  <Text className="text-xl font-extrabold text-primary-mid">{displayName.slice(0, 1)}</Text>
                </View>
              )}
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[17px] font-extrabold text-text" numberOfLines={1}>
                {displayName}
              </Text>
              <Text className="mt-0.5 text-[13px] text-text-muted">{member.online ? 'Online' : 'Offline'}</Text>
            </View>
            <Pressable
              className="h-9 w-9 items-center justify-center rounded-[18px] bg-info-bg"
              onPress={closeAnimated}
              hitSlop={10}
              disabled={busy}>
              <MaterialCommunityIcons name="close" size={20} color={colors.primaryMid} />
            </Pressable>
          </View>

          {busy ? <ActivityIndicator className="mb-2" color={colors.primaryMid} /> : null}

          <View className="gap-3 pb-1">
            <ActionCard
              tone="danger"
              icon="account-remove-outline"
              title="Remove from group"
              subtitle={`${displayName} will be removed from this group`}
              disabled={busy}
              colors={colors}
              onPress={() => {
                closeAnimated();
                setTimeout(() => onRemove(), 220);
              }}
            />
            {isAdmin ? (
              <ActionCard
                tone="primary"
                icon="shield-off-outline"
                title="Dismiss as admin"
                subtitle={`${displayName} will be a regular member`}
                disabled={busy}
                colors={colors}
                onPress={() => {
                  closeAnimated();
                  setTimeout(() => onMakeMember(), 220);
                }}
              />
            ) : (
              <ActionCard
                tone="primary"
                icon="shield-star-outline"
                title="Make admin"
                subtitle={`${displayName} will be added as an admin`}
                disabled={busy}
                colors={colors}
                onPress={() => {
                  closeAnimated();
                  setTimeout(() => onMakeAdmin(), 220);
                }}
              />
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
