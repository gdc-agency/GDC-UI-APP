import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { useTheme } from '@/context/theme-context';
import { cn } from '@/theme/cn';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resolveGroupMember } from '@/utils/resolve-group-member';

const SHEET_SLIDE = 520;
const ROW_H = 58;

const MemberManageRow = memo(function MemberManageRow({ item, isAdmin, isMe, canManage, busy, onRemove, onPromote, colors }) {
  const line = item.displayName || item.name || item.id;
  return (
    <View className="h-[58px] flex-row items-center justify-between">
      <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} className="h-10 w-10 rounded-[20px]" contentFit="cover" />
        ) : (
          <View
            className="h-10 w-10 items-center justify-center rounded-[20px]"
            style={{ backgroundColor: colors.chipActiveBg }}>
            <Text className="font-extrabold text-primary-mid">{String(line).slice(0, 1)}</Text>
          </View>
        )}
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-semibold text-text" numberOfLines={1}>
            {line}
            {isMe ? ' (You)' : ''}
          </Text>
          {isAdmin ? <Text className="text-[11px] font-bold text-primary-mid">Admin</Text> : null}
        </View>
      </View>
      {canManage && !isMe ? (
        <View className="flex-row gap-1">
          {!isAdmin ? (
            <Pressable className="p-2" onPress={() => onPromote(item.id)} disabled={busy}>
              <MaterialCommunityIcons name="shield-plus-outline" size={20} color={colors.primaryMid} />
            </Pressable>
          ) : null}
          <Pressable className="p-2" onPress={() => onRemove(item.id)} disabled={busy}>
            <MaterialCommunityIcons name="account-remove-outline" size={20} color="#ef4444" />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
});

/**
 * @param {{
 *   visible: boolean;
 *   onClose: () => void;
 *   thread: Record<string, unknown> | null;
 *   myUserId: string;
 *   contacts: Array<Record<string, unknown>>;
 *   onPatch: (chatId: string, patches: Record<string, unknown>) => Promise<unknown>;
 *   onAddMembers: (chatId: string, memberIds: string[]) => Promise<unknown>;
 *   onRemoveMember: (chatId: string, memberIds: string[]) => Promise<unknown>;
 *   onLeave: (chatId: string) => Promise<void>;
 *   onDelete: (chatId: string) => Promise<void>;
 *   onPromote: (chatId: string, memberId: string) => Promise<unknown>;
 * }} props
 */
