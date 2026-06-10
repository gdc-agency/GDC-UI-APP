import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { useTheme } from '@/context/theme-context';
import { mergeStyle } from '@/utils/merge-style';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { KeyboardAvoidingView } from '@/components/ui/keyboard-aware-scroll-view';
import { SkeletonGroup, SkeletonListRow } from '@/components/ui/skeleton';

const SHEET_SLIDE = 480;

const ContactRow = memo(function ContactRow({ item, loading, onPress, colors }) {
  const line = item.displayName || item.name;
  const statusText = item.online ? 'Online' : 'Offline';
  const statusColor = item.online ? colors.primaryMid : colors.textMuted;
  return (
    <Pressable
      className="flex-row items-center gap-3 px-2 py-[11px]"
      style={({ pressed }) =>
        pressed ? { backgroundColor: colors.surfaceMuted, borderRadius: 12 } : undefined
      }
      onPress={() => onPress(item)}
      disabled={loading}>
      <ProfileAvatar uri={item.avatarUrl} name={line} size={48} />
      <View className="min-w-0 flex-1">
        <Text className="shrink text-base font-bold" style={{ color: colors.text }} numberOfLines={1}>
          {line}
        </Text>
        <View className="mt-0.5 flex-row items-center gap-2">
          {item.roleLabel ? (
            <Text className="text-xs font-semibold" style={{ color: colors.textMuted }} numberOfLines={1}>
              {item.roleLabel}
            </Text>
          ) : null}
          <Text className="text-xs font-semibold" style={{ color: statusColor }}>
            {statusText}
          </Text>
        </View>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={colors.primaryMid} />
      ) : (
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
      )}
    </Pressable>
  );
});

/**
 * Bottom-sheet contact picker — opens chat directly (no stacked center modal).
 */
export function NewChatPicker({
  visible,
  onClose,
  contacts,
  contactsLoading = false,
  directoryHydrated = true,
  onSelectContact,
  onCreateGroup,
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  const [search, setSearch] = useState('');
  const [startingId, setStartingId] = useState(/** @type {string | null} */ (null));

  const sheetShadowStyle = Platform.select({
    ios: {
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.14,
      shadowRadius: 18,
    },
    android: { elevation: 18 },
    default: {},
  });

  useEffect(() => {
    if (!visible) {
      setSearch('');
      setStartingId(null);
      return undefined;
    }
    progress.setValue(0);
    Animated.spring(progress, {
      toValue: 1,
      useNativeDriver: true,
      stiffness: 340,
      damping: 32,
    }).start();
    return undefined;
  }, [progress, visible]);

  const closeAnimated = useCallback(() => {
    if (startingId) return;
    Animated.timing(progress, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
      if (finished) onClose();
    });
  }, [onClose, progress, startingId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = Array.isArray(contacts) ? contacts : [];
    if (!q) return list;
    return list.filter((c) => {
      const name = String(c.displayName || c.name || '').toLowerCase();
      const role = String(c.roleLabel || c.status || '').toLowerCase();
      return name.includes(q) || role.includes(q);
    });
  }, [contacts, search]);

  const showSkeleton = visible && (contactsLoading || !directoryHydrated) && filtered.length === 0;

  const pickContact = useCallback(
    async (contact) => {
      const id = contact?.id != null ? String(contact.id) : '';
      if (!id || startingId) return;
      setStartingId(id);
      try {
        await onSelectContact(contact);
      } catch {
        setStartingId(null);
      }
    },
    [onSelectContact, startingId],
  );

  const backdropOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const sheetY = progress.interpolate({ inputRange: [0, 1], outputRange: [SHEET_SLIDE, 0] });

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={closeAnimated}>
      <KeyboardAvoidingView behavior="padding" className="flex-1 justify-end">
        <Pressable style={StyleSheet.absoluteFill} onPress={closeAnimated} accessibilityLabel="Close">
          <Animated.View
            pointerEvents="none"
            className="absolute inset-0"
            style={{ backgroundColor: colors.modalBackdrop, opacity: backdropOpacity }}
          />
        </Pressable>

        <Animated.View
          className="min-h-[320px] rounded-t-[22px] px-5 pt-2"
          style={mergeStyle(sheetShadowStyle, {
            backgroundColor: colors.modalSheetBg,
            maxHeight: '88%',
            paddingBottom: Math.max(insets.bottom, 12),
            transform: [{ translateY: sheetY }],
          })}>
          <View
            className="mb-3 h-1 w-10 self-center rounded-full"
            style={{ backgroundColor: colors.borderStrong }}
          />
          <Text className="mb-3.5 text-xl font-extrabold" style={{ color: colors.text }}>
            New chat
          </Text>

          <Pressable
            className="mb-3 flex-row items-center gap-3 rounded-2xl border px-3 py-3"
            style={({ pressed }) => ({
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.borderLight,
              opacity: pressed ? 0.88 : 1,
            })}
            onPress={() => {
              closeAnimated();
              setTimeout(() => onCreateGroup(), 220);
            }}
            disabled={!!startingId}>
            <View
              className="h-12 w-12 items-center justify-center rounded-full"
              style={{ backgroundColor: colors.primaryMid }}>
              <MaterialCommunityIcons name="account-group-outline" size={24} color="#fff" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold" style={{ color: colors.text }}>
                Create group
              </Text>
              <Text className="mt-0.5 text-xs" style={{ color: colors.textMuted }}>
                Start a team conversation
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />
          </Pressable>

          <View
            className="mb-2.5 flex-row items-center rounded-[14px] border px-3"
            style={{ backgroundColor: colors.surfaceMuted, borderColor: colors.borderLight }}>
            <MaterialCommunityIcons name="magnify" size={18} color={colors.textSecondary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search people"
              placeholderTextColor={colors.inputPlaceholder}
              className="flex-1 px-2 py-2.5 text-[15px]"
              style={{ color: colors.text }}
              autoCorrect={false}
            />
          </View>

          {showSkeleton ? (
            <SkeletonGroup className="gap-1 pb-3">
              {[0, 1, 2, 3, 4, 5].map((k) => (
                <SkeletonListRow key={k} />
              ))}
            </SkeletonGroup>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              initialNumToRender={12}
              maxToRenderPerBatch={10}
              windowSize={8}
              removeClippedSubviews={Platform.OS === 'android'}
              className="max-h-[420px] flex-grow-0"
              contentContainerStyle={filtered.length === 0 ? { paddingVertical: 24 } : undefined}
              ListEmptyComponent={
                <Text className="py-5 text-center text-sm" style={{ color: colors.textSecondary }}>
                  {directoryHydrated ? 'No contacts match your search.' : 'Loading contacts…'}
                </Text>
              }
              renderItem={({ item }) => (
                <ContactRow
                  item={item}
                  loading={startingId === String(item.id)}
                  onPress={pickContact}
                  colors={colors}
                />
              )}
            />
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
