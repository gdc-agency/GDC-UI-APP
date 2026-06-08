import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  InteractionManager,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatAttachmentSheet } from '@/components/chat/chat-attachment-sheet';
import { ChatImagePreview } from '@/components/chat/chat-image-preview';
import { ChatImageSendPreview } from '@/components/chat/chat-image-send-preview';
import { ChatWallpaper } from '@/components/chat/chat-wallpaper';
import { CircularProgressRing } from '@/components/chat/circular-progress-ring';
import { CreateGroupFlow } from '@/components/chat/create-group-flow';
import { DocumentMessageCard } from '@/components/chat/document-message-card';
import { GroupAdminsOnlyBanner } from '@/components/chat/group-admins-only-banner';
import { MessageActionMenu } from '@/components/chat/message-action-menu';
import { NewChatPicker } from '@/components/chat/new-chat-picker';
import { TypingDots } from '@/components/chat/typing-dots';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { AnimatedBlock } from '@/components/ui/animated-block';
import { SkeletonGroup, SkeletonListRow } from '@/components/ui/skeleton';
import { useTheme } from '@/context/theme-context';
import { cn } from '@/theme/cn';
import { tw } from '@/theme/messages-tw';
import { useAuth } from '@/context/auth-context';
import useKeyboardOffset, { CHAT_COMPOSER_BAR_HEIGHT, CHAT_REPLY_STRIP_HEIGHT } from '@/hooks/use-keyboard-offset';
import { useChatChrome } from '@/context/chat-chrome-context';
import { useGdcInbox } from '@/context/gdc-inbox-context';
import { DELETED_BY_ME_TEXT, DELETED_MESSAGE_TEXT } from '@/utils/chat-deleted-message';
import {
  isChatDisplayNamePending,
  resolveChatPeerDisplayName
} from '@/utils/chat-directory';
import { isMessageUploading, statusIconColor, statusIconName } from '@/utils/chat-message-status';

const CHAT_IMAGE_BUBBLE_W = 260;
const CHAT_IMAGE_BUBBLE_H = 220;
import { consumePendingChatOpen, subscribePendingChatOpen } from '@/utils/chat-open-bus';
import { threadIdEquals } from '@/utils/chat-thread-inbox';
import { canComposeInChat } from '@/utils/group-compose-permissions';
import { groupSenderColor } from '@/utils/group-sender-style';
import { isAdminRole } from '@/utils/roles';

const currentTime = () =>
  new Date().toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

// NEW CODE ADDED FOR TIMESTAMP FORMATTING FIX — ISO + 24h strings → local 12h display
const normalizeTime = (timeValue) => {
  if (!timeValue) return currentTime();
  if (typeof timeValue !== 'string') return String(timeValue);
  if (/^\d{4}-\d{2}-\d{2}T/.test(timeValue)) {
    try {
      const d = new Date(timeValue);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
      }
    } catch {
      /* fall through */
    }
  }
  if (/am|pm/i.test(timeValue)) return timeValue;
  const match = timeValue.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return timeValue;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
};

const startOfLocalDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const formatMessageDateLabel = (iso) => {
  const date = iso ? new Date(String(iso)) : new Date();
  if (Number.isNaN(date.getTime())) return 'Older';
  const today = startOfLocalDay(new Date());
  const msgDay = startOfLocalDay(date);
  const diffDays = Math.round((today - msgDay) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
};

const messagePlainText = (item) => {
  if (!item) return '';
  if (item.deleted) return '';
  if (item.type === 'image') return 'Photo';
  if (item.type === 'file') return item.fileName ? `Document: ${item.fileName}` : 'Document';
  return String(item.text || '').trim();
};

const roleBadgeLabel = (role) => {
  const r = String(role || '').toLowerCase().replace(/\s+/g, '_');
  if (r === 'admin') return 'AD';
  if (r === 'hr') return 'HR';
  if (r === 'team_leader' || r === 'teamleader') return 'TL';
  if (r === 'employee') return 'EMP';
  return String(role || '').slice(0, 3).toUpperCase();
};

const FILTER_TABS = [
  { id: 'all', label: 'All', icon: 'view-grid-outline' },
  { id: 'unread', label: 'Unread', icon: 'email-outline' },
  { id: 'groups', label: 'Groups', icon: 'account-group-outline' },
];

function formatUnreadPill(count) {
  const n = Number(count) || 0;
  if (n <= 0) return '';
  if (n > 99) return '99+';
  return String(n);
}

function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

const ChatThreadRow = React.memo(function ChatThreadRow({ item, onOpen, onHide, resolvePeerProfile }) {
  const { colors } = useTheme();
  const msgs = Array.isArray(item.messages) ? item.messages : [];
  const last = msgs.length ? msgs[msgs.length - 1] : item.threadPreview;
  const peer = item.peerId && resolvePeerProfile ? resolvePeerProfile(item.peerId) : null;
  // NEW CODE ADDED FOR CHAT LIST NAME LOADING — show real name, not grey skeleton bar
  const displayName = resolveChatPeerDisplayName(item, peer);
  const nameLoading = isChatDisplayNamePending(displayName, item.peerId);
  const unreadCount = Number(item.unread) || 0;
  const hasUnread = unreadCount > 0;
  const previewText =
    last?.type === 'image'
      ? 'Photo'
      : last?.type === 'file'
        ? last.fileName
          ? `📎 ${last.fileName}`
          : 'Document'
        : last?.deleted
          ? last.me
            ? 'You deleted this message'
            : 'This message was deleted'
          : String(last?.text || '').trim() || (last ? '' : 'Start a conversation');
  const timeLabel = normalizeTime(last?.time);

  return (
    <Pressable
      className={cn(tw.chatCard, hasUnread && tw.chatCardUnread)}
      onPress={() => onOpen(item.id)}
      onLongPress={() => onHide(item.id)}>
      <View className={tw.chatCardInner}>
        <View>
          <ProfileAvatar
            uri={peer?.avatarUrl || item.listAvatarUrl}
            name={displayName || peer?.displayName}
            size={52}
          />
          {item.peerId ? (
            <View
              className={cn(tw.presenceDot, item.isOnline && tw.presenceDotOnline)}
              style={{ borderColor: item.isOnline ? colors.primaryMid : undefined }}
            />
          ) : null}
        </View>
        <View className={tw.chatBody}>
          <View className={tw.chatMainCol}>
            <View className={tw.chatCardTitleRow}>
              <Text
                numberOfLines={1}
                className={cn(tw.chatCardName, nameLoading && tw.chatCardNamePending)}>
                {displayName || '…'}
              </Text>
              {(item.headerRole || peer?.roleLabel) ? (
                <Text className={tw.roleBadge}>{roleBadgeLabel(item.headerRole || peer?.roleLabel)}</Text>
              ) : null}
            </View>
            <Text className={cn(tw.chatCardMsg, hasUnread && tw.chatCardMsgUnread)} numberOfLines={1}>
              {previewText}
            </Text>
          </View>
          <View className={tw.chatMetaRight}>
            <Text className={cn(tw.chatCardTime, hasUnread && tw.chatCardTimeUnread)}>{timeLabel}</Text>
            {hasUnread ? (
              <View className={tw.unreadBadge}>
                <Text className={tw.unreadText}>{formatUnreadPill(unreadCount)}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
});

const ChatMessageRow = React.memo(function ChatMessageRow({
  row,
  selectedMessageById,
  peerName,
  actionTargetId,
  onLongPress,
  onOpenMedia,
  isGroupChat = false,
  showSenderHeader = false,
  senderName = '',
  senderAvatarUrl = null,
  senderColor = '#1266f1',
  colors,
  chatTheme,
}) {
  if (row.kind === 'date') {
    return (
      <View className={tw.dateSeparatorWrap}>
        <View className={tw.dateSeparatorPill}>
          <Text className={tw.dateSeparatorText}>{row.label}</Text>
        </View>
      </View>
    );
  }
  const item = row.message;

  if (item.deleted) {
    const deletedLabel = item.me ? DELETED_BY_ME_TEXT : DELETED_MESSAGE_TEXT;
    return (
      <View className={cn(tw.msgRow, item.me ? tw.msgRowMe : tw.msgRowOther)}>
        <View className={tw.deletedBubble}>
          <MaterialCommunityIcons name="cancel" size={15} color="#8696a0" style={{ marginRight: 6 }} />
          <Text className={tw.deletedBubbleText}>{deletedLabel}</Text>
        </View>
      </View>
    );
  }

  const reply = item.replyToId ? selectedMessageById.get(String(item.replyToId)) : null;
  // NEW UI FIX FOR MESSAGE ACTION UI — invert bubble colors when message is selected (ref image)
  const isActionTarget = actionTargetId != null && String(item.id) === String(actionTargetId);
  const tickColor =
    isActionTarget && item.me
      ? item.status === 'seen'
        ? colors.primaryMid
        : '#64748b'
      : statusIconColor(item.status, !!item.me && !isActionTarget);
  const isGroupIncoming = isGroupChat && !item.me;
  const isImageBubble = item.type === 'image' && !!item.uri;
  const bubbleClassName = cn(
    tw.bubble,
    tw.bubbleFitContent,
    item.me ? tw.bubbleMe : tw.bubbleOther,
    isGroupIncoming && !isImageBubble && showSenderHeader && tw.bubbleGroupFirst,
    isGroupIncoming && !isImageBubble && !showSenderHeader && tw.bubbleGroupStack,
    isImageBubble && tw.bubbleImageOuter,
    isImageBubble && (item.me ? tw.bubbleImageMe : tw.bubbleImageOther),
    isImageBubble && isGroupIncoming && showSenderHeader && tw.bubbleImageGroupFirst,
    isImageBubble && isGroupIncoming && !showSenderHeader && tw.bubbleImageGroupStack,
    isActionTarget && item.me && tw.bubbleMeSelected,
    isActionTarget && !item.me && tw.bubbleOtherSelected,
    item.type === 'image' && tw.bubbleAttachment,
    item.type === 'image' && tw.imageBubble,
    isActionTarget && item.type === 'image' && tw.bubbleAttachmentSelected,
    isActionTarget && item.type === 'file' && tw.bubbleFileSelected
  );
  const isFileBubble = item.type === 'file';
  const imageUploading = isImageBubble && isMessageUploading(item);
  const bubbleContent = (
    <>
        {item.forwardedFrom ? (
          <View className={cn(tw.messageFlag, item.me && tw.messageFlagMe)}>
            <MaterialCommunityIcons
              name="share-outline"
              size={12}
              color={isActionTarget ? colors.primaryMid : item.me ? '#dbeafe' : '#64748b'}
            />
            <Text
              className={cn(tw.messageFlagText,
                item.me && tw.messageFlagTextMe,
                isActionTarget && tw.messageFlagTextSelected,)}>
              Forwarded
            </Text>
          </View>
        ) : null}
        {reply ? (
          <View
            className={cn(tw.replyQuote,
              item.me && tw.replyQuoteMe,
              isGroupIncoming && tw.replyQuoteGroup,
              isActionTarget && tw.replyQuoteSelected,
              isActionTarget && item.me && tw.replyQuoteMeSelected,)}>
            <Text
              className={cn(tw.replyQuoteTitle,
                item.me && tw.replyQuoteTitleMe,
                isGroupIncoming && tw.replyQuoteTitleGroup,
                isActionTarget && tw.replyQuoteTitleSelected,)}
              numberOfLines={1}>
              {reply.me ? 'You' : reply.authorName || peerName || senderName || 'Contact'}
            </Text>
            <Text
              className={cn(tw.replyQuoteText,
                item.me && tw.replyQuoteTextMe,
                isGroupIncoming && tw.replyQuoteTextGroup,
                isActionTarget && tw.replyQuoteTextSelected,)}
              numberOfLines={2}>
              {messagePlainText(reply) || 'Message'}
            </Text>
          </View>
        ) : null}
        {isImageBubble ? (
          <View
            className={cn(tw.imageBubbleWrap,
              item.me ? tw.imageBubbleWrapMe : tw.imageBubbleWrapOther,
              isGroupIncoming && showSenderHeader && tw.imageBubbleWrapGroupFirst,
              isGroupIncoming && !showSenderHeader && tw.imageBubbleWrapGroupStack,
              isActionTarget && tw.imageFrameSelected,)}
            style={{ width: CHAT_IMAGE_BUBBLE_W, maxWidth: CHAT_IMAGE_BUBBLE_W }}>
            <Image
              source={{ uri: String(item.uri) }}
              style={{ width: CHAT_IMAGE_BUBBLE_W, height: CHAT_IMAGE_BUBBLE_H }}
              contentFit="cover"
              transition={200}
              recyclingKey={String(item.id)}
              placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            />
            {imageUploading ? (
              <View className={tw.imageUploadOverlay}>
                <CircularProgressRing
                  progress={typeof item.uploadProgress === 'number' ? item.uploadProgress : 0}
                  size={52}
                  strokeWidth={4}
                  trackColor="rgba(255,255,255,0.35)"
                  progressColor="#fff"
                  labelColor="#fff"
                />
              </View>
            ) : null}
            <View className={tw.imageOverlayBar}>
              <Text className={tw.imageTimeText}>{normalizeTime(item.time)}</Text>
              {item.me ? (
                <MaterialCommunityIcons
                  name={statusIconName(item.status === 'sending' ? 'sent' : item.status)}
                  size={13}
                  color={statusIconColor(item.status, true)}
                />
              ) : null}
            </View>
          </View>
        ) : null}
        {item.type === 'file' ? (
          <DocumentMessageCard
            item={item}
            isActionTarget={isActionTarget}
            tickColor={tickColor}
            normalizeTime={normalizeTime}
            onLongPress={() => onLongPress(item)}
            showGroupSender={isGroupIncoming && showSenderHeader}
            groupSenderName={senderName}
            groupSenderColor={senderColor}
          />
        ) : null}
        {item.type !== 'file' && item.type !== 'image' ? (
          (() => {
            const timeLabel = normalizeTime(item.time);
            const textClassName = cn(
              tw.bubbleText,
              item.me && !isActionTarget && tw.bubbleTextMe,
              isActionTarget && tw.bubbleTextSelected
            );
            const metaRow = (
              <View className={tw.bubbleMetaInline}>
                <Text
                  className={cn(tw.msgTime,
                    item.me && !isActionTarget && tw.msgTimeMe,
                    !item.me && tw.msgTimeOther,
                    isActionTarget && tw.msgTimeSelected,)}>
                  {timeLabel}
                </Text>
                {item.me ? (
                  <MaterialCommunityIcons
                    name={statusIconName(item.status === 'sending' ? 'sent' : item.status)}
                    size={14}
                    color={tickColor}
                  />
                ) : null}
              </View>
            );
            return (
              <View className={tw.textBubbleBlock}>
                {isGroupIncoming && showSenderHeader ? (
                  <View className={tw.textBubbleRow}>
                    <Text className={textClassName}>
                      <Text className={cn(tw.groupNameInline)} style={{ color: senderColor || chatTheme.groupSenderName }}>
                        {senderName || 'Member'}{' '}
                      </Text>
                      {item.text}
                    </Text>
                    {metaRow}
                  </View>
                ) : (
                  <View className={tw.textBubbleRow}>
                    <Text className={cn(textClassName, tw.bubbleTextBody)}>{item.text}</Text>
                    {metaRow}
                  </View>
                )}
              </View>
            );
          })()
        ) : null}
    </>
  );
  const textOrImageBubble = (
    <Pressable
      className={bubbleClassName}
      onLongPress={() => onLongPress(item)}
      onPress={() => {
        if (item.type === 'image') onOpenMedia(item);
      }}>
      {bubbleContent}
    </Pressable>
  );

  const fileBubble = (
    <DocumentMessageCard
      item={item}
      isActionTarget={isActionTarget}
      tickColor={tickColor}
      normalizeTime={normalizeTime}
      onLongPress={() => onLongPress(item)}
      showGroupSender={isGroupIncoming && showSenderHeader}
      groupSenderName={senderName}
      groupSenderColor={senderColor}
    />
  );

  if (isGroupIncoming) {
    return (
      <View
        className={cn(tw.msgRow,
          tw.msgRowGroupOther,
          showSenderHeader && tw.msgRowGroupBlockStart,
          isActionTarget && tw.msgRowActionTarget,)}>
        <View className={tw.groupAvatarCol}>
          {showSenderHeader ? (
            <ProfileAvatar uri={senderAvatarUrl} name={senderName || 'Member'} size={36} />
          ) : (
            <View className={tw.groupSideAvatarGhost} />
          )}
        </View>
        <View className={tw.groupBubbleWrap}>
          {isFileBubble ? fileBubble : textOrImageBubble}
        </View>
      </View>
    );
  }

  return (
    <View
      className={cn(tw.msgRow,
        item.me ? tw.msgRowMe : tw.msgRowOther,
        isActionTarget && tw.msgRowActionTarget,)}>
      {isFileBubble ? fileBubble : textOrImageBubble}
    </View>
  );
});

export default function MessagesScreen() {
  const { colors, chatTheme } = useTheme();
  const homeTabBarStyle = useMemo(
    () => ({
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: 82,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      backgroundColor: colors.splashTop,
      borderTopWidth: 0,
      borderWidth: 1,
      borderColor: 'rgba(96,165,250,0.2)',
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 14,
      shadowColor: '#0b2c6a',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 12,
    }),
    [colors.splashTop],
  );
  const navigation = useNavigation();
  const { setInConversation } = useChatChrome();
  const { user } = useAuth();
  const inbox = useGdcInbox();
  const {
    threads,
    totalUnreadMessages,
    contacts,
    groupContacts,
    inboxLoading,
    directoryHydrated,
    inboxError,
    refreshThreads,
    openChat,
    closeChat,
    startDm,
    ensureDmChat,
    reloadContacts,
    hydrateChatParticipants,
    createGroup: submitGroupToApi,
    patchGroupFromServer,
    addGroupMembersToChat,
    removeGroupMembersFromChat,
    leaveGroup,
    deleteGroup,
    promoteGroupMemberAdmin,
    myUserId,
    sendText,
    sendAttachment,
    loadOlderMessages,
    groupScopeForRole,
    emitChatTyping,
    isPeerTyping,
    resolvePeerProfile,
    hideChatForMe,
    hideMessageForMe,
    deleteMessageForEveryone,
    acknowledgeChatRead,
    setActiveChatId,
    loadMessagesForChat,
  } = inbox;
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const keyboardOffset = useKeyboardOffset();
  const [selectedId, setSelectedId] = useState(null);
  const [listRefreshing, setListRefreshing] = useState(false);
  const reloadEmptyChatRef = useRef('');
  const [listSearch, setListSearch] = useState('');
  const [listFilter, setListFilter] = useState('all');
  const [draft, setDraft] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [attachOpen, setAttachOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [groupOpen, setGroupOpen] = useState(false);
  const [pendingSend, setPendingSend] = useState(null);
  const [pendingSending, setPendingSending] = useState(false);
  const [replyTarget, setReplyTarget] = useState(null);
  const [messageActionItem, setMessageActionItem] = useState(null);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState(/** @type {Set<string>} */ (new Set()));
  const [forwardItem, setForwardItem] = useState(null);
  const [groupCreated, setGroupCreated] = useState(false);
  const [createdGroupSummary, setCreatedGroupSummary] = useState(null);
  const msgListRef = useRef(null);
  const typingStopTimerRef = useRef(null);
  const olderLoadAtRef = useRef(0);
  const isNearBottomRef = useRef(true);
  const lastMsgTrackRef = useRef({ id: '', me: false });
  const headerStatusFade = useRef(new Animated.Value(1)).current;

  // NEW CODE ADDED FOR AUTO SCROLL ISSUE — wait for layout after new messages / keyboard
  const scrollToLatest = useCallback((animated = true, immediate = false) => {
    const run = () => {
      msgListRef.current?.scrollToEnd({ animated });
      if (Platform.OS === 'android') {
        setTimeout(() => msgListRef.current?.scrollToEnd({ animated: false }), 64);
      }
    };
    if (immediate) {
      requestAnimationFrame(run);
      return;
    }
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(run);
    });
  }, []);

  const roleTitle = useMemo(() => {
    if (isAdminRole(user?.role)) return 'Admin';
    if (user?.role === 'HR') return 'HR';
    if (user?.role === 'Team Leader') return 'Team Leader';
    return 'Employee';
  }, [user?.role]);

  const selected = useMemo(
    () => threads.find((thread) => threadIdEquals(thread.id, selectedId)) ?? null,
    [threads, selectedId],
  );

  /** DB/admin deletes remove threads server-side — close stale open chat without manual refresh. */
  useEffect(() => {
    if (!selectedId) return;
    const exists = threads.some((t) => threadIdEquals(t.id, selectedId));
    if (!exists) {
      setSelectedId(null);
      setActiveChatId(null);
      closeChat();
      setInConversation(false);
      setReplyTarget(null);
    }
  }, [threads, selectedId, setActiveChatId, closeChat, setInConversation]);

  /** After server sync clears cached messages, reload open chat from API (e.g. DB wipe). */
  useEffect(() => {
    if (!selectedId) {
      reloadEmptyChatRef.current = '';
      return;
    }
    const msgs = Array.isArray(selected?.messages) ? selected.messages : [];
    if (msgs.length > 0) {
      reloadEmptyChatRef.current = '';
      return;
    }
    const key = String(selectedId);
    if (reloadEmptyChatRef.current === key) return;
    reloadEmptyChatRef.current = key;
    void loadMessagesForChat(selectedId);
  }, [selectedId, selected?.messages, loadMessagesForChat]);

  useEffect(() => {
    if (!listRefreshing) return;
    reloadEmptyChatRef.current = '';
  }, [listRefreshing]);

  const onPullRefreshInbox = useCallback(async () => {
    setListRefreshing(true);
    try {
      await refreshThreads({ silent: true, syncFromServer: true });
      await reloadContacts();
    } finally {
      setListRefreshing(false);
    }
  }, [refreshThreads, reloadContacts]);

  const headerProfile = useMemo(() => {
    if (!selected) return { loading: false, name: '', avatarUrl: null, role: '' };
    const peer = selected.peerId ? resolvePeerProfile(selected.peerId) : null;
    const name = resolveChatPeerDisplayName(selected, peer);
    const loading = isChatDisplayNamePending(name, selected.peerId);
    const isGroup = selected?.server?.kind === 'group';
    const avatarUrl = isGroup
      ? selected.listAvatarUrl || null
      : peer?.avatarUrl || selected.listAvatarUrl || null;
    return {
      loading,
      name: name || '…',
      avatarUrl,
      role: selected.headerRole || peer?.roleLabel || '',
    };
  }, [resolvePeerProfile, selected]);

  const selectedMessageById = useMemo(() => {
    const map = new Map();
    const msgs = Array.isArray(selected?.messages) ? selected.messages : [];
    for (const msg of msgs) map.set(String(msg.id), msg);
    return map;
  }, [selected?.messages]);

  const isGroupChat = selected?.server?.kind === 'group';

  /** Load profile photos for everyone who has sent messages in this group. */
  useEffect(() => {
    if (!isGroupChat) return;
    const msgs = Array.isArray(selected?.messages) ? selected.messages : [];
    const authorIds = [
      ...new Set(
        msgs
          .map((m) => (m?.authorId != null ? String(m.authorId) : ''))
          .filter((id) => id && id !== String(myUserId)),
      ),
    ];
    if (authorIds.length) void hydrateChatParticipants(authorIds);
  }, [isGroupChat, selected?.messages, myUserId, hydrateChatParticipants]);

  const canComposeInSelectedChat = useMemo(
    () => canComposeInChat(selected?.server, myUserId),
    [selected?.server, myUserId],
  );

  const prevCanComposeRef = useRef(true);
  useEffect(() => {
    const prev = prevCanComposeRef.current;
    prevCanComposeRef.current = canComposeInSelectedChat;
    if (prev && !canComposeInSelectedChat) {
      setDraft('');
      setReplyTarget(null);
      setAttachOpen(false);
      if (selectedId) emitChatTyping(selectedId, false);
    }
  }, [canComposeInSelectedChat, emitChatTyping, selectedId]);

  const composerStackHeight = useMemo(() => {
    if (!canComposeInSelectedChat) return 52;
    let height = CHAT_COMPOSER_BAR_HEIGHT;
    if (replyTarget) height += CHAT_REPLY_STRIP_HEIGHT;
    return height;
  }, [canComposeInSelectedChat, replyTarget]);

  const TYPING_FOOTER_HEIGHT = 44;

  const listBottomReserve = useMemo(() => {
    const safeBottom = keyboardOffset > 0 ? keyboardOffset + 6 : Math.max(insets.bottom, 10);
    const typingPad = isPeerTyping && selected?.peerId ? TYPING_FOOTER_HEIGHT : 0;
    return composerStackHeight + safeBottom + typingPad;
  }, [composerStackHeight, keyboardOffset, insets.bottom, isPeerTyping, selected?.peerId]);

  const composerBottomStyle = useMemo(
    () => ({
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: keyboardOffset > 0 ? keyboardOffset : 0,
      paddingBottom: keyboardOffset > 0 ? 0 : Math.max(insets.bottom, 8),
    }),
    [keyboardOffset, insets.bottom],
  );

  useEffect(() => {
    if (keyboardOffset > 0) {
      scrollToLatest(true, true);
      const timer = setTimeout(() => scrollToLatest(true), 120);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [keyboardOffset, scrollToLatest]);

  useEffect(() => {
    if (!isPeerTyping || !selectedId) return undefined;
    isNearBottomRef.current = true;
    scrollToLatest(true, true);
    const timer = setTimeout(() => scrollToLatest(true), 80);
    return () => clearTimeout(timer);
  }, [isPeerTyping, selectedId, scrollToLatest]);

  const handleMessageListSizeChange = useCallback(() => {
    if (isNearBottomRef.current || isPeerTyping || keyboardOffset > 0) {
      scrollToLatest(!(keyboardOffset > 0 || isPeerTyping), true);
    }
  }, [isPeerTyping, keyboardOffset, scrollToLatest]);

  const messageRows = useMemo(() => {
    const rows = [];
    let lastLabel = '';
    const msgs = Array.isArray(selected?.messages) ? selected.messages : [];
    for (let i = 0; i < msgs.length; i += 1) {
      const msg = msgs[i];
      const label = formatMessageDateLabel(msg.createdAtIso);
      if (label !== lastLabel) {
        rows.push({ kind: 'date', id: `date-${msg.createdAtIso || msg.id}`, label });
        lastLabel = label;
      }
      const prev = i > 0 ? msgs[i - 1] : null;
      const authorId = msg.authorId ? String(msg.authorId) : '';
      const showSenderHeader =
        isGroupChat &&
        !msg.me &&
        authorId &&
        (!prev || prev.me || String(prev.authorId || '') !== authorId);
      const peer = authorId ? resolvePeerProfile(authorId) : null;
      const senderName = peer?.displayName || peer?.name || '';
      rows.push({
        kind: 'message',
        id: String(msg.id),
        message: msg,
        showSenderHeader,
        senderName,
        senderAvatarUrl: peer?.avatarUrl || null,
        senderColor: groupSenderColor(authorId),
      });
    }
    return rows;
  }, [isGroupChat, resolvePeerProfile, selected?.messages]);

  const messageListExtra = useMemo(() => {
    const last = messageRows[messageRows.length - 1];
    return `${selectedId || ''}:${messageRows.length}:${last?.id || ''}:${isPeerTyping ? 1 : 0}:${keyboardOffset}`;
  }, [messageRows, selectedId, isPeerTyping, keyboardOffset]);

  const totalUnread = Number(totalUnreadMessages) || 0;

  const filteredThreads = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    const filtered = threads.filter((thread) => {
      if (listFilter === 'unread' && !(Number(thread.unread) > 0)) return false;
      if (listFilter === 'groups' && thread?.server?.kind !== 'group') return false;
      if (!q) return true;
      const title = String(thread.listTitle || thread.name || '').toLowerCase();
      const role = String(thread.headerRole || '').toLowerCase();
      return title.includes(q) || role.includes(q);
    });
    return filtered.sort((a, b) => {
      const aMs = Number(a.threadPreview?.createdAtMs) || 0;
      const bMs = Number(b.threadPreview?.createdAtMs) || 0;
      return bMs - aMs;
    });
  }, [threads, listFilter, listSearch]);

  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((contact) => {
      const name = String(contact.displayName || contact.name || '').toLowerCase();
      const role = String(contact.roleLabel || contact.status || '').toLowerCase();
      return name.includes(q) || role.includes(q);
    });
  }, [contacts, contactSearch]);

  const openThread = useCallback(
    (threadId) => {
      const id = String(threadId);
      setActiveChatId(id);
      setInConversation(true);
      setSelectedId(id);
      void openChat(id);
    },
    [openChat, setActiveChatId, setInConversation],
  );

  const searchParams = useLocalSearchParams();
  useEffect(() => {
    const fromUrl = searchParams?.chatId ?? searchParams?.chat;
    const id = fromUrl != null ? String(fromUrl).trim() : consumePendingChatOpen();
    if (id) openThread(id);
  }, [openThread, searchParams?.chatId, searchParams?.chat]);

  useEffect(() => subscribePendingChatOpen((chatId) => openThread(chatId)), [openThread]);

  const sendMessage = async () => {
    if (!canComposeInSelectedChat) return;
    const text = draft.trim();
    if (!text || !selectedId) return;
    isNearBottomRef.current = true;
    const reply = replyTarget;
    setDraft('');
    setReplyTarget(null);
    emitChatTyping(selectedId, false);
    scrollToLatest(false);
    try {
      await sendText(selectedId, text, reply ? { replyToId: reply.id } : {});
      scrollToLatest(true);
    } catch (e) {
      Alert.alert('Message', e?.message ?? 'Send failed');
    }
  };

  const pickAndSendAttachment = async (mode) => {
    if (!canComposeInSelectedChat) return;
    try {
      if (mode === 'image') {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Photos', 'Allow photo library access to send images.');
          return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
          allowsMultipleSelection: false,
        });
        if (res.canceled || !res.assets?.length) return;
        const a = res.assets[0];
        const uri = a.uri;
        const mimeType = a.mimeType || 'image/jpeg';
        const fileName = a.fileName || `photo_${Date.now()}.jpg`;
        setPendingSend({ uri, mimeType, fileName, kind: 'image' });
        return;
      }
      const doc = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
      if (doc.canceled || !doc.assets?.length) return;
      if (!selectedId) {
        Alert.alert('Chat', 'Open a conversation before sending a file.');
        return;
      }
      const a = doc.assets[0];
      isNearBottomRef.current = true;
      try {
        await sendAttachment(
          selectedId,
          {
            uri: a.uri,
            mimeType: a.mimeType || 'application/octet-stream',
            fileName: a.name || 'document',
            sizeBytes: typeof a.size === 'number' ? a.size : undefined,
          },
          { onProgress: () => {} },
        );
        scrollToLatest(true);
      } catch (e) {
        Alert.alert('Send', e?.message ?? 'Upload failed');
      }
    } catch (e) {
      Alert.alert('Attachment', e?.message ?? 'Could not pick file');
    }
  };

  const confirmPendingSend = async () => {
    if (!canComposeInSelectedChat || !pendingSend || !selectedId || pendingSending) return;
    const payload = { ...pendingSend };
    isNearBottomRef.current = true;
    setPendingSending(true);
    try {
      await sendAttachment(
        selectedId,
        {
          uri: payload.uri,
          mimeType: payload.mimeType,
          fileName: payload.fileName,
          sizeBytes: payload.size,
        },
        { onProgress: () => {} },
      );
      setPendingSend(null);
      scrollToLatest(true);
    } catch (e) {
      Alert.alert('Send', e?.message ?? 'Upload failed');
    } finally {
      setPendingSending(false);
    }
  };

  const handleDraftChange = (text) => {
    setDraft(text);
    if (!selectedId) return;
    const typing = !!text.trim();
    emitChatTyping(selectedId, typing);
    if (typing) {
      isNearBottomRef.current = true;
      scrollToLatest(true, true);
    }
    if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = setTimeout(() => {
      typingStopTimerRef.current = null;
      emitChatTyping(selectedId, false);
    }, 1000);
  };

  useEffect(
    () => () => {
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    },
    [],
  );

  // NEW SOCKET LISTENER ADDED FOR TYPING STATUS — stop typing when leaving conversation
  useEffect(() => {
    if (!selectedId) return undefined;
    const chatId = selectedId;
    return () => {
      emitChatTyping(chatId, false);
    };
  }, [selectedId, emitChatTyping]);

  useEffect(() => {
    isNearBottomRef.current = true;
    lastMsgTrackRef.current = { id: '', me: false };
    setReplyTarget(null);
    setMessageActionItem(null);
    setMultiSelectMode(false);
    setSelectedMessageIds(new Set());
  }, [selectedId]);

  useEffect(() => {
    setInConversation(!!selectedId);
    return () => setInConversation(false);
  }, [selectedId, setInConversation]);

  useEffect(() => {
    if (!selectedId) return undefined;
    const t = setTimeout(() => scrollToLatest(false), 120);
    return () => clearTimeout(t);
  }, [selectedId, scrollToLatest]);

  const lastIncomingAckIdRef = useRef('');

  useEffect(() => {
    const msgs = Array.isArray(selected?.messages) ? selected.messages : [];
    if (!selectedId || !msgs.length) return;
    const last = msgs[msgs.length - 1];
    const id = String(last.id);
    const me = !!last.me;
    const prev = lastMsgTrackRef.current;
    const countChanged = msgs.length !== (prev.count ?? 0);
    const idChanged = id !== prev.id;
    if (!idChanged && !countChanged) return;
    lastMsgTrackRef.current = { id, me, count: msgs.length };
    const isIncoming = !me;
    if (isIncoming) {
      isNearBottomRef.current = true;
      scrollToLatest(true, true);
      if (idChanged || id !== lastIncomingAckIdRef.current) {
        lastIncomingAckIdRef.current = id;
        acknowledgeChatRead(selectedId);
      }
    } else if (isNearBottomRef.current && (idChanged || countChanged)) {
      scrollToLatest(true);
    }
  }, [acknowledgeChatRead, scrollToLatest, selected?.messages, selectedId]);

  useEffect(() => {
    if (!selectedId) lastIncomingAckIdRef.current = '';
  }, [selectedId]);

  const handleChatScroll = useCallback(
    (e) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
      isNearBottomRef.current = distanceFromBottom < 100;
      const y = contentOffset.y;
      if (y > 24) return;
      const now = Date.now();
      if (now - olderLoadAtRef.current < 900) return;
      olderLoadAtRef.current = now;
      if (selectedId) void loadOlderMessages(selectedId);
    },
    [loadOlderMessages, selectedId],
  );

  const renderMessageRow = useCallback(
    ({ item: row }) => (
      <ChatMessageRow
        row={row}
        selectedMessageById={selectedMessageById}
        peerName={headerProfile.name}
        actionTargetId={messageActionItem?.id != null ? String(messageActionItem.id) : null}
        onLongPress={setMessageActionItem}
        onOpenMedia={setPreviewItem}
        isGroupChat={isGroupChat}
        showSenderHeader={!!row.showSenderHeader}
        senderName={row.senderName || ''}
        senderAvatarUrl={row.senderAvatarUrl}
        senderColor={row.senderColor || '#1266f1'}
       
        colors={colors}
        chatTheme={chatTheme}
      />
    ),
    [headerProfile.name, isGroupChat, messageActionItem?.id, selectedMessageById, colors, chatTheme],
  );

  const startNewChat = useCallback(
    async (contact) => {
      const uid = contact?.id != null ? String(contact.id) : '';
      if (!uid) return;
      setNewChatOpen(false);
      setContactSearch('');
      setInConversation(true);
      try {
        const id = await ensureDmChat(uid);
        if (!id) throw new Error('Could not open chat');
        setActiveChatId(id);
        setSelectedId(id);
        await openChat(id);
      } catch (e) {
        setInConversation(false);
        Alert.alert('Chat', e?.message ?? 'Could not start chat');
        throw e;
      }
    },
    [ensureDmChat, openChat, setActiveChatId, setInConversation],
  );

  useEffect(() => {
    if (!newChatOpen) return;
    void reloadContacts();
  }, [newChatOpen, reloadContacts]);

  const confirmHideChat = useCallback(
    (threadId = selectedId) => {
      if (!threadId) return;
      Alert.alert('Delete chat', 'This only removes the chat from this device panel. Messages stay saved in the backend.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await hideChatForMe(threadId);
            if (threadId === selectedId) {
              closeChat();
              setActiveChatId(null);
              setSelectedId(null);
              setInConversation(false);
            }
          },
        },
      ]);
    },
    [closeChat, hideChatForMe, selectedId, setActiveChatId, setInConversation],
  );

  const renderThreadItem = useCallback(
    ({ item, index }) => (
      <AnimatedBlock index={index} baseDelay={120}>
        <ChatThreadRow item={item} onOpen={openThread} onHide={confirmHideChat} resolvePeerProfile={resolvePeerProfile} />
      </AnimatedBlock>
    ),
    [confirmHideChat, openThread, resolvePeerProfile],
  );

  const copyMessage = useCallback(async (item) => {
    const text = messagePlainText(item);
    if (!text) {
      Alert.alert('Copy', 'Nothing to copy for this message.');
      return;
    }
    await Clipboard.setStringAsync(text);
    setMessageActionItem(null);
  }, []);

  const handleMessageAction = useCallback(
    (actionKey, item) => {
      if (!item) return;
      if (actionKey === 'reply') {
        if (!canComposeInSelectedChat) return;
        setReplyTarget(item);
        return;
      }
      if (actionKey === 'forward') {
        setForwardItem(item);
        return;
      }
      if (actionKey === 'copy') {
        void copyMessage(item);
        return;
      }
      if (actionKey === 'select') {
        setMultiSelectMode(true);
        setSelectedMessageIds(new Set([String(item.id)]));
        return;
      }
      if (item.deleted) return;
      if (actionKey === 'hide') {
        if (selectedId && item.id) void hideMessageForMe(selectedId, item.id);
        return;
      }
      if (actionKey === 'everyone') {
        if (selectedId && item.id) void deleteMessageForEveryone(selectedId, item.id);
        return;
      }
    },
    [canComposeInSelectedChat, copyMessage, deleteMessageForEveryone, hideMessageForMe, selectedId],
  );

  const forwardMessageTo = async (contact) => {
    if (!forwardItem) return;
    const body = messagePlainText(forwardItem);
    if (!body) {
      Alert.alert('Forward', 'This message cannot be forwarded.');
      return;
    }
    try {
      const chatId = await startDm(contact.id);
      if (chatId) {
        await sendText(chatId, body, {
          forwardedFrom: {
            sourceChatTitle: selected?.headerName || selected?.listTitle || selected?.name || 'Chat',
            originalAuthorId: forwardItem.authorId || '',
            originalAuthorName: forwardItem.me ? user?.name || 'You' : selected?.headerName || '',
          },
        });
        setSelectedId(chatId);
      }
      setForwardItem(null);
      setMessageActionItem(null);
    } catch (e) {
      Alert.alert('Forward', e?.message ?? 'Could not forward message');
    }
  };

  const handleCreateGroupFromFlow = async ({
    name,
    memberIds,
    avatarUri,
    privacy,
    allowMembersToAdd,
    idempotencyKey,
  }) => {
    try {
      const privacyLocked =
        privacy === 'private' || privacy === 'restricted' || !allowMembersToAdd;
      const created = await submitGroupToApi({
        name,
        memberIds,
        scope: groupScopeForRole(),
        privacyLockedInvites: privacyLocked,
        adminsOnlyMessages: privacy === 'restricted',
        avatarUrl: avatarUri || undefined,
        idempotencyKey,
        openAfterCreate: false,
      });
      const id =
        created && typeof created === 'object' && created.id != null
          ? String(created.id)
          : String(created || '');
      const serverThread =
        created && typeof created === 'object' && created.thread && typeof created.thread === 'object'
          ? created.thread
          : null;
      const serverMemberIds = Array.isArray(serverThread?.memberIds)
        ? serverThread.memberIds.map(String)
        : memberIds.map(String);
      const pool = groupContacts.length ? groupContacts : contacts;
      setGroupOpen(false);
      InteractionManager.runAfterInteractions(() => {
        setCreatedGroupSummary({
          id,
          name: String(serverThread?.name || name || 'Group'),
          memberIds: serverMemberIds,
          members: serverMemberIds
            .map((mid) => pool.find((c) => String(c.id) === String(mid)))
            .filter(Boolean)
            .slice(0, 3),
        });
        setGroupCreated(true);
      });
      return id;
    } catch (e) {
      Alert.alert('Group', e?.message ?? 'Could not create group');
      throw e;
    }
  };

  useEffect(() => {
    const parent = navigation.getParent();
    const hiddenStyle = { display: 'none', height: 0, overflow: 'hidden' };
    if (selected) {
      parent?.setOptions({ tabBarStyle: hiddenStyle });
      navigation.setOptions({ tabBarStyle: hiddenStyle });
    } else {
      parent?.setOptions({ tabBarStyle: undefined });
      navigation.setOptions({ tabBarStyle: homeTabBarStyle });
    }
    return () => {
      parent?.setOptions({ tabBarStyle: undefined });
      navigation.setOptions({ tabBarStyle: homeTabBarStyle });
    };
  }, [navigation, selected]);

  return (
    <SafeAreaView className={cn(tw.safe, tw.safeRelative)} edges={['top']}>
      {selected ? (
        <View className={tw.safe}>
          <View className={tw.chatHeader}>
            <Pressable
              className={tw.backBtn}
              onPress={() => {
                if (selectedId) emitChatTyping(selectedId, false);
                closeChat();
                setActiveChatId(null);
                setSelectedId(null);
                setInConversation(false);
              }}>
              <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
            </Pressable>
            <ProfileAvatar
              uri={headerProfile.avatarUrl}
              name={headerProfile.name}
              size={36}
            />
            <View className={tw.headerMeta}>
              <View className={tw.headerTitleRow}>
                <Text
                  className={cn(tw.chatName, headerProfile.loading && tw.chatCardNamePending)}
                  numberOfLines={1}>
                  {headerProfile.name}
                </Text>
                {headerProfile.role ? (
                  <Text className={tw.roleBadge}>{roleBadgeLabel(headerProfile.role)}</Text>
                ) : null}
              </View>
              <Animated.View style={{ opacity: headerStatusFade }}>
                {isPeerTyping ? (
                  <View className={tw.headerStatusRow}>
                    <TypingDots color={colors.primaryMid} size={4} />
                    <Text className={tw.typingHint} numberOfLines={1}>
                      typing…
                    </Text>
                  </View>
                ) : selected.peerId && selected.isOnline ? (
                  <Text className={tw.onlineStatus} numberOfLines={1}>
                    online
                  </Text>
                ) : null}
              </Animated.View>
            </View>
            {isGroupChat ? (
              <Pressable
                className={tw.headerActionBtn}
                onPress={() => {
                  if (selectedId) {
                    router.push({ pathname: '/dashboard/group-info', params: { chatId: selectedId } });
                  }
                }}>
                <MaterialCommunityIcons name="dots-vertical" size={22} color={colors.text} />
              </Pressable>
            ) : (
              <Pressable className={tw.headerActionBtn} onPress={() => confirmHideChat(selected.id)}>
                <MaterialCommunityIcons name="trash-can-outline" size={19} color="#ef4444" />
              </Pressable>
            )}
          </View>

          <View className="flex-1">
          <ChatWallpaper className={tw.messagesWallpaper}>
          <FlatList
            ref={msgListRef}
            data={messageRows}
            extraData={messageListExtra}
            keyExtractor={(item) => item.id}
            className={tw.messagesList}
            contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 12, paddingBottom: listBottomReserve, gap: 4 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            onScroll={handleChatScroll}
            onContentSizeChange={handleMessageListSizeChange}
            scrollEventThrottle={16}
            removeClippedSubviews={Platform.OS === 'android'}
            initialNumToRender={18}
            maxToRenderPerBatch={12}
            windowSize={9}
            maintainVisibleContentPosition={
              Platform.OS === 'ios' ? { minIndexForVisible: 0, autoscrollToTopThreshold: 28 } : undefined
            }
            ListEmptyComponent={
              <View className={tw.emptyChatState}>
                <View className={tw.emptyChatIcon}>
                  <MaterialCommunityIcons name="message-text-outline" size={38} color={colors.primaryMid} />
                </View>
                <Text className={tw.emptyChatTitle}>No messages yet</Text>
                <Text className={tw.emptyChatSub}>
                  Start a conversation with {selected.headerName || selected.name || 'this contact'}
                </Text>
              </View>
            }
            ListFooterComponent={
              isPeerTyping && selected?.peerId ? (
                <View className={tw.typingFooterRow}>
                  <View className={tw.typingBubble}>
                    <TypingDots color={colors.textMuted} size={5} />
                  </View>
                </View>
              ) : null
            }
            renderItem={renderMessageRow}
          />
          </ChatWallpaper>

          <View style={composerBottomStyle}>
          {canComposeInSelectedChat && replyTarget ? (
            <View className={tw.replyComposer}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text className={tw.replyComposerTitle}>
                  Replying to {replyTarget.me ? 'your message' : headerProfile.name || 'message'}
                </Text>
                <Text className={tw.replyComposerText} numberOfLines={1}>
                  {messagePlainText(replyTarget) || 'Message'}
                </Text>
              </View>
              <Pressable onPress={() => setReplyTarget(null)}>
                <MaterialCommunityIcons name="close" size={18} color="#64748b" />
              </Pressable>
            </View>
          ) : null}

          {canComposeInSelectedChat ? (
            <View className={tw.composer}>
              <View className={tw.inputWrap}>
                <TextInput
                  value={draft}
                  onChangeText={handleDraftChange}
                  onSubmitEditing={sendMessage}
                  placeholder="Message"
                  placeholderTextColor={chatTheme.inputPlaceholder}
                  className={tw.input} style={{ paddingTop: Platform.OS === 'ios' ? 12 : 10, paddingBottom: Platform.OS === 'ios' ? 12 : 10, textAlignVertical: 'center', includeFontPadding: false }}
                  returnKeyType="default"
                  multiline
                  maxLength={8000}
                />
                <Pressable className={tw.inputIconBtn} onPress={() => setAttachOpen(true)} hitSlop={8}>
                  <MaterialCommunityIcons
                    name="paperclip"
                    size={24}
                    color={chatTheme.inputIcon}
                    style={{ transform: [{ rotate: '-45deg' }] }}
                  />
                </Pressable>
              </View>
              <Pressable
                className={tw.sendBtn}
                style={{
                  backgroundColor: draft.trim() ? chatTheme.sendBtn : chatTheme.sendBtnDisabled,
                }}
                onPress={sendMessage}
                disabled={!draft.trim()}>
                <MaterialCommunityIcons name="send" size={22} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <GroupAdminsOnlyBanner bottomInset={keyboardOffset > 0 ? 8 : 0} />
          )}
          </View>
          </View>
        </View>
      ) : (
        <View className={cn(tw.listScreen, tw.listScreenRelative, 'flex-1')} style={{ paddingBottom: tabBarHeight + 14 }}>
          <AnimatedBlock delay={0} className={tw.listHeader}>
            <View>
              <Text className={tw.listTitle}>Chats</Text>
              <Text className={tw.listSubTitle}>{roleTitle} conversation inbox</Text>
            </View>
          </AnimatedBlock>

          <AnimatedBlock delay={60} className={tw.searchWrap}>
            <MaterialCommunityIcons name="magnify" size={20} color="#94a3b8" />
            <TextInput
              value={listSearch}
              onChangeText={setListSearch}
              placeholder="Search conversations..."
              placeholderTextColor="#94a3b8"
              className={tw.searchInput}
            />
            <MaterialCommunityIcons name="tune-variant" size={20} color={colors.primaryMid} />
          </AnimatedBlock>

          <AnimatedBlock delay={90} className={tw.filterRow}>
            {FILTER_TABS.map(({ id, label, icon }) => {
              const active = listFilter === id;
              const showUnreadCount = id === 'unread' && totalUnread > 0;
              return (
                <Pressable
                  key={id}
                  className={cn(tw.filterChip, active && tw.filterChipActive)}
                  onPress={() => setListFilter(id)}>
                  <MaterialCommunityIcons
                    name={icon}
                    size={14}
                    color={active ? '#fff' : colors.primaryMid}
                  />
                  <Text className={cn(tw.filterChipText, active && tw.filterChipTextActive)}>{label}</Text>
                  {showUnreadCount ? (
                    <View className={cn(tw.filterUnreadBadge, active && tw.filterUnreadBadgeActive)}>
                      <Text className={cn(tw.filterUnreadBadgeText, active && tw.filterUnreadBadgeTextActive)}>
                        {formatUnreadPill(totalUnread)}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </AnimatedBlock>

          {inboxError ? (
            <Text className={cn(tw.emptyText)} style={{ paddingHorizontal: 16, marginBottom: 8 }}>{inboxError}</Text>
          ) : null}
          {((inboxLoading && threads.length === 0) || (!directoryHydrated && threads.length === 0)) ? (
            <SkeletonGroup>
              <View style={{ paddingHorizontal: 4, gap: 4, flex: 1 }}>
                {[0, 1, 2, 3, 4, 5].map((k) => (
                  <SkeletonListRow key={k} />
                ))}
              </View>
            </SkeletonGroup>
          ) : (
            <FlatList
              data={filteredThreads}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              style={{ flex: 1 }}
              contentContainerStyle={
                filteredThreads.length === 0
                  ? { flexGrow: 1, paddingBottom: tabBarHeight + 88 }
                  : { paddingBottom: tabBarHeight + 88 }
              }
              refreshControl={
                <RefreshControl refreshing={listRefreshing} onRefresh={() => void onPullRefreshInbox()} />
              }
              initialNumToRender={10}
              maxToRenderPerBatch={8}
              updateCellsBatchingPeriod={80}
              windowSize={7}
              removeClippedSubviews={Platform.OS !== 'web'}
              ListEmptyComponent={
                <View className={tw.emptyListState}>
                  <View className={tw.emptyChatIcon}>
                    <MaterialCommunityIcons name="message-reply-text-outline" size={34} color={colors.primaryMid} />
                  </View>
                  <Text className={tw.emptyChatTitle}>No chats found</Text>
                  <Text className={tw.emptyChatSub}>Start a new conversation to see it here.</Text>
                </View>
              }
              renderItem={renderThreadItem}
            />
          )}

          <Pressable
            className={cn(tw.chatFab)} style={{ bottom: tabBarHeight + 18 }}
            onPress={() => setNewChatOpen(true)}
            accessibilityLabel="New chat">
            <MaterialCommunityIcons name="message-plus" size={26} color="#fff" />
          </Pressable>
        </View>
      )}

      <NewChatPicker
        visible={newChatOpen}
        onClose={() => {
          setNewChatOpen(false);
          setContactSearch('');
        }}
        contacts={contacts}
        contactsLoading={inboxLoading}
        directoryHydrated={directoryHydrated}
        onSelectContact={startNewChat}
        onCreateGroup={() => {
          setNewChatOpen(false);
          setGroupOpen(true);
        }}
      />

      <CreateGroupFlow
        visible={groupOpen}
        onClose={() => setGroupOpen(false)}
        contacts={groupContacts.length ? groupContacts : contacts}
        contactsLoading={inboxLoading && !directoryHydrated}
        onCreate={handleCreateGroupFromFlow}
      />

      <Modal visible={!!groupCreated} transparent animationType="fade" onRequestClose={() => setGroupCreated(false)}>
        <View className={tw.successOverlay}>
          <View className={tw.successCard}>
            <View className={tw.successCheck}>
              <MaterialCommunityIcons name="check" size={38} color="#fff" />
            </View>
            <Text className={tw.successTitle}>Group Created!</Text>
            <Text className={tw.successSub}>{createdGroupSummary?.name || 'Group'} has been created successfully.</Text>
            <Text className={tw.selectedCount}>{createdGroupSummary?.memberIds?.length || 0} Members Added</Text>
            <View className={tw.successAvatars}>
              {(createdGroupSummary?.members || []).map((member) =>
                member.avatarUrl ? (
                  <Image key={member.id} source={{ uri: member.avatarUrl }} className={tw.successAvatarImg} contentFit="cover" />
                ) : (
                  <View key={member.id} className={tw.successAvatar}>
                    <Text className={tw.successAvatarText}>{initials(member.name)}</Text>
                  </View>
                ),
              )}
              <View className={tw.successAvatarAdd}>
                <MaterialCommunityIcons name="plus" size={18} color="#94a3b8" />
              </View>
            </View>
            <Pressable
              className={tw.successPrimaryBtn}
              onPress={() => {
                const id = createdGroupSummary?.id;
                setGroupCreated(false);
                if (id) {
                  void openChat(id);
                  setActiveChatId(id);
                  setSelectedId(id);
                  setInConversation(true);
                }
              }}>
              <Text className={tw.successPrimaryText}>Open Group</Text>
            </Pressable>
            <Pressable
              className={tw.successSecondaryBtn}
              onPress={() => {
                setGroupCreated(false);
                setSelectedId(null);
              }}>
              <Text className={tw.successSecondaryText}>Go to Chats</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <MessageActionMenu
        visible={!!messageActionItem}
        message={messageActionItem}
        canDeleteForEveryone={!!messageActionItem?.me}
        allowReply={canComposeInSelectedChat}
        onClose={() => setMessageActionItem(null)}
        onAction={handleMessageAction}
      />

      <Modal visible={!!forwardItem} transparent animationType="fade" onRequestClose={() => setForwardItem(null)}>
        <View className={tw.modalOverlay}>
          <View className={tw.modalCard}>
            <View className={tw.modalHead}>
              <Text className={tw.modalTitle}>Forward message</Text>
              <Pressable onPress={() => setForwardItem(null)}>
                <MaterialCommunityIcons name="close" size={20} color="#334155" />
              </Pressable>
            </View>
            <Text className={tw.forwardPreview} numberOfLines={2}>
              {messagePlainText(forwardItem) || 'Message'}
            </Text>
            <FlatList
              data={filteredContacts}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text className={tw.emptyText}>No contacts available to forward.</Text>}
              renderItem={({ item }) => (
                <Pressable className={tw.contactRow} onPress={() => forwardMessageTo(item)}>
                  {item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} className={tw.contactAvatarImg} contentFit="cover" />
                  ) : (
                    <View className={tw.avatarSm}>
                      <Text className={tw.avatarText}>{String(item.displayName || item.name || '?').slice(0, 1)}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View className={tw.chatCardTitleRow}>
                      <Text className={tw.contactName} numberOfLines={1}>
                        {item.displayName || item.name}
                      </Text>
                      {item.roleLabel ? <Text className={tw.roleBadge}>{roleBadgeLabel(item.roleLabel)}</Text> : null}
                    </View>
                    <Text className={tw.contactStatus}>{item.online ? 'Online' : 'Offline'}</Text>
                  </View>
                  <MaterialCommunityIcons name="send" size={18} color={colors.primaryMid} />
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>

      <ChatAttachmentSheet
        visible={attachOpen && canComposeInSelectedChat}
        onClose={() => setAttachOpen(false)}
        onPickGallery={() => void pickAndSendAttachment('image')}
        onPickFiles={() => void pickAndSendAttachment('file')}
      />

      <ChatImagePreview
        visible={!!previewItem && previewItem.type === 'image' && !!previewItem.uri}
        uri={previewItem?.uri ? String(previewItem.uri) : ''}
        onClose={() => setPreviewItem(null)}
      />

      <ChatImageSendPreview
        visible={!!pendingSend && pendingSend.kind === 'image'}
        uri={pendingSend?.uri ? String(pendingSend.uri) : ''}
        onClose={() => {
          if (!pendingSending) setPendingSend(null);
        }}
        onSend={() => void confirmPendingSend()}
        sending={pendingSending}
      />
    </SafeAreaView>
  );
}

