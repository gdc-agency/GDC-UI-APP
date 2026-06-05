import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { BrandColors } from '@/constants/brand';
import { Image } from 'expo-image';
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

import { SkeletonGroup, SkeletonListRow } from '@/components/ui/skeleton';

const SHEET_SLIDE = 480;

const ContactRow = memo(function ContactRow({ item, loading, onPress }) {
  const line = item.displayName || item.name;
  return (
    <Pressable
      style={({ pressed }) => [styles.contactRow, pressed && styles.contactRowPressed]}
      onPress={() => onPress(item)}
      disabled={loading}>
      <View style={styles.avatarWrap}>
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.contactAvatarImg} contentFit="cover" />
        ) : (
          <View style={styles.avatarSm}>
            <Text style={styles.avatarText}>{String(line).slice(0, 1)}</Text>
          </View>
        )}
        <View style={[styles.presenceDot, item.online && styles.presenceDotOnline]} />
      </View>
      <View style={styles.contactMeta}>
        <View style={styles.nameRow}>
          <Text style={styles.contactName} numberOfLines={1}>
            {line}
          </Text>
        </View>
        {item.roleLabel ? (
          <Text style={styles.contactSub} numberOfLines={1}>
            {item.roleLabel}
          </Text>
        ) : null}
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={BrandColors.primaryMid} />
      ) : (
        <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
      )}
    </Pressable>
  );
});

/**
 * Bottom-sheet contact picker — opens chat directly (no stacked center modal).
 * @param {{
 *   visible: boolean;
 *   onClose: () => void;
 *   contacts: Array<Record<string, unknown>>;
 *   contactsLoading?: boolean;
 *   directoryHydrated?: boolean;
 *   onSelectContact: (contact: Record<string, unknown>) => void | Promise<void>;
 *   onCreateGroup: () => void;
 * }} props
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
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  const [search, setSearch] = useState('');
  const [startingId, setStartingId] = useState(/** @type {string | null} */ (null));

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
    [closeAnimated, onSelectContact, startingId],
  );

  const backdropOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const sheetY = progress.interpolate({ inputRange: [0, 1], outputRange: [SHEET_SLIDE, 0] });

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={closeAnimated}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeAnimated} accessibilityLabel="Close">
          <Animated.View pointerEvents="none" style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </Pressable>

        <Animated.View
          style={[
            styles.sheet,
            {
              maxHeight: '88%',
              paddingBottom: Math.max(insets.bottom, 12),
              transform: [{ translateY: sheetY }],
            },
          ]}>
          <View style={styles.grabber} />
          <Text style={styles.sheetTitle}>New chat</Text>

          <Pressable
            style={({ pressed }) => [styles.groupEntry, pressed && styles.groupEntryPressed]}
            onPress={() => {
              closeAnimated();
              setTimeout(() => onCreateGroup(), 220);
            }}
            disabled={!!startingId}>
            <View style={styles.groupIcon}>
              <MaterialCommunityIcons name="account-group-outline" size={22} color="#fff" />
            </View>
            <Text style={styles.groupEntryText}>Create group</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color="#94a3b8" />
          </Pressable>

          <View style={styles.searchWrap}>
            <MaterialCommunityIcons name="magnify" size={18} color="#94a3b8" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search people"
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
              autoCorrect={false}
            />
          </View>

          {showSkeleton ? (
            <SkeletonGroup style={styles.skeletonBox}>
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
              style={styles.list}
              contentContainerStyle={filtered.length === 0 ? styles.listEmptyPad : undefined}
              ListEmptyComponent={
                <Text style={styles.emptyText}>
                  {directoryHydrated ? 'No contacts match your search.' : 'Loading contacts…'}
                </Text>
              }
              renderItem={({ item }) => (
                <ContactRow
                  item={item}
                  loading={startingId === String(item.id)}
                  onPress={pickContact}
                />
              )}
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15, 23, 42, 0.5)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 8,
    paddingHorizontal: 16,
    minHeight: 320,
    ...Platform.select({
      ios: {
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.14,
        shadowRadius: 18,
      },
      android: { elevation: 18 },
      default: {},
    }),
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: BrandColors.text,
    marginBottom: 14,
  },
  groupEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8ecf4',
  },
  groupEntryPressed: { opacity: 0.85 },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BrandColors.primaryMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupEntryText: { flex: 1, fontSize: 16, fontWeight: '700', color: BrandColors.text },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5fb',
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 15,
    color: BrandColors.text,
  },
  list: { flexGrow: 0, maxHeight: 420 },
  listEmptyPad: { paddingVertical: 24 },
  skeletonBox: { gap: 4, paddingBottom: 12 },
  emptyText: { textAlign: 'center', color: '#94a3b8', fontSize: 14, paddingVertical: 20 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 4,
  },
  contactRowPressed: { backgroundColor: '#f8fafc', borderRadius: 12 },
  avatarWrap: { position: 'relative' },
  contactAvatarImg: { width: 48, height: 48, borderRadius: 24 },
  avatarSm: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: BrandColors.primaryMid },
  presenceDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#cbd5e1',
  },
  presenceDotOnline: { backgroundColor: '#22c55e' },
  contactMeta: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  contactName: { fontSize: 16, fontWeight: '700', color: BrandColors.text, flexShrink: 1 },
  contactSub: { marginTop: 2, fontSize: 12, color: '#64748b' },
});
