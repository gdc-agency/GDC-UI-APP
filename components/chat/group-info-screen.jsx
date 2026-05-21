import { GroupMemberActionSheet } from '@/components/chat/group-member-action-sheet';
import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { BrandColors } from '@/constants/brand';
import { groupMemberRole, resolveGroupMember } from '@/utils/resolve-group-member';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ROW_H = 72;

function matchesAddSearch(contact, query) {
  if (!query) return true;
  const q = query.toLowerCase();
  const name = String(contact?.displayName || contact?.name || '').toLowerCase();
  const role = String(contact?.roleLabel || contact?.status || '').toLowerCase();
  const gdc = String(contact?.gdc_id || contact?.gdcId || '').toLowerCase();
  const email = String(contact?.email || '').toLowerCase();
  return name.includes(q) || role.includes(q) || gdc.includes(q) || email.includes(q);
}

const RoleBadge = memo(function RoleBadge({ role }) {
  if (role === 'creator') {
    return (
      <View style={[styles.roleBadge, styles.badgeCreator]}>
        <MaterialCommunityIcons name="crown" size={11} color="#92400e" />
        <Text style={[styles.roleBadgeText, styles.badgeCreatorText]}>ADMIN</Text>
      </View>
    );
  }
  if (role === 'admin') {
    return (
      <View style={[styles.roleBadge, styles.badgeAdmin]}>
        <Text style={[styles.roleBadgeText, styles.badgeAdminText]}>ADMIN</Text>
      </View>
    );
  }
  return (
    <View style={[styles.roleBadge, styles.badgeMember]}>
      <Text style={[styles.roleBadgeText, styles.badgeMemberText]}>MEMBER</Text>
    </View>
  );
});

const MemberInfoRow = memo(function MemberInfoRow({ item, role, isMe, canManage, onMenu }) {
  const line = item.displayName || item.name || 'Member';
  const showMenu = canManage && !isMe && role !== 'creator' && typeof onMenu === 'function';

  return (
    <View style={styles.memberRow}>
      <View style={styles.avatarWrap}>
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={styles.avatarFb}>
            <Text style={styles.avatarLetter}>{String(line).slice(0, 1)}</Text>
          </View>
        )}
        <View style={[styles.presenceDot, item.online && styles.presenceOn]} />
      </View>
      <View style={styles.memberMeta}>
        <Text style={styles.memberName} numberOfLines={1}>
          {line}
          {isMe ? ' (You)' : ''}
        </Text>
        <Text style={styles.memberStatus}>{item.online ? 'Online' : 'Offline'}</Text>
      </View>
      <RoleBadge role={role} />
      {showMenu ? (
        <Pressable
          style={styles.menuBtn}
          onPress={() => onMenu(item, role)}
          disabled={item.busy}
          hitSlop={10}>
          <MaterialCommunityIcons name="dots-horizontal" size={22} color="#64748b" />
        </Pressable>
      ) : (
        <View style={styles.menuBtnSpacer} />
      )}
    </View>
  );
});

/**
 * Full-screen WhatsApp-style group info (not a modal).
 */
