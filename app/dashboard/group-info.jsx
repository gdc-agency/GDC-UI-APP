import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { GroupInfoScreen } from '@/components/chat/group-info-screen';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import { useGdcInbox } from '@/context/gdc-inbox-context';
import { ensureGdcSocketConnected } from '@/services/realtime/gdc-socket';

export default function GroupInfoRoute() {
  const { chatId } = useLocalSearchParams();
  const cid = chatId != null ? String(chatId) : '';
  const { token } = useAuth();
  const inbox = useGdcInbox();
  const {
    threads,
    myUserId,
    reloadContacts,
    patchGroupFromServer,
    addGroupMembersToChat,
    removeGroupMembersFromChat,
    leaveGroup,
    deleteGroup,
    promoteGroupMemberAdmin,
    demoteGroupMemberAdmin,
    groupContacts,
    onlineUserIds,
    userDirectoryById,
  } = inbox;

  const thread = useMemo(
    () => threads.find((t) => String(t.id) === cid) ?? null,
    [threads, cid],
  );

  /** Stay in chat socket room so group metadata updates arrive without refresh. */
  useEffect(() => {
    if (!cid || !token || !myUserId) return undefined;
    const sock = ensureGdcSocketConnected(token, myUserId);
    sock?.emit('joinRoom', cid);
    return () => {
      sock?.emit('leaveRoom', cid);
    };
  }, [cid, token, myUserId]);

  const directory = userDirectoryById || {};

  if (!cid) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>Missing group</Text>
      </View>
    );
  }

  if (!thread) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={BrandColors.primaryMid} />
      </View>
    );
  }

  return (
    <GroupInfoScreen
      thread={thread}
      myUserId={myUserId}
      directory={directory}
      addMemberPool={groupContacts}
      onlineUserIds={onlineUserIds}
      onBack={() => router.back()}
      onPatch={patchGroupFromServer}
      onAddMembers={addGroupMembersToChat}
      onRemoveMember={removeGroupMembersFromChat}
      onLeave={leaveGroup}
      onDelete={deleteGroup}
      onPromote={promoteGroupMemberAdmin}
      onDemote={demoteGroupMemberAdmin}
      onRefreshDirectory={reloadContacts}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f2f8' },
  err: { color: '#64748b' },
});