export function GroupSettingsSheet({
  visible,
  onClose,
  thread,
  myUserId,
  contacts,
  onPatch,
  onAddMembers,
  onRemoveMember,
  onLeave,
  onDelete,
  onPromote,
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;

  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [addPick, setAddPick] = useState(/** @type {Set<string>} */ (new Set()));

  const server = thread?.server && typeof thread.server === 'object' ? thread.server : {};
  const chatId = thread?.id != null ? String(thread.id) : '';
  const memberIds = Array.isArray(server.memberIds) ? server.memberIds.map(String) : [];
  const adminIds = Array.isArray(server.adminIds) ? server.adminIds.map(String) : [];
  const isAdmin =
    adminIds.includes(String(myUserId)) || String(server.createdById || '') === String(myUserId);

  useEffect(() => {
    if (!visible) {
      setAddOpen(false);
      setAddSearch('');
      setAddPick(new Set());
      return undefined;
    }
    setName(String(server.name || thread?.name || ''));
    progress.setValue(0);
    Animated.spring(progress, { toValue: 1, useNativeDriver: true, stiffness: 340, damping: 32 }).start();
    return undefined;
  }, [progress, visible, server.name, thread?.name]);

  const directory = useMemo(() => {
    const m = /** @type {Record<string, { displayName?: string; name?: string; roleLabel?: string; avatarUrl?: string | null }>} */ ({});
    for (const c of Array.isArray(contacts) ? contacts : []) {
      m[String(c.id)] = c;
    }
    return m;
  }, [contacts]);

  const members = useMemo(
    () => memberIds.map((id) => resolveGroupMember(id, directory)),
    [directory, memberIds],
  );

  const addCandidates = useMemo(() => {
    const q = addSearch.trim().toLowerCase();
    const set = new Set(memberIds);
    return (Array.isArray(contacts) ? contacts : [])
      .filter((c) => !set.has(String(c.id)))
      .filter((c) => {
        if (!q) return true;
        const n = String(c.displayName || c.name || '').toLowerCase();
        return n.includes(q);
      })
      .slice(0, 80);
  }, [contacts, memberIds, addSearch]);

  const closeAnimated = useCallback(() => {
    if (busy) return;
    Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: true }).start(({ finished }) => {
      if (finished) onClose();
    });
  }, [busy, onClose, progress]);

  const saveName = async () => {
    if (!chatId || !name.trim() || busy) return;
    setBusy(true);
    try {
      await onPatch(chatId, { name: name.trim() });
    } catch (e) {
      Alert.alert('Group', e?.message ?? 'Could not update');
    } finally {
      setBusy(false);
    }
  };

  const pickAvatar = async () => {
    if (!chatId || !isAdmin || busy) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (res.canceled || !res.assets?.[0]?.uri) return;
    setBusy(true);
    try {
      await onPatch(chatId, { avatarUrl: res.assets[0].uri });
    } catch (e) {
      Alert.alert('Group', e?.message ?? 'Could not update photo');
    } finally {
      setBusy(false);
    }
  };

  const confirmRemove = (memberId) => {
    Alert.alert('Remove member', 'Remove this person from the group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await onRemoveMember(chatId, [String(memberId)]);
          } catch (e) {
            Alert.alert('Group', e?.message ?? 'Could not remove');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const confirmLeave = () => {
    Alert.alert('Leave group', 'You will no longer receive messages from this group.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await onLeave(chatId);
            onClose();
          } catch (e) {
            Alert.alert('Group', e?.message ?? 'Could not leave');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert('Delete group', 'This cannot be undone. All messages will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await onDelete(chatId);
            onClose();
          } catch (e) {
            Alert.alert('Group', e?.message ?? 'Could not delete');
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const submitAdd = async () => {
    if (!addPick.size || busy) return;
    setBusy(true);
    try {
      await onAddMembers(chatId, [...addPick]);
      setAddOpen(false);
      setAddPick(new Set());
    } catch (e) {
      Alert.alert('Group', e?.message ?? 'Could not add members');
    } finally {
      setBusy(false);
    }
  };

  const sheetY = progress.interpolate({ inputRange: [0, 1], outputRange: [SHEET_SLIDE, 0] });
  const backdropOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  if (!visible || !thread) return null;

  const avatarUrl = server.avatarUrl || thread.listAvatarUrl;

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
          className="max-h-[92%] rounded-t-[22px] px-4"
          style={{
            backgroundColor: colors.modalSheetBg,
            paddingBottom: Math.max(insets.bottom, 12),
            transform: [{ translateY: sheetY }],
          }}>
          <View className="my-2.5 h-1 w-10 self-center rounded-pill bg-border-strong" />
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-lg font-extrabold text-text">Group info</Text>
            <Pressable onPress={closeAnimated} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={22} color="#64748b" />
            </Pressable>
          </View>

          {busy ? <ActivityIndicator className="my-2" color={colors.primaryMid} /> : null}

          <Pressable className="relative mb-3 self-center" onPress={pickAvatar} disabled={!isAdmin || busy}>
            {avatarUrl ? (
              <Image source={{ uri: String(avatarUrl) }} className="h-[88px] w-[88px] rounded-[44px]" contentFit="cover" />
            ) : (
              <View className="h-[88px] w-[88px] items-center justify-center rounded-[44px] bg-info-bg">
                <MaterialCommunityIcons name="account-group" size={36} color={colors.primaryMid} />
              </View>
            )}
            {isAdmin ? (
              <View className="absolute bottom-0 right-0 rounded-[14px] bg-primary-mid p-1.5">
                <MaterialCommunityIcons name="camera" size={14} color="#fff" />
              </View>
            ) : null}
          </Pressable>

          {isAdmin ? (
            <View className="mb-3 flex-row gap-2">
              <TextInput
                value={name}
                onChangeText={setName}
                className="flex-1 rounded-xl border border-border-strong bg-input-bg px-3 py-2.5 text-base text-text"
                placeholder="Group name"
              />
              <Pressable className="justify-center rounded-xl bg-primary-mid px-4" onPress={() => void saveName()} disabled={busy}>
                <Text className="font-bold text-white">Save</Text>
              </Pressable>
            </View>
          ) : (
            <Text className="mb-3 text-center text-xl font-extrabold text-text">{name || 'Group'}</Text>
          )}

          <Text className="mb-2 text-[13px] font-bold text-text-muted">{memberIds.length} members</Text>
          {isAdmin ? (
            <Pressable className="flex-row items-center gap-2 py-2.5" onPress={() => setAddOpen((v) => !v)} disabled={busy}>
              <MaterialCommunityIcons name="account-plus-outline" size={20} color={colors.primaryMid} />
              <Text className="font-bold text-primary-mid">Add members</Text>
            </Pressable>
          ) : null}

          {addOpen ? (
            <View className="mb-2.5 rounded-xl bg-surface-muted p-2.5">
              <TextInput
                value={addSearch}
                onChangeText={setAddSearch}
                placeholder="Search to add"
                className="mb-2 rounded-[10px] border border-border-strong bg-card p-2.5 text-text"
              />
              <FlatList
                data={addCandidates}
                keyExtractor={(item) => String(item.id)}
                style={{ maxHeight: 140 }}
                renderItem={({ item }) => {
                  const id = String(item.id);
                  const on = addPick.has(id);
                  return (
                    <Pressable
                      className="flex-row justify-between border-b border-border-strong py-2"
                      onPress={() =>
                        setAddPick((prev) => {
                          const n = new Set(prev);
                          if (n.has(id)) n.delete(id);
                          else n.add(id);
                          return n;
                        })
                      }>
                      <Text className="text-[15px] text-text">{item.displayName || item.name}</Text>
                      {on ? <MaterialCommunityIcons name="check-circle" size={18} color={colors.primaryMid} /> : null}
                    </Pressable>
                  );
                }}
              />
              <Pressable
                className={cn('mt-2 items-center rounded-[10px] bg-primary-mid py-2.5', addPick.size === 0 && 'opacity-50')}
                disabled={addPick.size === 0 || busy}
                onPress={() => void submitAdd()}>
                <Text className="font-bold text-white">Add {addPick.size || ''}</Text>
              </Pressable>
            </View>
          ) : null}

          <FlatList
            data={members}
            keyExtractor={(item) => String(item.id)}
            className="mb-3 max-h-[220px]"
            getItemLayout={(_d, i) => ({ length: ROW_H, offset: ROW_H * i, index: i })}
            renderItem={({ item }) => (
              <MemberManageRow
                item={item}
                isAdmin={adminIds.includes(String(item.id))}
                isMe={String(item.id) === String(myUserId)}
                canManage={isAdmin}
                busy={busy}
                colors={colors}
                onRemove={confirmRemove}
                onPromote={(id) => {
                  setBusy(true);
                  void onPromote(chatId, String(id))
                    .catch((e) => Alert.alert('Group', e?.message ?? 'Failed'))
                    .finally(() => setBusy(false));
                }}
              />
            )}
          />

          <Pressable className="flex-row items-center gap-2.5 border-t border-border-strong py-3.5" onPress={confirmLeave} disabled={busy}>
            <MaterialCommunityIcons name="logout" size={20} color="#ef4444" />
            <Text className="text-[15px] font-bold text-[#ef4444]">Leave group</Text>
          </Pressable>
          {isAdmin ? (
            <Pressable className="flex-row items-center gap-2.5 border-t border-border-strong py-3.5" onPress={confirmDelete} disabled={busy}>
              <MaterialCommunityIcons name="delete-outline" size={20} color="#ef4444" />
              <Text className="text-[15px] font-bold text-[#ef4444]">Delete group</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}