export function GroupInfoScreen({
  thread,
  myUserId,
  directory,
  addMemberPool,
  onlineUserIds,
  onBack,
  onPatch,
  onAddMembers,
  onRemoveMember,
  onLeave,
  onDelete,
  onPromote,
  onDemote,
  onRefreshDirectory,
}) {
  const server = thread?.server && typeof thread.server === 'object' ? thread.server : {};
  const chatId = thread?.id != null ? String(thread.id) : '';
  const memberIds = Array.isArray(server.memberIds) ? server.memberIds.map(String) : [];
  const adminIds = Array.isArray(server.adminIds) ? server.adminIds.map(String) : [];
  const createdById = server.createdById != null ? String(server.createdById) : '';
  const isAdmin =
    adminIds.includes(String(myUserId)) || createdById === String(myUserId);

  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [memberBusy, setMemberBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [addPick, setAddPick] = useState(/** @type {Set<string>} */ (new Set()));
  const [menuTarget, setMenuTarget] = useState(/** @type {{ item: Record<string, unknown>; role: string } | null} */ (null));

  useEffect(() => {
    void onRefreshDirectory?.();
  }, [onRefreshDirectory]);

  useEffect(() => {
    if (addOpen) void onRefreshDirectory?.();
  }, [addOpen, onRefreshDirectory]);

  useEffect(() => {
    setName(String(server.name || thread?.name || ''));
  }, [server.name, thread?.name]);

  const creatorProfile = useMemo(
    () => resolveGroupMember(createdById, directory, { onlineUserIds }),
    [createdById, directory, onlineUserIds],
  );

  const members = useMemo(() => {
    const sorted = [...memberIds].sort((a, b) => {
      if (a === createdById) return -1;
      if (b === createdById) return 1;
      if (adminIds.includes(a) && !adminIds.includes(b)) return -1;
      if (adminIds.includes(b) && !adminIds.includes(a)) return 1;
      return 0;
    });
    return sorted.map((id) => {
      const base = resolveGroupMember(id, directory, { onlineUserIds });
      const role = groupMemberRole(id, createdById, adminIds);
      return { ...base, role };
    });
  }, [memberIds, directory, onlineUserIds, createdById, adminIds]);

  const addPoolList = useMemo(() => {
    const seen = new Map();
    const push = (c) => {
      if (!c?.id) return;
      const id = String(c.id);
      if (seen.has(id)) return;
      seen.set(id, {
        id,
        displayName: c.displayName || c.name || '',
        name: c.name || c.displayName || '',
        roleLabel: c.roleLabel || c.status || '',
        avatarUrl: c.avatarUrl || null,
        gdc_id: c.gdc_id || c.gdcId,
        email: c.email,
      });
    };
    for (const c of Array.isArray(addMemberPool) ? addMemberPool : []) push(c);
    for (const c of Object.values(directory || {})) push(c);
    return [...seen.values()];
  }, [addMemberPool, directory]);

  const addCandidates = useMemo(() => {
    const q = addSearch.trim();
    const inGroup = new Set(memberIds);
    return addPoolList
      .filter((c) => !inGroup.has(String(c.id)))
      .filter((c) => matchesAddSearch(c, q))
      .slice(0, 120);
  }, [addPoolList, memberIds, addSearch]);

  const saveName = async () => {
    if (!chatId || !name.trim() || savingName) return;
    setSavingName(true);
    try {
      await onPatch(chatId, { name: name.trim() });
    } catch (e) {
      Alert.alert('Group', e?.message ?? 'Could not update');
    } finally {
      setSavingName(false);
    }
  };

  const pickAvatar = async () => {
    if (!chatId || !isAdmin || savingAvatar) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (res.canceled || !res.assets?.[0]?.uri) return;
    setSavingAvatar(true);
    try {
      await onPatch(chatId, { avatarUrl: res.assets[0].uri });
    } catch (e) {
      Alert.alert('Group', e?.message ?? 'Could not update photo');
    } finally {
      setSavingAvatar(false);
    }
  };

  const confirmRemove = (memberId) => {
    Alert.alert('Remove member', 'Remove this person from the group?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove from group',
        style: 'destructive',
        onPress: async () => {
          setMemberBusy(true);
          try {
            await onRemoveMember(chatId, [String(memberId)]);
          } catch (e) {
            Alert.alert('Group', e?.message ?? 'Could not remove');
          } finally {
            setMemberBusy(false);
          }
        },
      },
    ]);
  };

  const submitAdd = async () => {
    if (!addPick.size || memberBusy) return;
    setMemberBusy(true);
    try {
      await onAddMembers(chatId, [...addPick]);
      setAddOpen(false);
      setAddPick(new Set());
      setAddSearch('');
    } catch (e) {
      Alert.alert('Group', e?.message ?? 'Could not add members');
    } finally {
      setMemberBusy(false);
    }
  };

  const openMemberMenu = useCallback((item, role) => {
    setMenuTarget({ item, role });
  }, []);

  const closeMemberMenu = useCallback(() => setMenuTarget(null), []);

  const runPromote = useCallback(
    (memberId) => {
      setMemberBusy(true);
      void onPromote(chatId, memberId)
        .catch((e) => Alert.alert('Group', e?.message ?? 'Failed'))
        .finally(() => setMemberBusy(false));
    },
    [chatId, onPromote],
  );

  const runDemote = useCallback(
    (memberId) => {
      setMemberBusy(true);
      void onDemote(chatId, memberId)
        .catch((e) => Alert.alert('Group', e?.message ?? 'Failed'))
        .finally(() => setMemberBusy(false));
    },
    [chatId, onDemote],
  );

  const avatarUrl = server.avatarUrl || thread?.listAvatarUrl;

  const renderMember = useCallback(
    ({ item }) => (
      <MemberInfoRow
        item={{ ...item, busy: memberBusy }}
        role={item.role}
        isMe={String(item.id) === String(myUserId)}
        canManage={isAdmin}
        onMenu={openMemberMenu}
      />
    ),
    [isAdmin, memberBusy, myUserId, openMemberMenu],
  );

  const creatorName = creatorProfile.displayName || creatorProfile.name || 'Unknown';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={BrandColors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Group info</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Pressable style={styles.avatarBlock} onPress={pickAvatar} disabled={!isAdmin || savingAvatar}>
            {avatarUrl ? (
              <Image source={{ uri: String(avatarUrl) }} style={styles.groupAvatar} contentFit="cover" />
            ) : (
              <View style={styles.groupAvatarFb}>
                <MaterialCommunityIcons name="account-group" size={40} color={BrandColors.primaryMid} />
              </View>
            )}
            {savingAvatar ? (
              <View style={styles.avatarLoader}>
                <ActivityIndicator color="#fff" size="small" />
              </View>
            ) : isAdmin ? (
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
                editable={!savingName}
              />
              <Pressable
                style={[styles.saveBtn, savingName && styles.saveBtnDisabled]}
                onPress={() => void saveName()}
                disabled={savingName || !name.trim()}>
                {savingName ? (
                  <View style={styles.saveBtnInner}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.saveBtnText}>Saving…</Text>
                  </View>
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <Text style={styles.groupTitle}>{name || 'Group'}</Text>
          )}

          {createdById ? (
            <View style={styles.createdByRow}>
              <Text style={styles.createdBy}>
                Created by <Text style={styles.createdByName}>{creatorName}</Text>
              </Text>
              <View style={[styles.roleBadge, styles.badgeCreator]}>
                <MaterialCommunityIcons name="crown" size={11} color="#92400e" />
                <Text style={[styles.roleBadgeText, styles.badgeCreatorText]}>ADMIN</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>{memberIds.length} members</Text>
            {isAdmin ? (
              <Pressable
                style={styles.addMemberBtn}
                onPress={() => setAddOpen((v) => !v)}
                disabled={memberBusy}>
                <MaterialCommunityIcons name="account-plus-outline" size={20} color={BrandColors.primaryMid} />
                <Text style={styles.addMemberText}>Add members</Text>
              </Pressable>
            ) : null}
          </View>

          {addOpen ? (
            <View style={styles.addPanel}>
              <TextInput
                value={addSearch}
                onChangeText={setAddSearch}
                placeholder="Search by name, role, or ID"
                style={styles.addSearch}
                autoCorrect={false}
              />
              {addCandidates.length === 0 ? (
                <Text style={styles.addEmpty}>
                  {addSearch.trim() ? 'No contacts match your search.' : 'No more contacts to add.'}
                </Text>
              ) : null}
              {addCandidates.map((c) => {
                const id = String(c.id);
                const on = addPick.has(id);
                return (
                  <Pressable
                    key={id}
                    style={styles.addRow}
                    onPress={() =>
                      setAddPick((prev) => {
                        const n = new Set(prev);
                        if (n.has(id)) n.delete(id);
                        else n.add(id);
                        return n;
                      })
                    }>
                    <Text style={styles.addRowText}>{c.displayName || c.name}</Text>
                    {on ? (
                      <MaterialCommunityIcons name="check-circle" size={18} color={BrandColors.primaryMid} />
                    ) : null}
                  </Pressable>
                );
              })}
              <Pressable
                style={[styles.primaryBtn, addPick.size === 0 && styles.primaryBtnOff]}
                disabled={addPick.size === 0 || memberBusy}
                onPress={() => void submitAdd()}>
                {memberBusy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Add {addPick.size || ''} member(s)</Text>
                )}
              </Pressable>
            </View>
          ) : null}

          <FlatList
            data={members}
            keyExtractor={(item) => String(item.id)}
            scrollEnabled={false}
            renderItem={renderMember}
          />
        </View>

        <View style={styles.dangerSection}>
          <Pressable
            style={styles.dangerBtn}
            onPress={() => {
              Alert.alert('Leave group', 'You will no longer receive messages from this group.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Leave',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await onLeave(chatId);
                      onBack();
                    } catch (e) {
                      Alert.alert('Group', e?.message ?? 'Could not leave');
                    }
                  },
                },
              ]);
            }}>
            <MaterialCommunityIcons name="logout" size={20} color="#ef4444" />
            <Text style={styles.dangerText}>Leave group</Text>
          </Pressable>
          {isAdmin ? (
            <Pressable
              style={styles.dangerBtn}
              onPress={() => {
                Alert.alert('Delete group', 'This cannot be undone.', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await onDelete(chatId);
                        onBack();
                      } catch (e) {
                        Alert.alert('Group', e?.message ?? 'Could not delete');
                      }
                    },
                  },
                ]);
              }}>
              <MaterialCommunityIcons name="delete-outline" size={20} color="#ef4444" />
              <Text style={styles.dangerText}>Delete group</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <GroupMemberActionSheet
        visible={!!menuTarget}
        member={menuTarget?.item ?? null}
        role={menuTarget?.role === 'admin' ? 'admin' : 'member'}
        busy={memberBusy}
        onClose={closeMemberMenu}
        onRemove={() => {
          const id = menuTarget?.item?.id;
          if (id) confirmRemove(id);
        }}
        onMakeAdmin={() => {
          const id = menuTarget?.item?.id;
          if (id) runPromote(id);
        }}
        onMakeMember={() => {
          const id = menuTarget?.item?.id;
          if (id) runDemote(id);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f0f2f8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: { padding: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: BrandColors.text },
  scroll: { flex: 1 },
  hero: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  avatarBlock: { position: 'relative', marginBottom: 16 },
  groupAvatar: { width: 108, height: 108, borderRadius: 54 },
  groupAvatarFb: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editPhotoBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    backgroundColor: BrandColors.primaryMid,
    borderRadius: 16,
    padding: 8,
  },
  nameRow: { flexDirection: 'row', gap: 8, width: '100%', maxWidth: 400 },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fafbff',
  },
  saveBtn: {
    backgroundColor: BrandColors.primaryMid,
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: 'center',
    minWidth: 88,
  },
  saveBtnDisabled: { opacity: 0.85 },
  saveBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  groupTitle: { fontSize: 22, fontWeight: '800', color: BrandColors.text, textAlign: 'center' },
  createdByRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  createdBy: { fontSize: 14, color: '#64748b' },
  createdByName: { fontWeight: '700', color: BrandColors.text },
  sectionCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#64748b' },
  addMemberBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addMemberText: { color: BrandColors.primaryMid, fontWeight: '700', fontSize: 14 },
  addPanel: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 10, marginBottom: 12 },
  addSearch: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  addEmpty: { fontSize: 13, color: '#94a3b8', paddingVertical: 8, textAlign: 'center' },
  addRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  addRowText: { fontSize: 15, color: BrandColors.text, flex: 1 },
  primaryBtn: {
    backgroundColor: BrandColors.primaryMid,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnOff: { opacity: 0.5 },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
    minHeight: ROW_H,
  },
  avatarWrap: { position: 'relative', marginRight: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFb: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontWeight: '800', fontSize: 18, color: BrandColors.primaryMid },
  presenceDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#94a3b8',
    borderWidth: 2,
    borderColor: '#fff',
  },
  presenceOn: { backgroundColor: '#22c55e' },
  memberMeta: { flex: 1, minWidth: 0 },
  memberName: { fontSize: 16, fontWeight: '700', color: BrandColors.text },
  memberStatus: { fontSize: 12, color: '#64748b', marginTop: 2 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
  },
  badgeCreator: { backgroundColor: '#fef9c3' },
  badgeAdmin: { backgroundColor: '#eff6ff' },
  badgeMember: { backgroundColor: '#f1f5f9' },
  roleBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  badgeCreatorText: { color: '#92400e' },
  badgeAdminText: { color: BrandColors.primaryMid },
  badgeMemberText: { color: '#64748b' },
  menuBtn: { padding: 6, marginLeft: 2 },
  menuBtnSpacer: { width: 34 },
  dangerSection: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
  },
  dangerText: { color: '#ef4444', fontWeight: '700', fontSize: 15 },
});
