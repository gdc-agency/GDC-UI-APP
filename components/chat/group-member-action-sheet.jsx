import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { useTheme } from '@/context/theme-context';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
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
  styles,
  colors,
}) {
  const isDanger = tone === 'danger';
  return (
    <Pressable
      style={[styles.actionCard, isDanger ? styles.actionCardDanger : styles.actionCardPrimary]}
      onPress={onPress}
      disabled={disabled}>
      <View style={[styles.actionIconWrap, isDanger ? styles.actionIconDanger : styles.actionIconPrimary]}>
        <MaterialCommunityIcons name={icon} size={22} color={isDanger ? '#dc2626' : colors.primaryMid} />
      </View>
      <View style={styles.actionTextWrap}>
        <Text style={[styles.actionTitle, isDanger ? styles.actionTitleDanger : styles.actionTitlePrimary]}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.actionSubtitle}>{subtitle}</Text> : null}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />
    </Pressable>
  );
});

/**
 * Bottom sheet for group member actions (promote / demote / remove).
 * @param {{
 *   visible: boolean;
 *   member: { id: string; displayName?: string; name?: string; avatarUrl?: string | null; online?: boolean } | null;
 *   role: 'admin' | 'member';
 *   busy?: boolean;
 *   onClose: () => void;
 *   onRemove: () => void;
 *   onMakeAdmin: () => void;
 *   onMakeMember: () => void;
 * }} props
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

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, justifyContent: 'flex-end' },
        backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.modalBackdrop },
        sheet: {
          backgroundColor: colors.modalSheetBg,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          paddingHorizontal: 18,
          paddingTop: 8,
          maxWidth: 520,
          width: '100%',
          alignSelf: 'center',
        },
        grabber: {
          alignSelf: 'center',
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.borderStrong,
          marginBottom: 14,
        },
        profileRow: {
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 18,
          gap: 12,
        },
        profileAvatarWrap: {},
        profileAvatar: { width: 52, height: 52, borderRadius: 26 },
        profileAvatarFb: {
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: colors.chipActiveBg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        profileAvatarLetter: { fontSize: 20, fontWeight: '800', color: colors.primaryMid },
        profileMeta: { flex: 1, minWidth: 0 },
        profileName: { fontSize: 17, fontWeight: '800', color: colors.text },
        profileStatus: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
        closeBtn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.infoBg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        busy: { marginBottom: 8 },
        actions: { gap: 12, paddingBottom: 4 },
        actionCard: {
          flexDirection: 'row',
          alignItems: 'center',
          borderRadius: 16,
          padding: 14,
          gap: 12,
        },
        actionCardDanger: { backgroundColor: colors.dangerBg },
        actionCardPrimary: { backgroundColor: colors.infoBg },
        actionIconWrap: {
          width: 44,
          height: 44,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
        },
        actionIconDanger: { backgroundColor: '#fee2e2' },
        actionIconPrimary: { backgroundColor: colors.chipActiveBg },
        actionTextWrap: { flex: 1, minWidth: 0 },
        actionTitle: { fontSize: 16, fontWeight: '800' },
        actionTitleDanger: { color: '#dc2626' },
        actionTitlePrimary: { color: colors.primaryMid },
        actionSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 3, lineHeight: 16 },
      }),
    [colors],
  );

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
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeAnimated}>
          <Animated.View pointerEvents="none" style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </Pressable>
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 16), transform: [{ translateY: sheetY }] },
          ]}>
          <View style={styles.grabber} />

          <View style={styles.profileRow}>
            <View style={styles.profileAvatarWrap}>
              {member.avatarUrl ? (
                <Image source={{ uri: member.avatarUrl }} style={styles.profileAvatar} contentFit="cover" />
              ) : (
                <View style={styles.profileAvatarFb}>
                  <Text style={styles.profileAvatarLetter}>{displayName.slice(0, 1)}</Text>
                </View>
              )}
            </View>
            <View style={styles.profileMeta}>
              <Text style={styles.profileName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.profileStatus}>{member.online ? 'Online' : 'Offline'}</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={closeAnimated} hitSlop={10} disabled={busy}>
              <MaterialCommunityIcons name="close" size={20} color={colors.primaryMid} />
            </Pressable>
          </View>

          {busy ? (
            <ActivityIndicator style={styles.busy} color={colors.primaryMid} />
          ) : null}

          <View style={styles.actions}>
            <ActionCard
              tone="danger"
              icon="account-remove-outline"
              title="Remove from group"
              subtitle={`${displayName} will be removed from this group`}
              disabled={busy}
              styles={styles}
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
                styles={styles}
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
                styles={styles}
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
