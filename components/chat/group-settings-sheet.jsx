import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { BrandColors } from '@/constants/brand';
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

const MemberManageRow = memo(function MemberManageRow({ item, isAdmin, isMe, canManage, busy, onRemove, onPromote }) {
  const line = item.displayName || item.name || item.id;
  return (
    <View style={styles.memberRow}>
      <View style={styles.memberLeft}>
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={styles.avatarFb}>
            <Text style={styles.avatarLetter}>{String(line).slice(0, 1)}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.memberName} numberOfLines={1}>
            {line}
            {isMe ? ' (You)' : ''}
          </Text>
          {isAdmin ? <Text style={styles.adminTag}>Admin</Text> : null}
        </View>
      </View>
      {canManage && !isMe ? (
        <View style={styles.memberActions}>
          {!isAdmin ? (
            <Pressable style={styles.iconBtn} onPress={() => onPromote(item.id)} disabled={busy}>
              <MaterialCommunityIcons name="shield-plus-outline" size={20} color={BrandColors.primaryMid} />
            </Pressable>
          ) : null}
          <Pressable style={styles.iconBtn} onPress={() => onRemove(item.id)} disabled={busy}>
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
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeAnimated}>
          <Animated.View pointerEvents="none" style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </Pressable>
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 12), transform: [{ translateY: sheetY }] },
          ]}>
          <View style={styles.grabber} />
          <View style={styles.headRow}>
            <Text style={styles.title}>Group info</Text>
            <Pressable onPress={closeAnimated} hitSlop={10}>
              <MaterialCommunityIcons name="close" size={22} color="#64748b" />
            </Pressable>
          </View>

          {busy ? (
            <ActivityIndicator style={{ marginVertical: 8 }} color={BrandColors.primaryMid} />
          ) : null}

          <Pressable style={styles.avatarBlock} onPress={pickAvatar} disabled={!isAdmin || busy}>
            {avatarUrl ? (
              <Image source={{ uri: String(avatarUrl) }} style={styles.groupAvatar} contentFit="cover" />
            ) : (
              <View style={styles.groupAvatarFb}>
                <MaterialCommunityIcons name="account-group" size={36} color={BrandColors.primaryMid} />
              </View>
            )}
            {isAdmin ? (
              <View style={styles.editPhotoBadge}>
                <MaterialCommunityIcons name="camera" size={14} color="#fff" />
              </View>
            ) : null}
          </Pressable>

          {isAdmin ? (
            <View style={styles.nameRow}>
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.nameInput}
                placeholder="Group name"
              />
              <Pressable style={styles.saveBtn} onPress={() => void saveName()} disabled={busy}>
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.groupTitle}>{name || 'Group'}</Text>
          )}

          <Text style={styles.section}>{memberIds.length} members</Text>
          {isAdmin ? (
            <Pressable style={styles.addMemberBtn} onPress={() => setAddOpen((v) => !v)} disabled={busy}>
              <MaterialCommunityIcons name="account-plus-outline" size={20} color={BrandColors.primaryMid} />
              <Text style={styles.addMemberText}>Add members</Text>
            </Pressable>
          ) : null}

          {addOpen ? (
            <View style={styles.addPanel}>
              <TextInput
                value={addSearch}
                onChangeText={setAddSearch}
                placeholder="Search to add"
                style={styles.addSearch}
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
                      style={styles.addRow}
                      onPress={() =>
                        setAddPick((prev) => {
                          const n = new Set(prev);
                          if (n.has(id)) n.delete(id);
                          else n.add(id);
                          return n;
                        })
                      }>
                      <Text style={styles.addRowText}>{item.displayName || item.name}</Text>
                      {on ? <MaterialCommunityIcons name="check-circle" size={18} color={BrandColors.primaryMid} /> : null}
                    </Pressable>
                  );
                }}
              />
              <Pressable
                style={[styles.primaryBtn, addPick.size === 0 && styles.primaryBtnOff]}
                disabled={addPick.size === 0 || busy}
                onPress={() => void submitAdd()}>
                <Text style={styles.primaryBtnText}>Add {addPick.size || ''}</Text>
              </Pressable>
            </View>
          ) : null}

          <FlatList
            data={members}
            keyExtractor={(item) => String(item.id)}
            style={styles.memberList}
            getItemLayout={(_d, i) => ({ length: ROW_H, offset: ROW_H * i, index: i })}
            renderItem={({ item }) => (
              <MemberManageRow
                item={item}
                isAdmin={adminIds.includes(String(item.id))}
                isMe={String(item.id) === String(myUserId)}
                canManage={isAdmin}
                busy={busy}
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

          <Pressable style={styles.dangerBtn} onPress={confirmLeave} disabled={busy}>
            <MaterialCommunityIcons name="logout" size={20} color="#ef4444" />
            <Text style={styles.dangerText}>Leave group</Text>
          </Pressable>
          {isAdmin ? (
            <Pressable style={styles.dangerBtn} onPress={confirmDelete} disabled={busy}>
              <MaterialCommunityIcons name="delete-outline" size={20} color="#ef4444" />
              <Text style={styles.dangerText}>Delete group</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.5)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    maxHeight: '92%',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    marginVertical: 10,
  },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '800', color: BrandColors.text },
  avatarBlock: { alignSelf: 'center', marginBottom: 12, position: 'relative' },
  groupAvatar: { width: 88, height: 88, borderRadius: 44 },
  groupAvatarFb: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editPhotoBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: BrandColors.primaryMid,
    borderRadius: 14,
    padding: 6,
  },
  nameRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: BrandColors.primaryMid,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  groupTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 12, color: BrandColors.text },
  section: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 8 },
  addMemberBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  addMemberText: { color: BrandColors.primaryMid, fontWeight: '700' },
  addPanel: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 10, marginBottom: 10 },
  addSearch: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  addRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  addRowText: { fontSize: 15, color: BrandColors.text },
  memberList: { maxHeight: 220, marginBottom: 12 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: ROW_H,
  },
  memberLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontWeight: '800', color: BrandColors.primaryMid },
  memberName: { fontSize: 15, fontWeight: '600', color: BrandColors.text },
  adminTag: { fontSize: 11, color: BrandColors.primaryMid, fontWeight: '700' },
  memberActions: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 8 },
  primaryBtn: {
    backgroundColor: BrandColors.primaryMid,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnOff: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  dangerText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
});
