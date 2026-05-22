import { ChatIncomingNotice } from '@/components/chat/chat-incoming-notice';
import { useGdcInbox } from '@/context/gdc-inbox-context';
import { publishPendingChatOpen } from '@/utils/chat-open-bus';
import { threadIdEquals } from '@/utils/chat-thread-inbox';
import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * App-wide banner when a new message arrives (any tab except open conversation).
 */
export function GlobalChatNotice() {
  const insets = useSafeAreaInsets();
  const { incomingNotice, dismissIncomingNotice, activeChatId } = useGdcInbox();

  if (
    !incomingNotice ||
    (activeChatId && threadIdEquals(activeChatId, incomingNotice.chatId))
  ) {
    return null;
  }

  return (
    <View style={[styles.host, { top: insets.top + 6 }]} pointerEvents="box-none">
      <ChatIncomingNotice
        title={incomingNotice.title}
        preview={incomingNotice.preview}
        senderName={incomingNotice.senderName}
        onPress={() => {
          dismissIncomingNotice();
          publishPendingChatOpen(incomingNotice.chatId);
          router.push('/dashboard/(tabs)/messages');
        }}
        onDismiss={() => dismissIncomingNotice()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 200,
    elevation: 12,
  },
});
