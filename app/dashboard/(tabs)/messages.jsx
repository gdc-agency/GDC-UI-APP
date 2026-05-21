import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Alert,
  FlatList,
  InteractionManager,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatAttachmentSheet } from '@/components/chat/chat-attachment-sheet';
import { ChatImagePreview } from '@/components/chat/chat-image-preview';
import { ChatImageSendPreview } from '@/components/chat/chat-image-send-preview';
import { GroupAdminsOnlyBanner } from '@/components/chat/group-admins-only-banner';
import { CreateGroupFlow } from '@/components/chat/create-group-flow';
import { NewChatPicker } from '@/components/chat/new-chat-picker';
import { groupSenderColor } from '@/utils/group-sender-style';
import { DELETED_BY_ME_TEXT, DELETED_MESSAGE_TEXT } from '@/utils/chat-deleted-message';
import { ChatWallpaper } from '@/components/chat/chat-wallpaper';
import { ChatTheme } from '@/constants/chat-theme';
import { DocumentMessageCard } from '@/components/chat/document-message-card';
import { MessageActionMenu } from '@/components/chat/message-action-menu';
import { TypingDots } from '@/components/chat/typing-dots';
import { SkeletonGroup, SkeletonListRow } from '@/components/ui/skeleton';
import { BrandColors } from '@/constants/brand';
import { useChatChrome } from '@/context/chat-chrome-context';
import { useAuth } from '@/context/auth-context';
import { useGdcInbox } from '@/context/gdc-inbox-context';
import { isAdminRole } from '@/utils/roles';
import {
  formatFileSize,
  isChatDisplayNamePending,
  resolveChatPeerDisplayName,
} from '@/utils/chat-directory';
import { statusIconColor, statusIconName } from '@/utils/chat-message-status';
import { canComposeInChat } from '@/utils/group-compose-permissions';

const HOME_TAB_BAR_STYLE = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  height: 82,
  borderTopLeftRadius: 26,
  borderTopRightRadius: 26,
  backgroundColor: BrandColors.splashTop,
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
};

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

function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

