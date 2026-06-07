import { GroupMemberActionSheet } from '@/components/chat/group-member-action-sheet';
import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { useTheme } from '@/context/theme-context';
import { cn } from '@/theme/cn';
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
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
      <View className="mr-1 flex-row items-center gap-1 rounded-lg bg-[#fef9c3] px-2 py-1">
        <MaterialCommunityIcons name="crown" size={11} color="#92400e" />
        <Text className="text-[10px] font-extrabold tracking-wide text-[#92400e]">ADMIN</Text>
      </View>
    );
  }
  if (role === 'admin') {
    return (
      <View className="mr-1 flex-row items-center gap-1 rounded-lg bg-info-bg px-2 py-1">
        <Text className="text-[10px] font-extrabold tracking-wide text-primary-mid">ADMIN</Text>
      </View>
    );
  }
  return (
    <View className="mr-1 flex-row items-center gap-1 rounded-lg bg-surface-muted px-2 py-1">
      <Text className="text-[10px] font-extrabold tracking-wide text-text-muted">MEMBER</Text>
    </View>
  );
});

const MemberInfoRow = memo(function MemberInfoRow({ item, role, isMe, canManage, onMenu, colors }) {
  const line = item.displayName || item.name || 'Member';
  const showMenu = canManage && !isMe && role !== 'creator' && typeof onMenu === 'function';

  return (
    <View className="min-h-[72px] flex-row items-center border-b border-border-light py-2.5">
      <View className="relative mr-3">
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} className="h-12 w-12 rounded-full" contentFit="cover" />
        ) : (
          <View
            className="h-12 w-12 items-center justify-center rounded-full"
            style={{ backgroundColor: colors.chipActiveBg }}>
            <Text className="text-lg font-extrabold text-primary-mid">{String(line).slice(0, 1)}</Text>
          </View>
        )}
        <View
          className={cn(
            'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-text-secondary',
            item.online && 'bg-green-500',
          )}
        />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-base font-bold text-text" numberOfLines={1}>
          {line}
          {isMe ? ' (You)' : ''}
        </Text>
        <Text className="mt-0.5 text-xs text-text-muted">{item.online ? 'Online' : 'Offline'}</Text>
      </View>
      <RoleBadge role={role} />
      {showMenu ? (
        <Pressable className="ml-0.5 p-1.5" onPress={() => onMenu(item, role)} disabled={item.busy} hitSlop={10}>
          <MaterialCommunityIcons name="dots-horizontal" size={22} color="#64748b" />
        </Pressable>
      ) : (
        <View className="w-[34px]" />
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
  const { colors } = useTheme();

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
        colors={colors}
      />
    ),
    [colors, isAdmin, memberBusy, myUserId, openMemberMenu],
  );

  const creatorName = creatorProfile.displayName || creatorProfile.name || 'Unknown';

  return (
    <SafeAreaView className="flex-1 bg-page" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between border-b border-border-strong bg-card px-2 py-2.5">
        <Pressable className="p-2" onPress={onBack} hitSlop={12}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text} />
        </Pressable>
        <Text className="text-[17px] font-extrabold text-text">Group info</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
        <View className="mb-2.5 items-center bg-card px-4 py-6">
          <Pressable className="relative mb-4" onPress={pickAvatar} disabled={!isAdmin || savingAvatar}>
            {avatarUrl ? (
              <Image source={{ uri: String(avatarUrl) }} className="h-[108px] w-[108px] rounded-[54px]" contentFit="cover" />
            ) : (
              <View className="h-[108px] w-[108px] items-center justify-center rounded-[54px] bg-info-bg">
                <MaterialCommunityIcons name="account-group" size={40} color={colors.primaryMid} />
              </View>
            )}
            {savingAvatar ? (
              <View className="absolute inset-0 items-center justify-center rounded-[54px] bg-black/35">
                <ActivityIndicator color="#fff" size="small" />
              </View>
            ) : isAdmin ? (
              <View className="absolute bottom-1 right-1 rounded-2xl bg-primary-mid p-2">
                <MaterialCommunityIcons name="camera" size={14} color="#fff" />
              </View>
            ) : null}
          </Pressable>

          {isAdmin ? (
            <View className="w-full max-w-[400px] flex-row gap-2">
              <TextInput
                value={name}
                onChangeText={setName}
                className="flex-1 rounded-xl border border-border-strong bg-input-bg px-3.5 py-3 text-base text-text"
                placeholder="Group name"
                editable={!savingName}
              />
              <Pressable
                className={cn(
                  'min-w-[88px] items-center justify-center rounded-xl bg-primary-mid px-[18px]',
                  savingName && 'opacity-85',
                )}
                onPress={() => void saveName()}
                disabled={savingName || !name.trim()}>
                {savingName ? (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator color="#fff" size="small" />
                    <Text className="text-[15px] font-bold text-white">Saving…</Text>
                  </View>
                ) : (
                  <Text className="text-[15px] font-bold text-white">Save</Text>
                )}
              </Pressable>
            </View>
          ) : (
            <Text className="text-center text-[22px] font-extrabold text-text">{name || 'Group'}</Text>
          )}

          {createdById ? (
            <View className="mt-2.5 flex-row flex-wrap items-center justify-center gap-2">
              <Text className="text-sm text-text-muted">
                Created by <Text className="font-bold text-text">{creatorName}</Text>
              </Text>
              <View className="flex-row items-center gap-1 rounded-lg bg-[#fef9c3] px-2 py-1">
                <MaterialCommunityIcons name="crown" size={11} color="#92400e" />
                <Text className="text-[10px] font-extrabold tracking-wide text-[#92400e]">ADMIN</Text>
              </View>
            </View>
          ) : null}
        </View>

        <View className="mx-3 mb-3 rounded-2xl bg-card p-3.5">
          <View className="mb-2.5 flex-row items-center justify-between">
            <Text className="text-sm font-extrabold text-text-muted">{memberIds.length} members</Text>
            {isAdmin ? (
              <Pressable className="flex-row items-center gap-1.5" onPress={() => setAddOpen((v) => !v)} disabled={memberBusy}>
                <MaterialCommunityIcons name="account-plus-outline" size={20} color={colors.primaryMid} />
                <Text className="text-sm font-bold text-primary-mid">Add members</Text>
              </Pressable>
            ) : null}
          </View>

          {addOpen ? (
            <View className="mb-3 rounded-xl bg-surface-muted p-2.5">
              <TextInput
                value={addSearch}
                onChangeText={setAddSearch}
                placeholder="Search by name, role, or ID"
                className="mb-2 rounded-[10px] border border-border-strong bg-input-bg p-2.5 text-text"
                autoCorrect={false}
              />
              {addCandidates.length === 0 ? (
                <Text className="py-2 text-center text-[13px] text-text-secondary">
                  {addSearch.trim() ? 'No contacts match your search.' : 'No more contacts to add.'}
                </Text>
              ) : null}
              {addCandidates.map((c) => {
                const id = String(c.id);
                const on = addPick.has(id);
                return (
                  <Pressable
                    key={id}
                    className="flex-row items-center justify-between border-b border-border-strong py-2"
                    onPress={() =>
                      setAddPick((prev) => {
                        const n = new Set(prev);
                        if (n.has(id)) n.delete(id);
                        else n.add(id);
                        return n;
                      })
                    }>
                    <Text className="flex-1 text-[15px] text-text">{c.displayName || c.name}</Text>
                    {on ? (
                      <MaterialCommunityIcons name="check-circle" size={18} color={colors.primaryMid} />
                    ) : null}
                  </Pressable>
                );
              })}
              <Pressable
                className={cn('mt-2 items-center rounded-[10px] bg-primary-mid py-3', addPick.size === 0 && 'opacity-50')}
                disabled={addPick.size === 0 || memberBusy}
                onPress={() => void submitAdd()}>
                {memberBusy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="font-bold text-white">Add {addPick.size || ''} member(s)</Text>
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

        <View className="mx-3 mb-6 overflow-hidden rounded-2xl bg-card">
          <Pressable
            className="flex-row items-center gap-3 border-b border-border-light px-4 py-4"
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
            <Text className="text-[15px] font-bold text-[#ef4444]">Leave group</Text>
          </Pressable>
          {isAdmin ? (
            <Pressable
              className="flex-row items-center gap-3 px-4 py-4"
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
              <Text className="text-[15px] font-bold text-[#ef4444]">Delete group</Text>
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
