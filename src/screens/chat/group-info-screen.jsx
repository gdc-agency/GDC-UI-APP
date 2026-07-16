import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { GroupInfoScreen } from '@/components/chat/group-info-screen';
import { useAuth } from '@/context/auth-context';
import { useGdcInbox } from '@/context/gdc-inbox-context';
import { useTheme } from '@/context/theme-context';
import { ensureGdcSocketConnected } from '@/data/realtime/gdc-socket';

export default function GroupInfoRoute() {
  const { chatId } = useLocalSearchParams();
  const cid = chatId != null ? String(chatId) : '';
  const { token, user } = useAuth();
  const { colors } = useTheme();
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
      <View className="flex-1 items-center justify-center bg-page">
        <Text className="text-text-muted">Missing group</Text>
      </View>
    );
  }

  if (!thread) {
    return (
      <View className="flex-1 items-center justify-center bg-page">
        <ActivityIndicator color={colors.primaryMid} />
      </View>
    );
  }

  return (
    <GroupInfoScreen
      thread={thread}
      myUserId={myUserId}
      viewerUser={user}
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