const ChatThreadRow = React.memo(function ChatThreadRow({ item, onOpen, onHide, resolvePeerProfile }) {
  const msgs = Array.isArray(item.messages) ? item.messages : [];
  const last = msgs.length ? msgs[msgs.length - 1] : item.threadPreview;
  const peer = item.peerId && resolvePeerProfile ? resolvePeerProfile(item.peerId) : null;
  // NEW CODE ADDED FOR CHAT LIST NAME LOADING — show real name, not grey skeleton bar
  const displayName = resolveChatPeerDisplayName(item, peer);
  const nameLoading = isChatDisplayNamePending(displayName, item.peerId);
  const avatarLetter = (displayName || peer?.displayName || '?').trim().slice(0, 1).toUpperCase() || '?';
  const unreadCount = Number(item.unread) || 0;
  const hasUnread = unreadCount > 0;
  const previewText =
    last?.type === 'image'
      ? 'Photo'
      : last?.type === 'file'
        ? last.fileName
          ? `📎 ${last.fileName}`
          : 'Document'
        : last?.text ?? 'Start a conversation';

  return (
    <Pressable style={styles.chatCard} onPress={() => onOpen(item.id)} onLongPress={() => onHide(item.id)}>
      <View>
        {peer?.avatarUrl || item.listAvatarUrl ? (
          <Image
            source={{ uri: peer?.avatarUrl || item.listAvatarUrl }}
            style={styles.avatarImg}
            contentFit="cover"
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>
        )}
        {item.peerId ? <View style={[styles.presenceDot, item.isOnline && styles.presenceDotOnline]} /> : null}
      </View>
      <View style={styles.chatBody}>
        <View style={styles.chatTop}>
          <View style={styles.chatCardTitleRow}>
            <Text
              numberOfLines={1}
              style={[styles.chatCardName, nameLoading && styles.chatCardNamePending]}>
              {displayName || '…'}
            </Text>
            {(item.headerRole || peer?.roleLabel) ? (
              <Text style={styles.roleBadge}>{roleBadgeLabel(item.headerRole || peer?.roleLabel)}</Text>
            ) : null}
          </View>
          <Text style={[styles.chatCardTime, hasUnread && styles.chatCardTimeUnread]}>
            {normalizeTime(last?.time)}
          </Text>
        </View>
        <Text style={[styles.chatCardMsg, hasUnread && styles.chatCardMsgUnread]} numberOfLines={1}>
          {previewText}
        </Text>
      </View>
      {hasUnread ? (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      ) : null}
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
}) {
  if (row.kind === 'date') {
    return (
      <View style={styles.dateSeparatorWrap}>
        <View style={styles.dateSeparatorPill}>
          <Text style={styles.dateSeparatorText}>{row.label}</Text>
        </View>
      </View>
    );
  }
  const item = row.message;

  if (item.deleted) {
    const deletedLabel = item.me ? DELETED_BY_ME_TEXT : DELETED_MESSAGE_TEXT;
    return (
      <View style={[styles.msgRow, item.me ? styles.msgRowMe : styles.msgRowOther]}>
        <View style={styles.deletedBubble}>
          <MaterialCommunityIcons name="cancel" size={15} color="#8696a0" style={{ marginRight: 6 }} />
          <Text style={styles.deletedBubbleText}>{deletedLabel}</Text>
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
        ? BrandColors.primaryMid
        : '#64748b'
      : statusIconColor(item.status, !!item.me && !isActionTarget);
  const isGroupIncoming = isGroupChat && !item.me;
  const isImageBubble = item.type === 'image' && !!item.uri;
  const bubbleStyle = [
    styles.bubble,
    styles.bubbleFitContent,
    item.me ? styles.bubbleMe : styles.bubbleOther,
    isGroupIncoming && !isImageBubble && showSenderHeader && styles.bubbleGroupFirst,
    isGroupIncoming && !isImageBubble && !showSenderHeader && styles.bubbleGroupStack,
    isImageBubble && styles.bubbleImageOuter,
    isImageBubble && (item.me ? styles.bubbleImageMe : styles.bubbleImageOther),
    isImageBubble && isGroupIncoming && showSenderHeader && styles.bubbleImageGroupFirst,
    isImageBubble && isGroupIncoming && !showSenderHeader && styles.bubbleImageGroupStack,
    item.type === 'file' && styles.bubbleFileOuter,
    isActionTarget && item.me && styles.bubbleMeSelected,
    isActionTarget && !item.me && styles.bubbleOtherSelected,
    item.type === 'image' && styles.bubbleAttachment,
    item.type === 'image' && styles.imageBubble,
    isActionTarget && item.type === 'image' && styles.bubbleAttachmentSelected,
    isActionTarget && item.type === 'file' && styles.bubbleFileSelected,
  ];
  const isFileBubble = item.type === 'file';
  const bubbleContent = (
    <>
        {item.forwardedFrom ? (
          <View style={[styles.messageFlag, item.me && styles.messageFlagMe]}>
            <MaterialCommunityIcons
              name="share-outline"
              size={12}
              color={isActionTarget ? BrandColors.primaryMid : item.me ? '#dbeafe' : '#64748b'}
            />
            <Text
              style={[
                styles.messageFlagText,
                item.me && styles.messageFlagTextMe,
                isActionTarget && styles.messageFlagTextSelected,
              ]}>
              Forwarded
            </Text>
          </View>
        ) : null}
        {reply ? (
          <View
            style={[
              styles.replyQuote,
              item.me && styles.replyQuoteMe,
              isGroupIncoming && styles.replyQuoteGroup,
              isActionTarget && styles.replyQuoteSelected,
              isActionTarget && item.me && styles.replyQuoteMeSelected,
            ]}>
            <Text
              style={[
                styles.replyQuoteTitle,
                item.me && styles.replyQuoteTitleMe,
                isGroupIncoming && styles.replyQuoteTitleGroup,
                isActionTarget && styles.replyQuoteTitleSelected,
              ]}
              numberOfLines={1}>
              {reply.me ? 'You' : reply.authorName || peerName || senderName || 'Contact'}
            </Text>
            <Text
              style={[
                styles.replyQuoteText,
                item.me && styles.replyQuoteTextMe,
                isGroupIncoming && styles.replyQuoteTextGroup,
                isActionTarget && styles.replyQuoteTextSelected,
              ]}
              numberOfLines={2}>
              {messagePlainText(reply) || 'Message'}
            </Text>
          </View>
        ) : null}
        {isGroupIncoming && showSenderHeader ? (
          <Text style={[styles.groupNameInBubble, { color: senderColor || ChatTheme.groupSenderName }]} numberOfLines={1}>
            {senderName || 'Member'}
          </Text>
        ) : null}
        {isImageBubble ? (
          <View
            style={[
              styles.imageBubbleWrap,
              item.me ? styles.imageBubbleWrapMe : styles.imageBubbleWrapOther,
              isGroupIncoming && showSenderHeader && styles.imageBubbleWrapGroupFirst,
              isGroupIncoming && !showSenderHeader && styles.imageBubbleWrapGroupStack,
              isActionTarget && styles.imageFrameSelected,
            ]}>
            <Image
              source={{ uri: item.uri }}
              style={styles.attachmentImage}
              contentFit="cover"
              transition={200}
              placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
            />
            <View style={styles.imageOverlayBar}>
              <Text style={styles.imageTimeText}>{normalizeTime(item.time)}</Text>
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
          />
        ) : null}
        {item.type !== 'file' && item.type !== 'image' ? (
          <Text
            style={[
              styles.bubbleText,
              item.me && !isActionTarget && styles.bubbleTextMe,
              isActionTarget && styles.bubbleTextSelected,
            ]}>
            {item.text}
          </Text>
        ) : null}
        <View
          style={[
            styles.msgMetaRow,
            item.me && styles.msgMetaRowMe,
            (item.type === 'image' || item.type === 'file') && styles.msgMetaHidden,
          ]}>
          <Text
            style={[
              styles.msgTime,
              item.me && !isActionTarget && styles.msgTimeMe,
              !item.me && styles.msgTimeOther,
              isActionTarget && styles.msgTimeSelected,
            ]}>
            {normalizeTime(item.time)}
          </Text>
          {item.me ? (
            <MaterialCommunityIcons
              name={statusIconName(item.status === 'sending' ? 'sent' : item.status)}
              size={14}
              color={tickColor}
            />
          ) : null}
        </View>
    </>
  );
  const bubbleBlock = isFileBubble ? (
    <View style={bubbleStyle}>{bubbleContent}</View>
  ) : (
    <Pressable
      style={bubbleStyle}
      onLongPress={() => onLongPress(item)}
      onPress={() => {
        if (item.type === 'image') onOpenMedia(item);
      }}>
      {bubbleContent}
    </Pressable>
  );

  if (isGroupIncoming) {
    return (
      <View
        style={[
          styles.msgRow,
          styles.msgRowGroupOther,
          showSenderHeader && styles.msgRowGroupBlockStart,
          isActionTarget && styles.msgRowActionTarget,
        ]}>
        <View style={styles.groupAvatarCol}>
          {showSenderHeader ? (
            senderAvatarUrl ? (
              <Image source={{ uri: senderAvatarUrl }} style={styles.groupSideAvatar} contentFit="cover" />
            ) : (
              <View style={styles.groupSideAvatarFb}>
                <Text style={styles.groupSideAvatarLetter}>{String(senderName || '?').slice(0, 1)}</Text>
              </View>
            )
          ) : (
            <View style={styles.groupSideAvatarGhost} />
          )}
        </View>
        <View style={styles.groupBubbleWrap}>{bubbleBlock}</View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.msgRow,
        item.me ? styles.msgRowMe : styles.msgRowOther,
        isActionTarget && styles.msgRowActionTarget,
      ]}>
      {bubbleBlock}
    </View>
  );
});

export default function MessagesScreen() {
  const navigation = useNavigation();
  const { setInConversation } = useChatChrome();
  const { user } = useAuth();
  const inbox = useGdcInbox();
  const {
    threads,
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
  const scrollToLatest = useCallback((animated = true) => {
    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        msgListRef.current?.scrollToEnd({ animated });
      });
    });
  }, []);

  const roleTitle = useMemo(() => {
    if (isAdminRole(user?.role)) return 'Admin';
    if (user?.role === 'HR') return 'HR';
    if (user?.role === 'Team Leader') return 'Team Leader';
    return 'Employee';
  }, [user?.role]);

  const selected = useMemo(() => threads.find((thread) => thread.id === selectedId) ?? null, [threads, selectedId]);

  /** DB/admin deletes remove threads server-side — close stale open chat without manual refresh. */
  useEffect(() => {
    if (!selectedId) return;
    const exists = threads.some((t) => String(t.id) === String(selectedId));
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
    return `${selectedId || ''}:${messageRows.length}:${last?.id || ''}`;
  }, [messageRows, selectedId]);

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
    emitChatTyping(selectedId, !!text.trim());
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

  useEffect(() => {
    const msgs = Array.isArray(selected?.messages) ? selected.messages : [];
    if (!selectedId || !msgs.length) return;
    const last = msgs[msgs.length - 1];
    const id = String(last.id);
    const me = !!last.me;
    const prev = lastMsgTrackRef.current;
    if (id === prev.id && msgs.length === (prev.count ?? 0)) return;
    lastMsgTrackRef.current = { id, me, count: msgs.length };
    const isIncoming = !me;
    if (isIncoming) {
      isNearBottomRef.current = true;
      scrollToLatest(true);
      acknowledgeChatRead(selectedId);
    } else if (isNearBottomRef.current) {
      scrollToLatest(true);
    }
  }, [acknowledgeChatRead, scrollToLatest, selected?.messages, selectedId]);

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
      />
    ),
    [headerProfile.name, isGroupChat, messageActionItem?.id, selectedMessageById],
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
    ({ item }) => (
      <ChatThreadRow item={item} onOpen={openThread} onHide={confirmHideChat} resolvePeerProfile={resolvePeerProfile} />
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
      const id = await submitGroupToApi({
        name,
        memberIds,
        scope: groupScopeForRole(),
        privacyLockedInvites: privacyLocked,
        adminsOnlyMessages: privacy === 'restricted',
        avatarUrl: avatarUri || undefined,
        idempotencyKey,
        openAfterCreate: false,
      });
      const pool = groupContacts.length ? groupContacts : contacts;
      setCreatedGroupSummary({
        id,
        name,
        memberIds,
        members: pool.filter((c) => memberIds.includes(String(c.id))).slice(0, 3),
      });
      setGroupOpen(false);
      setGroupCreated(true);
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
      navigation.setOptions({ tabBarStyle: HOME_TAB_BAR_STYLE });
    }
    return () => {
      parent?.setOptions({ tabBarStyle: undefined });
      navigation.setOptions({ tabBarStyle: HOME_TAB_BAR_STYLE });
    };
  }, [navigation, selected]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {selected ? (
        <KeyboardAvoidingView
          style={styles.safe}
          // iOS: padding feels most natural. Android: use "height" (not padding) to avoid
          // sticky bottom gaps while still lifting the composer above the keyboard.
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
          keyboardShouldPersistTaps="handled">
          <View style={styles.chatHeader}>
            <Pressable
              style={styles.backBtn}
              onPress={() => {
                if (selectedId) emitChatTyping(selectedId, false);
                closeChat();
                setActiveChatId(null);
                setSelectedId(null);
                setInConversation(false);
              }}>
              <MaterialCommunityIcons name="arrow-left" size={22} color={BrandColors.text} />
            </Pressable>
            {headerProfile.avatarUrl ? (
              <Image source={{ uri: headerProfile.avatarUrl }} style={styles.headerAvatarImg} contentFit="cover" />
            ) : (
              <View style={styles.avatarSm}>
                <Text style={styles.avatarText}>{String(headerProfile.name || '?').slice(0, 1)}</Text>
              </View>
            )}
            <View style={styles.headerMeta}>
              <View style={styles.headerTitleRow}>
                <Text
                  style={[styles.chatName, headerProfile.loading && styles.chatCardNamePending]}
                  numberOfLines={1}>
                  {headerProfile.name}
                </Text>
                {headerProfile.role ? (
                  <Text style={styles.roleBadge}>{roleBadgeLabel(headerProfile.role)}</Text>
                ) : null}
              </View>
              <Animated.View style={{ opacity: headerStatusFade }}>
                {isPeerTyping ? (
                  <View style={styles.headerStatusRow}>
                    <TypingDots color="#22c55e" size={4} />
                    <Text style={styles.typingHint} numberOfLines={1}>
                      typing…
                    </Text>
                  </View>
                ) : selected.peerId && selected.isOnline ? (
                  <Text style={styles.onlineStatus} numberOfLines={1}>
                    online
                  </Text>
                ) : null}
              </Animated.View>
            </View>
            {isGroupChat ? (
              <Pressable
                style={styles.headerActionBtn}
                onPress={() => {
                  if (selectedId) {
                    router.push({ pathname: '/dashboard/group-info', params: { chatId: selectedId } });
                  }
                }}>
                <MaterialCommunityIcons name="dots-vertical" size={22} color={BrandColors.text} />
              </Pressable>
            ) : (
              <Pressable style={styles.headerActionBtn} onPress={() => confirmHideChat(selected.id)}>
                <MaterialCommunityIcons name="trash-can-outline" size={19} color="#ef4444" />
              </Pressable>
            )}
          </View>

          <ChatWallpaper style={styles.messagesWallpaper}>
          <FlatList
            ref={msgListRef}
            data={messageRows}
            extraData={messageListExtra}
            keyExtractor={(item) => item.id}
            style={styles.messagesList}
            contentContainerStyle={[styles.msgList, { paddingBottom: 16 }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            onScroll={handleChatScroll}
            scrollEventThrottle={16}
            removeClippedSubviews={Platform.OS === 'android'}
            initialNumToRender={18}
            maxToRenderPerBatch={12}
            windowSize={9}
            maintainVisibleContentPosition={
              Platform.OS === 'ios' ? { minIndexForVisible: 0, autoscrollToTopThreshold: 28 } : undefined
            }
            ListEmptyComponent={
              <View style={styles.emptyChatState}>
                <View style={styles.emptyChatIcon}>
                  <MaterialCommunityIcons name="message-text-outline" size={38} color={BrandColors.primaryMid} />
                </View>
                <Text style={styles.emptyChatTitle}>No messages yet</Text>
                <Text style={styles.emptyChatSub}>
                  Start a conversation with {selected.headerName || selected.name || 'this contact'}
                </Text>
              </View>
            }
            renderItem={renderMessageRow}
          />
          </ChatWallpaper>

          {canComposeInSelectedChat && replyTarget ? (
            <View style={styles.replyComposer}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.replyComposerTitle}>
                  Replying to {replyTarget.me ? 'your message' : headerProfile.name || 'message'}
                </Text>
                <Text style={styles.replyComposerText} numberOfLines={1}>
                  {messagePlainText(replyTarget) || 'Message'}
                </Text>
              </View>
              <Pressable onPress={() => setReplyTarget(null)}>
                <MaterialCommunityIcons name="close" size={18} color="#64748b" />
              </Pressable>
            </View>
          ) : null}

          {canComposeInSelectedChat ? (
            <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
              <View style={styles.inputWrap}>
                <TextInput
                  value={draft}
                  onChangeText={handleDraftChange}
                  onSubmitEditing={sendMessage}
                  placeholder="Message"
                  placeholderTextColor={ChatTheme.inputPlaceholder}
                  style={styles.input}
                  returnKeyType="default"
                  multiline
                  maxLength={8000}
                />
                <Pressable style={styles.inputIconBtn} onPress={() => setAttachOpen(true)} hitSlop={8}>
                  <MaterialCommunityIcons
                    name="paperclip"
                    size={24}
                    color={ChatTheme.inputIcon}
                    style={styles.paperclipIcon}
                  />
                </Pressable>
              </View>
              <Pressable
                style={[styles.sendBtn, !!draft.trim() && styles.sendBtnActive]}
                onPress={sendMessage}
                disabled={!draft.trim()}>
                <MaterialCommunityIcons name="send" size={22} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <GroupAdminsOnlyBanner bottomInset={insets.bottom} />
          )}
        </KeyboardAvoidingView>
      ) : (
        <View style={[styles.listScreen, { paddingBottom: tabBarHeight + 14 }]}>
          <View style={styles.listHeader}>
            <View>
              <Text style={styles.listTitle}>Chats</Text>
              <Text style={styles.listSubTitle}>{roleTitle} conversation inbox</Text>
            </View>
            <Pressable style={styles.newBtn} onPress={() => setNewChatOpen(true)}>
              <MaterialCommunityIcons name="message-plus-outline" size={19} color={BrandColors.primaryMid} />
            </Pressable>
          </View>

          <View style={styles.searchWrap}>
            <MaterialCommunityIcons name="magnify" size={18} color="#94a3b8" />
            <TextInput
              value={listSearch}
              onChangeText={setListSearch}
              placeholder="Search chats..."
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
            />
          </View>

          <View style={styles.filterRow}>
            {[
              ['all', 'All'],
              ['unread', 'Unread'],
              ['groups', 'Groups'],
            ].map(([id, label]) => (
              <Pressable
                key={id}
                style={[styles.filterChip, listFilter === id && styles.filterChipActive]}
                onPress={() => setListFilter(id)}>
                <Text style={[styles.filterChipText, listFilter === id && styles.filterChipTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          {inboxError ? (
            <Text style={[styles.emptyText, { paddingHorizontal: 16, marginBottom: 8 }]}>{inboxError}</Text>
          ) : null}
          {(inboxLoading && threads.length === 0) || (!directoryHydrated && threads.length === 0) ? (
            <SkeletonGroup>
              <View style={{ paddingHorizontal: 4, gap: 4 }}>
                {[0, 1, 2, 3, 4, 5].map((k) => (
                  <SkeletonListRow key={k} />
                ))}
              </View>
            </SkeletonGroup>
          ) : null}

          <FlatList
            data={filteredThreads}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={listRefreshing} onRefresh={() => void onPullRefreshInbox()} />
            }
            initialNumToRender={10}
            maxToRenderPerBatch={8}
            updateCellsBatchingPeriod={80}
            windowSize={7}
            removeClippedSubviews={Platform.OS !== 'web'}
            ListEmptyComponent={
              <View style={styles.emptyListState}>
                <View style={styles.emptyChatIcon}>
                  <MaterialCommunityIcons name="message-reply-text-outline" size={34} color={BrandColors.primaryMid} />
                </View>
                <Text style={styles.emptyChatTitle}>No chats found</Text>
                <Text style={styles.emptyChatSub}>Start a new conversation to see it here.</Text>
              </View>
            }
            renderItem={renderThreadItem}
          />
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
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successCheck}>
              <MaterialCommunityIcons name="check" size={38} color="#fff" />
            </View>
            <Text style={styles.successTitle}>Group Created!</Text>
            <Text style={styles.successSub}>{createdGroupSummary?.name || 'Group'} has been created successfully.</Text>
            <Text style={styles.selectedCount}>{createdGroupSummary?.memberIds?.length || 0} Members Added</Text>
            <View style={styles.successAvatars}>
              {(createdGroupSummary?.members || []).map((member) =>
                member.avatarUrl ? (
                  <Image key={member.id} source={{ uri: member.avatarUrl }} style={styles.successAvatarImg} contentFit="cover" />
                ) : (
                  <View key={member.id} style={styles.successAvatar}>
                    <Text style={styles.successAvatarText}>{initials(member.name)}</Text>
                  </View>
                ),
              )}
              <View style={styles.successAvatarAdd}>
                <MaterialCommunityIcons name="plus" size={18} color="#94a3b8" />
              </View>
            </View>
            <Pressable
              style={styles.successPrimaryBtn}
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
              <Text style={styles.successPrimaryText}>Open Group</Text>
            </Pressable>
            <Pressable
              style={styles.successSecondaryBtn}
              onPress={() => {
                setGroupCreated(false);
                setSelectedId(null);
              }}>
              <Text style={styles.successSecondaryText}>Go to Chats</Text>
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Forward message</Text>
              <Pressable onPress={() => setForwardItem(null)}>
                <MaterialCommunityIcons name="close" size={20} color="#334155" />
              </Pressable>
            </View>
            <Text style={styles.forwardPreview} numberOfLines={2}>
              {messagePlainText(forwardItem) || 'Message'}
            </Text>
            <FlatList
              data={filteredContacts}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={styles.emptyText}>No contacts available to forward.</Text>}
              renderItem={({ item }) => (
                <Pressable style={styles.contactRow} onPress={() => forwardMessageTo(item)}>
                  {item.avatarUrl ? (
                    <Image source={{ uri: item.avatarUrl }} style={styles.contactAvatarImg} contentFit="cover" />
                  ) : (
                    <View style={styles.avatarSm}>
                      <Text style={styles.avatarText}>{String(item.displayName || item.name || '?').slice(0, 1)}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.chatCardTitleRow}>
                      <Text style={styles.contactName} numberOfLines={1}>
                        {item.displayName || item.name}
                      </Text>
                      {item.roleLabel ? <Text style={styles.roleBadge}>{roleBadgeLabel(item.roleLabel)}</Text> : null}
                    </View>
                    <Text style={styles.contactStatus}>{item.online ? 'Online' : 'Offline'}</Text>
                  </View>
                  <MaterialCommunityIcons name="send" size={18} color={BrandColors.primaryMid} />
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fbff' },
  listScreen: { flex: 1, paddingHorizontal: 14, paddingTop: 10, backgroundColor: '#f8fbff' },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  listTitle: { fontSize: 26, fontWeight: '800', color: BrandColors.text },
  listSubTitle: { marginTop: 2, fontSize: 12, color: BrandColors.textMuted },
  newBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe4fb',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5fb',
    borderWidth: 0,
    borderColor: '#e7eefb',
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: { flex: 1, paddingHorizontal: 8, paddingVertical: 10, color: BrandColors.text, fontSize: 14 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#eef4ff',
  },
  filterChipActive: { backgroundColor: '#1266f1' },
  filterChipText: { color: '#64748b', fontSize: 12, fontWeight: '800' },
  filterChipTextActive: { color: '#fff' },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 16,
    paddingVertical: 9,
    paddingHorizontal: 2,
    marginBottom: 8,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  avatarSm: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#1d4ed8', fontSize: 16, fontWeight: '800' },
  chatBody: { flex: 1 },
  chatTop: { flexDirection: 'row', alignItems: 'center' },
  chatCardTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', minWidth: 0, marginRight: 8 },
  chatCardName: { flexShrink: 1, fontSize: 15, fontWeight: '700', color: BrandColors.text },
  chatCardNamePending: { color: '#94a3b8' },
  chatCardTime: { fontSize: 10, color: '#94a3b8', minWidth: 54, textAlign: 'right', fontWeight: '700' },
  chatCardMsg: { marginTop: 3, color: '#64748b', fontSize: 12, fontWeight: '500' },
  chatCardStatus: { marginTop: 1, color: '#94a3b8', fontSize: 11 },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  chatCardTimeUnread: { color: '#25D366', fontWeight: '600' },
  chatCardMsgUnread: { color: '#111b21', fontWeight: '700' },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: ChatTheme.chromeBg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e9edef',
  },
  headerAvatarImg: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e2e8f0' },
  headerActionBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap', flexShrink: 1 },
  chatRoleInline: { fontSize: 15, fontWeight: '600', color: '#64748b' },
  headerStatusRow: { marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 6 },
  typingHint: { fontSize: 12, color: '#22c55e', fontWeight: '600' },
  onlineStatus: { marginTop: 2, fontSize: 12, color: '#22c55e', fontWeight: '600', textTransform: 'lowercase' },
  headerNameSkeleton: { width: 120, height: 14, borderRadius: 7, backgroundColor: '#e2e8f0' },
  headerAvatarSkeleton: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#e2e8f0' },
  roleBadge: {
    marginLeft: 6,
    borderRadius: 999,
    backgroundColor: '#eaf2ff',
    color: BrandColors.primaryMid,
    fontSize: 10,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
    flexShrink: 0,
  },
  avatarImg: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#e2e8f0' },
  contactAvatarImg: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#e2e8f0' },
  backBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  headerMeta: { flex: 1, minWidth: 0 },
  chatName: { fontSize: 16, fontWeight: '700', color: BrandColors.text, flexShrink: 1 },
  chatStatus: { marginTop: 1, fontSize: 12, color: '#94a3b8' },
  chatStatusOnline: { color: '#16a34a' },
  messagesWallpaper: { flex: 1 },
  messagesList: { flex: 1, backgroundColor: 'transparent' },
  msgList: { paddingHorizontal: 10, paddingTop: 12, paddingBottom: 8, gap: 3 },
  emptyChatState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, paddingTop: 120 },
  emptyListState: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, paddingTop: 72 },
  emptyChatIcon: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eaf2ff',
    marginBottom: 18,
  },
  emptyChatTitle: { color: BrandColors.text, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  emptyChatSub: { marginTop: 8, color: '#64748b', fontSize: 15, fontWeight: '600', textAlign: 'center', lineHeight: 22 },
  dateSeparatorWrap: { alignItems: 'center', marginVertical: 10 },
  dateSeparatorPill: {
    borderRadius: 8,
    backgroundColor: ChatTheme.datePillBg,
    paddingHorizontal: 12,
    paddingVertical: 5,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  dateSeparatorText: {
    color: ChatTheme.datePillText,
    fontSize: 12,
    fontWeight: '600',
  },
  msgRow: { width: '100%', flexDirection: 'row' },
  msgRowMe: { justifyContent: 'flex-end', marginBottom: 2, marginTop: 1 },
  msgRowOther: { justifyContent: 'flex-start' },
  msgRowGroupBlockStart: { marginTop: 8 },
  msgRowGroupOther: {
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    paddingLeft: 2,
    marginBottom: 1,
  },
  groupAvatarCol: {
    width: 40,
    marginRight: 6,
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingTop: 2,
  },
  groupSideAvatar: { width: 36, height: 36, borderRadius: 18 },
  groupSideAvatarFb: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#dfe5e7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupSideAvatarLetter: { fontSize: 14, fontWeight: '800', color: '#54656f' },
  groupSideAvatarGhost: { width: 36, height: 36 },
  groupBubbleWrap: { maxWidth: '78%', alignSelf: 'flex-start', flexGrow: 0, flexShrink: 1 },
  groupNameInBubble: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
    flexShrink: 1,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: ChatTheme.bubbleIn,
    borderRadius: 8,
    borderBottomLeftRadius: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#94a3b8' },
  typingDotOne: { opacity: 0.45 },
  typingDotTwo: { opacity: 0.7 },
  typingDotThree: { opacity: 1 },
  bubble: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, paddingBottom: 5 },
  bubbleFitContent: { alignSelf: 'flex-start', flexGrow: 0, flexShrink: 1, maxWidth: '82%' },
  bubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: ChatTheme.bubbleOut,
    borderBottomRightRadius: 2,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  bubbleOther: {
    backgroundColor: ChatTheme.bubbleIn,
    borderBottomLeftRadius: 2,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleGroupFirst: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 2,
  },
  bubbleGroupStack: {
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 2,
    marginTop: 1,
  },
  bubbleFileOuter: { padding: 0, backgroundColor: 'transparent', shadowOpacity: 0, elevation: 0 },
  deletedBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '88%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  deletedBubbleText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: '#8696a0',
    flexShrink: 1,
  },
  // NEW UI FIX FOR MESSAGE ACTION UI — selected message highlight (light bg + blue text)
  msgRowActionTarget: { zIndex: 2 },
  bubbleMeSelected: {
    backgroundColor: '#eef4ff',
    borderWidth: 1,
    borderColor: '#c7dcff',
    borderBottomRightRadius: 7,
  },
  bubbleOtherSelected: {
    backgroundColor: '#eef4ff',
    borderWidth: 1,
    borderColor: '#c7dcff',
    borderBottomLeftRadius: 7,
  },
  bubbleAttachmentSelected: { backgroundColor: '#eef4ff', padding: 4, borderRadius: 12 },
  bubbleTextSelected: { color: BrandColors.primaryMid },
  msgTimeSelected: { color: BrandColors.primaryMid },
  messageFlagTextSelected: { color: BrandColors.primaryMid },
  replyQuoteSelected: { backgroundColor: '#dbeafe', borderLeftColor: BrandColors.primaryMid },
  replyQuoteMeSelected: { backgroundColor: '#dbeafe' },
  replyQuoteTitleSelected: { color: BrandColors.primaryMid },
  replyQuoteTextSelected: { color: '#334155' },
  bubbleAttachment: { borderWidth: 0, paddingHorizontal: 0, paddingVertical: 0, backgroundColor: 'transparent' },
  bubbleImageOuter: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  bubbleImageMe: { borderBottomRightRadius: 2 },
  bubbleImageOther: { borderBottomLeftRadius: 2 },
  bubbleImageGroupFirst: { borderBottomLeftRadius: 2 },
  bubbleImageGroupStack: { borderTopLeftRadius: 4, borderBottomLeftRadius: 2, marginTop: 1 },
  imageBubble: { borderRadius: 0, overflow: 'visible', padding: 0 },
  bubbleText: { fontSize: 15, color: ChatTheme.bubbleInText, lineHeight: 21, flexShrink: 1 },
  bubbleTextMe: { color: ChatTheme.bubbleOutText },
  messageFlag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  messageFlagMe: {},
  messageFlagText: { color: '#64748b', fontSize: 11, fontWeight: '700', fontStyle: 'italic' },
  messageFlagTextMe: { color: '#dbeafe' },
  replyQuote: {
    borderLeftWidth: 3,
    borderLeftColor: BrandColors.primaryMid,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 6,
  },
  replyQuoteGroup: {
    borderLeftWidth: 4,
    borderLeftColor: ChatTheme.replyBar,
    backgroundColor: ChatTheme.replyBg,
    borderRadius: 4,
  },
  replyQuoteTitleGroup: { color: ChatTheme.replyBar, fontSize: 12, fontWeight: '800' },
  replyQuoteTextGroup: { color: '#667781', fontSize: 13, lineHeight: 17 },
  replyQuoteMe: { borderLeftColor: '#bfdbfe', backgroundColor: 'rgba(255,255,255,0.18)' },
  replyQuoteTitle: { color: BrandColors.primaryMid, fontSize: 11, fontWeight: '800' },
  replyQuoteTitleMe: { color: '#dbeafe' },
  replyQuoteText: { marginTop: 1, color: '#475569', fontSize: 12 },
  replyQuoteTextMe: { color: '#eef6ff' },
  imageBubbleWrap: {
    borderRadius: 8,
    overflow: 'hidden',
    maxWidth: 260,
    backgroundColor: '#e9edef',
    position: 'relative',
  },
  imageBubbleWrapMe: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 2,
  },
  imageBubbleWrapOther: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderBottomLeftRadius: 2,
  },
  imageBubbleWrapGroupFirst: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 8,
  },
  imageBubbleWrapGroupStack: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 8,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 8,
    marginTop: 1,
  },
  attachmentImage: {
    width: 252,
    maxWidth: '100%',
    height: 220,
    borderRadius: 0,
  },
  imageFrameSelected: { borderWidth: 2, borderColor: '#c7dcff', borderRadius: 8 },
  imageOverlayBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: undefined,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  imageTimeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  bubbleFileSelected: { padding: 0 },
  msgMetaRow: {
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 3,
    marginLeft: 8,
  },
  msgMetaRowMe: { alignSelf: 'flex-end' },
  msgMetaHidden: { display: 'none' },
  msgTime: { fontSize: 11, fontWeight: '500', textAlign: 'right' },
  msgTimeMe: { color: 'rgba(255,255,255,0.85)' },
  msgTimeOther: { color: ChatTheme.metaMuted },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 6,
    backgroundColor: ChatTheme.chromeBg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e9edef',
  },
  input: {
    flex: 1,
    color: ChatTheme.bubbleInText,
    fontSize: 16,
    lineHeight: 20,
    paddingHorizontal: 6,
    paddingTop: Platform.OS === 'ios' ? 12 : 10,
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
    minHeight: 44,
    maxHeight: 120,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    maxHeight: 120,
    paddingLeft: 16,
    paddingRight: 6,
    borderRadius: 24,
    backgroundColor: '#f0f2f5',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e9edef',
  },
  inputIconBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paperclipIcon: {
    transform: [{ rotate: '-45deg' }],
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ChatTheme.sendBtnDisabled,
    flexShrink: 0,
  },
  sendBtnActive: { backgroundColor: ChatTheme.sendBtn },
  pendingFileCardWrap: { marginVertical: 8 },
  pendingDocRow: { alignItems: 'center', paddingVertical: 12, gap: 8 },
  pendingFileTitle: { fontSize: 15, fontWeight: '700', color: BrandColors.text, textAlign: 'center', paddingHorizontal: 8 },
  pendingMeta: { fontSize: 13, color: '#64748b' },
  pendingProgressWrap: { marginTop: 8, marginBottom: 4 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: '#e2e8f0', overflow: 'hidden', marginTop: 6 },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: BrandColors.primaryMid },
  replyComposer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8fbff',
    borderTopWidth: 1,
    borderTopColor: '#dbe4fb',
  },
  replyComposerTitle: { color: BrandColors.primaryMid, fontSize: 12, fontWeight: '800' },
  replyComposerText: { marginTop: 1, color: '#64748b', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: 16 },
  successOverlay: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', padding: 22 },
  successCard: { alignItems: 'center', gap: 12 },
  successCheck: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  successTitle: { color: BrandColors.text, fontSize: 20, fontWeight: '900' },
  successSub: { color: '#64748b', fontSize: 14, textAlign: 'center', lineHeight: 21, maxWidth: 260 },
  successAvatars: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginVertical: 18 },
  successAvatarImg: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: '#fff' },
  successAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successAvatarText: { color: BrandColors.primaryMid, fontSize: 10, fontWeight: '900' },
  successAvatarAdd: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  successPrimaryBtn: {
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#1266f1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 48,
  },
  successPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '900' },
  successSecondaryBtn: { paddingVertical: 12 },
  successSecondaryText: { color: '#1266f1', fontSize: 14, fontWeight: '800' },
  actionSheet: {
    marginTop: 'auto',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#dbe4fb',
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2ff',
  },
  actionText: { color: BrandColors.text, fontSize: 14, fontWeight: '700' },
  forwardPreview: {
    color: '#64748b',
    fontSize: 13,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderWidth: 0,
    borderColor: '#dbe4fb',
    borderRadius: 18,
    padding: 14,
    maxHeight: '72%',
  },
  groupModalCard: { maxHeight: '92%', borderRadius: 22, padding: 16 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: BrandColors.text },
  groupCreateEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#f8fbff',
  },
  groupCreateEntryText: { color: BrandColors.primaryMid, fontSize: 14, fontWeight: '700' },
  groupPhotoBlock: { alignItems: 'center', marginBottom: 18 },
  groupDpRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  groupDpCircle: {
    width: 98,
    height: 98,
    borderRadius: 49,
    backgroundColor: '#eaf2ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  groupDpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 0,
    borderColor: '#dbe4fb',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  groupDpBtnText: { color: BrandColors.primaryMid, fontSize: 13, fontWeight: '700' },
  groupSectionLabel: { fontSize: 12, color: '#64748b', fontWeight: '800', marginBottom: 6, marginTop: 4 },
  groupDescriptionBox: { minHeight: 82, alignItems: 'flex-start', paddingTop: 8, position: 'relative' },
  groupDescriptionInput: { minHeight: 58, textAlignVertical: 'top' },
  descriptionCount: { position: 'absolute', right: 12, bottom: 8, color: '#94a3b8', fontSize: 11, fontWeight: '700' },
  privacyRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  privacyStack: { borderWidth: 1, borderColor: '#e7eefb', borderRadius: 16, overflow: 'hidden', marginBottom: 10 },
  privacyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2ff',
    backgroundColor: '#fff',
  },
  privacyOptionTitle: { color: BrandColors.text, fontSize: 13, fontWeight: '900' },
  privacyOptionSub: { marginTop: 3, color: '#64748b', fontSize: 11, lineHeight: 15 },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: { borderColor: '#1266f1' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#1266f1' },
  privacyChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dbe4fb',
    backgroundColor: '#fff',
  },
  privacyChipActive: { backgroundColor: '#eaf2ff', borderColor: '#bfdbfe' },
  privacyChipText: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  privacyChipTextActive: { color: BrandColors.primaryMid },
  adminRow: { gap: 8, paddingBottom: 6 },
  adminChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dbe4fb',
    backgroundColor: '#fff',
  },
  adminChipActive: { borderColor: '#bfdbfe', backgroundColor: '#eaf2ff' },
  adminChipText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  adminChipTextActive: { color: BrandColors.primaryMid },
  membersBox: {
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2ff',
  },
  memberIdentity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberName: { fontSize: 13, color: BrandColors.text, fontWeight: '600' },
  memberCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberCheckActive: { backgroundColor: BrandColors.primaryMid, borderColor: BrandColors.primaryMid },
  selectedCount: { color: '#64748b', fontSize: 12, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  createGroupBtn: {
    borderRadius: 10,
    backgroundColor: BrandColors.primaryMid,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  createGroupBtnDisabled: { opacity: 0.75 },
  createGroupBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  groupSuccessText: { color: '#16a34a', fontSize: 12, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2ff',
  },
  contactName: { flexShrink: 1, fontSize: 14, fontWeight: '700', color: BrandColors.text },
  contactStatus: { marginTop: 2, fontSize: 12, color: '#64748b' },
  presenceDot: {
    position: 'absolute',
    right: 0,
    bottom: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#94a3b8',
  },
  contactPresenceDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#94a3b8',
  },
  presenceDotOnline: { backgroundColor: '#22c55e' },
  emptyText: { color: '#64748b', textAlign: 'center', paddingVertical: 12 },
});
