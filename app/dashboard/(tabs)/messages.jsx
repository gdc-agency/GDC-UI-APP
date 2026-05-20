import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useNavigation } from 'expo-router';
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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChatImagePreview } from '@/components/chat/chat-image-preview';
import { MessageActionMenu } from '@/components/chat/message-action-menu';
import { TypingDots } from '@/components/chat/typing-dots';
import { SkeletonGroup, SkeletonListRow } from '@/components/ui/skeleton';
import { BrandColors } from '@/constants/brand';
import { useChatChrome } from '@/context/chat-chrome-context';
import { useAuth } from '@/context/auth-context';
import { useGdcChatInbox } from '@/hooks/useGdcChatInbox';
import { isAdminRole } from '@/utils/roles';
import {
  formatFileSize,
  isChatDisplayNamePending,
  resolveChatPeerDisplayName,
} from '@/utils/chat-directory';

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

// NEW UI FIX FOR DOCUMENT MESSAGE BUBBLE — colored ext badge (reference design)
const getFileMeta = (fileName = '') => {
  const ext = (fileName.split('.').pop() || 'FILE').toUpperCase();
  const badgeByExt = {
    PDF: { color: '#e74c3c', label: 'PDF' },
    DOC: { color: '#2b579a', label: 'DOC' },
    DOCX: { color: '#2b579a', label: 'DOC' },
    XLS: { color: '#1d7a46', label: 'XLS' },
    XLSX: { color: '#1d7a46', label: 'XLS' },
    JPG: { color: '#0ea5e9', label: 'JPG' },
    JPEG: { color: '#0ea5e9', label: 'JPG' },
    PNG: { color: '#0ea5e9', label: 'PNG' },
    ZIP: { color: '#f59e0b', label: 'ZIP' },
    RAR: { color: '#f59e0b', label: 'RAR' },
    MP3: { color: '#8b5cf6', label: 'MP3' },
    WAV: { color: '#8b5cf6', label: 'WAV' },
    MP4: { color: '#0ea5e9', label: 'MP4' },
    MOV: { color: '#0ea5e9', label: 'MOV' },
  };
  const badge = badgeByExt[ext] || { color: '#64748b', label: ext.slice(0, 4) };
  return { ext, badgeColor: badge.color, badgeLabel: badge.label };
};

function FileDocumentCard({ item, isActionTarget, tickColor, onDownload, compact }) {
  const fileMeta = getFileMeta(item.fileName);
  const metaLine = [item.fileSizeLabel, fileMeta.ext].filter(Boolean).join(' • ');
  const showFooter = !compact && (item.time || item.me);
  return (
    <View style={[styles.fileCard, isActionTarget && styles.fileCardSelected]}>
      <View style={styles.fileCardRow}>
        <View style={[styles.fileBadge, { backgroundColor: fileMeta.badgeColor }]}>
          <View style={styles.fileBadgeFold} />
          <Text style={styles.fileBadgeExt}>{fileMeta.badgeLabel}</Text>
        </View>
        <View style={styles.fileTextWrap}>
          <Text numberOfLines={2} style={[styles.fileName, isActionTarget && styles.fileNameSelected]}>
            {item.fileName || 'Document'}
          </Text>
          {metaLine ? (
            <Text style={styles.fileMetaText} numberOfLines={1}>
              {metaLine}
            </Text>
          ) : null}
        </View>
        {!compact ? (
          <Pressable style={styles.fileDownloadBtn} hitSlop={8} onPress={onDownload}>
            <MaterialCommunityIcons name="download" size={22} color="#94a3b8" />
          </Pressable>
        ) : null}
      </View>
      {showFooter ? (
        <View style={styles.fileCardFooter}>
          {item.time ? <Text style={styles.fileCardTime}>{normalizeTime(item.time)}</Text> : <View />}
          {item.me ? (
            <MaterialCommunityIcons
              name={statusIconName(item.status === 'sending' ? 'sent' : item.status)}
              size={14}
              color={tickColor}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

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

const statusIconName = (status) => {
  if (status === 'seen') return 'check-all';
  if (status === 'delivered') return 'check-all';
  if (status === 'sending') return 'clock-outline';
  return 'check';
};

const statusIconColor = (status) => {
  if (status === 'seen') return '#34B7F1';
  if (status === 'delivered') return '#94a3b8';
  if (status === 'sending') return '#94a3b8';
  return '#94a3b8';
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

  return (
    <Pressable style={styles.chatCard} onPress={() => onOpen(item.id)} onLongPress={() => onHide(item.id)}>
      <View>
        {item.listAvatarUrl || peer?.avatarUrl ? (
          <Image
            source={{ uri: item.listAvatarUrl || peer?.avatarUrl }}
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
          <Text style={styles.chatCardTime}>{normalizeTime(last?.time)}</Text>
        </View>
        <Text style={styles.chatCardMsg} numberOfLines={1}>
          {last?.type === 'image'
            ? 'Photo'
            : last?.type === 'file'
              ? `Document: ${last.fileName ?? ''}`
              : last?.text ?? 'Start a conversation'}
        </Text>
      </View>
      {!!item.unread && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadText}>{item.unread}</Text>
        </View>
      )}
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
}) {
  if (row.kind === 'date') {
    return (
      <View style={styles.dateSeparatorWrap}>
        <Text style={styles.dateSeparatorText}>{row.label}</Text>
      </View>
    );
  }
  const item = row.message;
  const reply = item.replyToId ? selectedMessageById.get(String(item.replyToId)) : null;
  // NEW UI FIX FOR MESSAGE ACTION UI — invert bubble colors when message is selected (ref image)
  const isActionTarget = actionTargetId != null && String(item.id) === String(actionTargetId);
  const tickColor =
    isActionTarget && item.me
      ? item.status === 'seen'
        ? BrandColors.primaryMid
        : '#64748b'
      : statusIconColor(item.status);
  return (
    <View
      style={[
        styles.msgRow,
        item.me ? styles.msgRowMe : styles.msgRowOther,
        isActionTarget && styles.msgRowActionTarget,
      ]}>
      <Pressable
        style={[
          styles.bubble,
          item.me ? styles.bubbleMe : styles.bubbleOther,
          isActionTarget && item.me && styles.bubbleMeSelected,
          isActionTarget && !item.me && styles.bubbleOtherSelected,
          (item.type === 'image' || item.type === 'file') && styles.bubbleAttachment,
          item.type === 'image' && styles.imageBubble,
          item.type === 'file' && styles.bubbleFileDoc,
          isActionTarget && (item.type === 'image' || item.type === 'file') && styles.bubbleAttachmentSelected,
        ]}
        onLongPress={() => onLongPress(item)}
        onPress={() => {
          if (item.type === 'image' || item.type === 'file') onOpenMedia(item);
        }}>
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
              isActionTarget && styles.replyQuoteSelected,
              isActionTarget && item.me && styles.replyQuoteMeSelected,
            ]}>
            <Text
              style={[
                styles.replyQuoteTitle,
                item.me && styles.replyQuoteTitleMe,
                isActionTarget && styles.replyQuoteTitleSelected,
              ]}
              numberOfLines={1}>
              {reply.me ? 'You' : peerName || 'Contact'}
            </Text>
            <Text
              style={[
                styles.replyQuoteText,
                item.me && styles.replyQuoteTextMe,
                isActionTarget && styles.replyQuoteTextSelected,
              ]}
              numberOfLines={1}>
              {messagePlainText(reply) || 'Message'}
            </Text>
          </View>
        ) : null}
        {item.type === 'image' && item.uri ? (
          <View style={[styles.imageFrame, isActionTarget && styles.imageFrameSelected]}>
            <Image source={{ uri: item.uri }} style={styles.attachmentImage} contentFit="cover" transition={200} />
            <View style={styles.imageOverlayBar}>
              <Text style={styles.imageTimeText}>{normalizeTime(item.time)}</Text>
              {item.me ? (
                <MaterialCommunityIcons
                  name={statusIconName(item.status === 'sending' ? 'sent' : item.status)}
                  size={13}
                  color={tickColor}
                />
              ) : null}
            </View>
          </View>
        ) : null}
        {item.type === 'file' ? (
          <FileDocumentCard
            item={item}
            isActionTarget={isActionTarget}
            tickColor={tickColor}
            onDownload={() => {
              if (item.uri) void Linking.openURL(item.uri);
            }}
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
      </Pressable>
    </View>
  );
});

export default function MessagesScreen() {
  const navigation = useNavigation();
  const { setInConversation } = useChatChrome();
  const { user, token } = useAuth();
  const inbox = useGdcChatInbox({ token, user });
  const {
    threads,
    contacts,
    inboxLoading,
    directoryHydrated,
    inboxError,
    openChat,
    closeChat,
    startDm,
    createGroup: submitGroupToApi,
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
  } = inbox;
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState(null);
  const [listSearch, setListSearch] = useState('');
  const [listFilter, setListFilter] = useState('all');
  const [draft, setDraft] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [attachOpen, setAttachOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState(/** @type {Record<string, unknown> | null} */ (null));
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupPrivacy, setGroupPrivacy] = useState('private');
  const [groupAdmin, setGroupAdmin] = useState('');
  const [groupMembers, setGroupMembers] = useState([]);
  const [pendingSend, setPendingSend] = useState(null);
  const [replyTarget, setReplyTarget] = useState(null);
  const [messageActionItem, setMessageActionItem] = useState(null);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState(/** @type {Set<string>} */ (new Set()));
  const [forwardItem, setForwardItem] = useState(null);
  const [groupCreating, setGroupCreating] = useState(false);
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

  const headerProfile = useMemo(() => {
    if (!selected) return { loading: false, name: '', avatarUrl: null, role: '' };
    const peer = selected.peerId ? resolvePeerProfile(selected.peerId) : null;
    const name = resolveChatPeerDisplayName(selected, peer);
    const loading = isChatDisplayNamePending(name, selected.peerId);
    return {
      loading,
      name: name || '…',
      avatarUrl: selected.listAvatarUrl || peer?.avatarUrl || null,
      role: selected.headerRole || peer?.roleLabel || '',
    };
  }, [resolvePeerProfile, selected]);

  const selectedMessageById = useMemo(() => {
    const map = new Map();
    const msgs = Array.isArray(selected?.messages) ? selected.messages : [];
    for (const msg of msgs) map.set(String(msg.id), msg);
    return map;
  }, [selected?.messages]);

  const messageRows = useMemo(() => {
    const rows = [];
    let lastLabel = '';
    const msgs = Array.isArray(selected?.messages) ? selected.messages : [];
    for (const msg of msgs) {
      const label = formatMessageDateLabel(msg.createdAtIso);
      if (label !== lastLabel) {
        rows.push({ kind: 'date', id: `date-${msg.createdAtIso || msg.id}`, label });
        lastLabel = label;
      }
      rows.push({ kind: 'message', id: String(msg.id), message: msg });
    }
    return rows;
  }, [selected?.messages]);

  const filteredThreads = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    return threads.filter((thread) => {
      if (listFilter === 'unread' && !(Number(thread.unread) > 0)) return false;
      if (listFilter === 'groups' && thread?.server?.kind !== 'group') return false;
      if (!q) return true;
      const title = String(thread.listTitle || thread.name || '').toLowerCase();
      const role = String(thread.headerRole || '').toLowerCase();
      return title.includes(q) || role.includes(q);
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
      setInConversation(true);
      setSelectedId(threadId);
      void openChat(threadId);
    },
    [openChat, setInConversation],
  );

  const sendMessage = async () => {
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
    setAttachOpen(false);
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
      const a = doc.assets[0];
      const uri = a.uri;
      const mimeType = a.mimeType || 'application/octet-stream';
      const fileName = a.name || 'document';
      const size = typeof a.size === 'number' ? a.size : undefined;
      setPendingSend({ uri, mimeType, fileName, kind: 'file', size });
    } catch (e) {
      Alert.alert('Attachment', e?.message ?? 'Could not pick file');
    }
  };

  const confirmPendingSend = async () => {
    if (!pendingSend || !selectedId) return;
    const payload = { ...pendingSend };
    setPendingSend(null);
    isNearBottomRef.current = true;
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
      scrollToLatest(true);
    } catch (e) {
      Alert.alert('Send', e?.message ?? 'Upload failed');
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
    }, 1400);
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
    if (id === prev.id) return;
    lastMsgTrackRef.current = { id, me };
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
      />
    ),
    [headerProfile.name, messageActionItem?.id, selectedMessageById],
  );

  const startNewChat = async (contact) => {
    try {
      const id = await startDm(contact.id);
      setNewChatOpen(false);
      setContactSearch('');
      if (id) setSelectedId(id);
    } catch (e) {
      Alert.alert('Chat', e?.message ?? 'Could not start DM');
    }
  };

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
              setSelectedId(null);
              setInConversation(false);
            }
          },
        },
      ]);
    },
    [closeChat, hideChatForMe, selectedId],
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
      if (actionKey === 'hide') {
        if (selectedId && item.id) void hideMessageForMe(selectedId, item.id);
        return;
      }
      // NEW UI FIX FOR MESSAGE ACTION UI — delete sheet handles confirm (no extra alert)
      if (actionKey === 'everyone') {
        if (selectedId && item.id) void deleteMessageForEveryone(selectedId, item.id);
        return;
      }
    },
    [copyMessage, deleteMessageForEveryone, hideMessageForMe, selectedId],
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

  const toggleGroupMember = (memberId) => {
    setGroupMembers((prev) => (prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]));
  };

  const handleCreateGroupSubmit = async () => {
    const name = groupName.trim();
    if (!name) return;
    if (!groupMembers.length) {
      Alert.alert('Group', 'Add at least one member.');
      return;
    }
    try {
      setGroupCreating(true);
      setGroupCreated(false);
      const id = await submitGroupToApi({
        name,
        memberIds: groupMembers.map(String),
        scope: groupScopeForRole(),
        privacyLockedInvites: groupPrivacy === 'private' || groupPrivacy === 'restricted',
        adminsOnlyMessages: groupPrivacy === 'restricted',
      });
      setCreatedGroupSummary({
        id,
        name,
        memberIds: groupMembers.map(String),
        members: contacts.filter((c) => groupMembers.includes(c.id)).slice(0, 3),
      });
      setGroupOpen(false);
      setNewChatOpen(false);
      setGroupName('');
      setGroupDescription('');
      setGroupPrivacy('private');
      setGroupAdmin('');
      setGroupMembers([]);
      setGroupCreated(true);
    } catch (e) {
      Alert.alert('Group', e?.message ?? 'Could not create group');
    } finally {
      setGroupCreating(false);
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
            <Pressable style={styles.headerActionBtn} onPress={() => confirmHideChat(selected.id)}>
              <MaterialCommunityIcons name="trash-can-outline" size={19} color="#ef4444" />
            </Pressable>
          </View>

          <FlatList
            ref={msgListRef}
            data={messageRows}
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

          {replyTarget ? (
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

          {/* NEW UI FIX FOR MESSAGE COMPOSER — pill input + attach + camera + send */}
          <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <Pressable style={styles.composerEmojiBtn} onPress={() => {}}>
              <MaterialCommunityIcons name="emoticon-outline" size={24} color="#94a3b8" />
            </Pressable>
            <View style={styles.inputWrap}>
              <TextInput
                value={draft}
                onChangeText={handleDraftChange}
                onSubmitEditing={sendMessage}
                placeholder="Write a message..."
                placeholderTextColor="#94a3b8"
                style={styles.input}
                returnKeyType="default"
                multiline
                maxLength={8000}
              />
              <Pressable style={styles.inputIconBtn} onPress={() => setAttachOpen(true)} hitSlop={6}>
                <MaterialCommunityIcons name="paperclip" size={22} color="#94a3b8" />
              </Pressable>
              <Pressable style={styles.inputIconBtn} onPress={() => void pickAndSendAttachment('image')} hitSlop={6}>
                <MaterialCommunityIcons name="camera-outline" size={22} color="#94a3b8" />
              </Pressable>
            </View>
            <Pressable
              style={[styles.sendBtn, !!draft.trim() && styles.sendBtnActive]}
              onPress={sendMessage}
              disabled={!draft.trim()}>
              <MaterialCommunityIcons name="send" size={20} color="#fff" />
            </Pressable>
          </View>
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

      <Modal visible={newChatOpen} transparent animationType="fade" onRequestClose={() => setNewChatOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Start new chat</Text>
              <Pressable onPress={() => setNewChatOpen(false)}>
                <MaterialCommunityIcons name="close" size={20} color="#334155" />
              </Pressable>
            </View>
            <Pressable style={styles.groupCreateEntry} onPress={() => setGroupOpen(true)}>
              <MaterialCommunityIcons name="account-group-outline" size={18} color={BrandColors.primaryMid} />
              <Text style={styles.groupCreateEntryText}>Create New Group</Text>
            </Pressable>
            <View style={styles.searchWrap}>
              <MaterialCommunityIcons name="magnify" size={18} color="#94a3b8" />
              <TextInput
                value={contactSearch}
                onChangeText={setContactSearch}
                placeholder="Search contact"
                placeholderTextColor="#94a3b8"
                style={styles.searchInput}
              />
            </View>
            <FlatList
              data={filteredContacts}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={styles.emptyText}>No available contacts.</Text>}
              renderItem={({ item }) => {
                const line = item.displayName || item.name;
                return (
                  <Pressable style={styles.contactRow} onPress={() => startNewChat(item)}>
                    <View>
                      {item.avatarUrl ? (
                        <Image source={{ uri: item.avatarUrl }} style={styles.contactAvatarImg} contentFit="cover" />
                      ) : (
                        <View style={styles.avatarSm}>
                          <Text style={styles.avatarText}>{String(line).slice(0, 1)}</Text>
                        </View>
                      )}
                      <View style={[styles.contactPresenceDot, item.online && styles.presenceDotOnline]} />
                    </View>
                    <View style={[styles.chatCardTitleRow, { flex: 1, minWidth: 0 }]}>
                      <Text style={styles.contactName} numberOfLines={1}>
                        {line}
                      </Text>
                      {item.roleLabel ? <Text style={styles.roleBadge}>{roleBadgeLabel(item.roleLabel)}</Text> : null}
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={18} color="#64748b" />
                  </Pressable>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={groupOpen} transparent animationType="fade" onRequestClose={() => setGroupOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, styles.groupModalCard]}>
            <View style={styles.modalHead}>
              <Pressable onPress={() => setGroupOpen(false)}>
                <MaterialCommunityIcons name="arrow-left" size={22} color={BrandColors.text} />
              </Pressable>
              <Text style={styles.modalTitle}>Create Group</Text>
              <Pressable onPress={() => setGroupOpen(false)}>
                <MaterialCommunityIcons name="close" size={20} color="#334155" />
              </Pressable>
            </View>

            <View style={styles.groupPhotoBlock}>
              <View style={styles.groupDpCircle}>
                <MaterialCommunityIcons name="camera-outline" size={30} color={BrandColors.primaryMid} />
              </View>
              <Pressable style={styles.groupDpBtn}>
                <Text style={styles.groupDpBtnText}>Add Group Photo</Text>
              </Pressable>
            </View>

            <Text style={styles.groupSectionLabel}>Group Name</Text>
            <View style={styles.searchWrap}>
              <TextInput
                value={groupName}
                onChangeText={setGroupName}
                placeholder="Enter group name"
                placeholderTextColor="#94a3b8"
                style={styles.searchInput}
              />
            </View>

            <Text style={styles.groupSectionLabel}>Group Description (Optional)</Text>
            <View style={[styles.searchWrap, styles.groupDescriptionBox]}>
              <TextInput
                value={groupDescription}
                onChangeText={(text) => setGroupDescription(text.slice(0, 200))}
                placeholder="Add a description..."
                placeholderTextColor="#94a3b8"
                style={[styles.searchInput, styles.groupDescriptionInput]}
                multiline
              />
              <Text style={styles.descriptionCount}>{groupDescription.length}/200</Text>
            </View>

            <Text style={styles.groupSectionLabel}>Privacy Settings</Text>
            <View style={styles.privacyStack}>
              <Pressable style={styles.privacyOption} onPress={() => setGroupPrivacy('public')}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.privacyOptionTitle}>Public Group</Text>
                  <Text style={styles.privacyOptionSub}>Anyone in the organization can find and join this group</Text>
                </View>
                <View style={[styles.radioOuter, groupPrivacy === 'public' && styles.radioOuterActive]}>
                  {groupPrivacy === 'public' ? <View style={styles.radioInner} /> : null}
                </View>
              </Pressable>
              <Pressable style={styles.privacyOption} onPress={() => setGroupPrivacy('private')}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.privacyOptionTitle}>Private Group</Text>
                  <Text style={styles.privacyOptionSub}>Only invited members can join</Text>
                </View>
                <View style={[styles.radioOuter, groupPrivacy === 'private' && styles.radioOuterActive]}>
                  {groupPrivacy === 'private' ? <View style={styles.radioInner} /> : null}
                </View>
              </Pressable>
              <Pressable style={styles.privacyOption} onPress={() => setGroupPrivacy('restricted')}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.privacyOptionTitle}>Restricted Group</Text>
                  <Text style={styles.privacyOptionSub}>Only admins can add members</Text>
                </View>
                <View style={[styles.radioOuter, groupPrivacy === 'restricted' && styles.radioOuterActive]}>
                  {groupPrivacy === 'restricted' ? <View style={styles.radioInner} /> : null}
                </View>
              </Pressable>
            </View>

            <Text style={styles.groupSectionLabel}>Group Admin</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.adminRow}>
              {contacts.map((contact) => (
                <Pressable
                  key={contact.id}
                  style={[styles.adminChip, groupAdmin === contact.id && styles.adminChipActive]}
                  onPress={() => setGroupAdmin(contact.id)}>
                  <Text style={[styles.adminChipText, groupAdmin === contact.id && styles.adminChipTextActive]}>{contact.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.groupSectionLabel}>Members</Text>
            <ScrollView style={styles.membersBox} showsVerticalScrollIndicator={false}>
              {contacts.map((contact) => (
                <Pressable key={contact.id} style={styles.memberRow} onPress={() => toggleGroupMember(contact.id)}>
                  <View style={styles.memberIdentity}>
                    {contact.avatarUrl ? (
                      <Image source={{ uri: contact.avatarUrl }} style={styles.contactAvatarImg} contentFit="cover" />
                    ) : (
                      <View style={styles.avatarSm}>
                        <Text style={styles.avatarText}>{String(contact.name || '?').slice(0, 1)}</Text>
                      </View>
                    )}
                    <Text style={styles.memberName}>{contact.name}</Text>
                    {contact.roleLabel ? <Text style={styles.roleBadge}>{roleBadgeLabel(contact.roleLabel)}</Text> : null}
                  </View>
                  <View style={[styles.memberCheck, groupMembers.includes(contact.id) && styles.memberCheckActive]}>
                    {groupMembers.includes(contact.id) ? <MaterialCommunityIcons name="check" size={12} color="#fff" /> : null}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
            {groupMembers.length ? <Text style={styles.selectedCount}>{groupMembers.length} members selected</Text> : null}

            {groupCreating ? (
              <SkeletonGroup>
                <View style={{ gap: 8 }}>
                  <SkeletonListRow />
                  <SkeletonListRow />
                </View>
              </SkeletonGroup>
            ) : groupCreated ? (
              <Text style={styles.groupSuccessText}>Group created successfully.</Text>
            ) : null}

            <Pressable
              style={[styles.createGroupBtn, groupCreating && styles.createGroupBtnDisabled]}
              onPress={handleCreateGroupSubmit}
              disabled={groupCreating}>
              {groupCreating ? <ActivityIndicator color="#fff" /> : <Text style={styles.createGroupBtnText}>Next: Add Members</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>

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
                if (id) setSelectedId(id);
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

      <Modal visible={attachOpen} transparent animationType="fade" onRequestClose={() => setAttachOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAttachOpen(false)}>
          <View style={styles.attachCard}>
            <Pressable style={styles.attachOption} onPress={() => pickAndSendAttachment('file')}>
              <MaterialCommunityIcons name="folder-upload-outline" size={18} color={BrandColors.primaryMid} />
              <Text style={styles.attachOptionText}>Upload File</Text>
            </Pressable>
            <Pressable style={styles.attachOption} onPress={() => pickAndSendAttachment('image')}>
              <MaterialCommunityIcons name="image-outline" size={18} color={BrandColors.primaryMid} />
              <Text style={styles.attachOptionText}>Upload Image</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <ChatImagePreview
        visible={!!previewItem && previewItem.type === 'image' && !!previewItem.uri}
        uri={previewItem?.uri ? String(previewItem.uri) : ''}
        onClose={() => setPreviewItem(null)}
      />

      <Modal
        visible={!!previewItem && previewItem?.type === 'file'}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewItem(null)}>
        <View style={styles.previewOverlay}>
          <View style={styles.previewCard}>
            <View style={styles.previewHead}>
              <Text style={styles.previewTitle}>Document Preview</Text>
              <Pressable onPress={() => setPreviewItem(null)}>
                <MaterialCommunityIcons name="close" size={20} color="#e2e8f0" />
              </Pressable>
            </View>
            <FileDocumentCard
              compact
              item={{
                fileName: previewItem?.fileName,
                fileSizeLabel: previewItem?.fileSizeLabel ? String(previewItem.fileSizeLabel) : '',
                time: '',
                me: false,
                status: 'sent',
              }}
              isActionTarget={false}
              tickColor="#94a3b8"
              onDownload={() => previewItem?.uri && void Linking.openURL(String(previewItem.uri))}
            />
            <Pressable
              style={styles.previewOpenBtn}
              onPress={() => previewItem?.uri && Linking.openURL(String(previewItem.uri))}>
              <Text style={styles.previewOpenBtnText}>Open File</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={!!pendingSend} transparent animationType="fade" onRequestClose={() => setPendingSend(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Review attachment</Text>
              <Pressable onPress={() => setPendingSend(null)}>
                <MaterialCommunityIcons name="close" size={20} color="#334155" />
              </Pressable>
            </View>
            {pendingSend?.kind === 'image' && pendingSend.uri ? (
              <Image source={{ uri: pendingSend.uri }} style={styles.pendingPreviewImg} contentFit="contain" />
            ) : pendingSend ? (
              <View style={styles.pendingFileCardWrap}>
                <FileDocumentCard
                  compact
                  item={{
                    fileName: pendingSend.fileName,
                    fileSizeLabel:
                      pendingSend.size != null ? formatFileSize(pendingSend.size) : '',
                    time: '',
                    me: false,
                    status: 'sent',
                  }}
                  isActionTarget={false}
                  tickColor="#94a3b8"
                  onDownload={() => {}}
                />
              </View>
            ) : null}
            <View style={styles.pendingActions}>
              <Pressable style={styles.pendingCancelBtn} onPress={() => setPendingSend(null)}>
                <Text style={styles.pendingCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.pendingSendBtn} onPress={confirmPendingSend}>
                <Text style={styles.pendingSendText}>Send</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.primaryMid,
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#dbe4fb',
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
  messagesList: { flex: 1 },
  msgList: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 8, gap: 8 },
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
  dateSeparatorWrap: { alignItems: 'center', marginVertical: 4 },
  dateSeparatorText: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: '#eaf2ff',
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  msgRow: { width: '100%', flexDirection: 'row' },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 14,
    borderBottomLeftRadius: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  typingDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#94a3b8' },
  typingDotOne: { opacity: 0.45 },
  typingDotTwo: { opacity: 0.7 },
  typingDotThree: { opacity: 1 },
  bubble: { maxWidth: '82%', borderRadius: 16, paddingHorizontal: 13, paddingVertical: 10 },
  bubbleMe: { backgroundColor: '#1266f1', borderBottomRightRadius: 7 },
  bubbleOther: { backgroundColor: '#fff', borderWidth: 0, borderColor: '#eef2ff', borderBottomLeftRadius: 7 },
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
  fileNameSelected: { color: BrandColors.primaryMid },
  fileMetaTextSelected: { color: '#64748b' },
  bubbleAttachment: { borderWidth: 0, paddingHorizontal: 0, paddingVertical: 0, backgroundColor: 'transparent' },
  imageBubble: { borderRadius: 10, overflow: 'hidden' },
  bubbleText: { fontSize: 14, color: '#334155', lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  messageFlag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  messageFlagMe: {},
  messageFlagText: { color: '#64748b', fontSize: 11, fontWeight: '700', fontStyle: 'italic' },
  messageFlagTextMe: { color: '#dbeafe' },
  replyQuote: {
    borderLeftWidth: 3,
    borderLeftColor: BrandColors.primaryMid,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 6,
  },
  replyQuoteMe: { borderLeftColor: '#bfdbfe', backgroundColor: 'rgba(255,255,255,0.18)' },
  replyQuoteTitle: { color: BrandColors.primaryMid, fontSize: 11, fontWeight: '800' },
  replyQuoteTitleMe: { color: '#dbeafe' },
  replyQuoteText: { marginTop: 1, color: '#475569', fontSize: 12 },
  replyQuoteTextMe: { color: '#eef6ff' },
  attachmentImage: {
    width: 216,
    height: 198,
    borderRadius: 10,
  },
  imageFrame: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  imageFrameSelected: { borderColor: '#c7dcff', borderWidth: 2 },
  imageOverlayBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  imageTimeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  bubbleFileDoc: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
    paddingVertical: 0,
    maxWidth: '90%',
  },
  fileCard: {
    minWidth: 248,
    maxWidth: 300,
    borderRadius: 14,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  fileCardSelected: { borderWidth: 1, borderColor: '#c7dcff' },
  fileCardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fileBadge: {
    width: 44,
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
    overflow: 'hidden',
  },
  fileBadgeFold: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 14,
    height: 14,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderBottomLeftRadius: 6,
  },
  fileBadgeExt: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  fileTextWrap: { flex: 1, minWidth: 0, paddingRight: 4 },
  fileName: { color: '#0f172a', fontSize: 15, fontWeight: '700' },
  fileMetaText: { marginTop: 3, color: '#94a3b8', fontSize: 13, fontWeight: '500' },
  fileDownloadBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  fileCardFooter: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    minHeight: 16,
  },
  fileCardTime: { color: '#94a3b8', fontSize: 11, fontWeight: '500' },
  msgMetaRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 3 },
  msgMetaRowMe: { alignSelf: 'flex-end' },
  msgMetaHidden: { display: 'none' },
  msgTime: { fontSize: 11, fontWeight: '500', minWidth: 52, textAlign: 'right' },
  msgTimeMe: { color: '#dbeafe' },
  msgTimeOther: { color: '#64748b' },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: '#f0f4f8',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  composerEmojiBtn: { width: 40, height: 48, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    color: BrandColors.text,
    fontSize: 15,
    paddingLeft: 4,
    paddingRight: 4,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    minHeight: 44,
    maxHeight: 100,
    textAlignVertical: 'center',
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    maxHeight: 120,
    paddingLeft: 14,
    paddingRight: 6,
    borderRadius: 28,
    backgroundColor: '#fff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  inputIconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  attachCard: {
    marginTop: 'auto',
    marginBottom: 110,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 14,
    paddingVertical: 4,
  },
  attachOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  attachOptionText: {
    color: BrandColors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#b8c9e8',
  },
  sendBtnActive: { backgroundColor: '#1266f1' },
  pendingFileCardWrap: { marginVertical: 8 },
  pendingPreviewImg: { width: '100%', height: 220, borderRadius: 12, backgroundColor: '#f8fafc' },
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
  pendingActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 14 },
  pendingCancelBtn: { paddingVertical: 10, paddingHorizontal: 14 },
  pendingCancelText: { color: '#64748b', fontSize: 15, fontWeight: '700' },
  pendingSendBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: BrandColors.primaryMid,
  },
  pendingSendText: { color: '#fff', fontSize: 15, fontWeight: '700' },
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
  previewOverlay: { flex: 1, backgroundColor: 'rgba(6,42,102,0.82)', justifyContent: 'center', padding: 16 },
  previewCard: {
    backgroundColor: BrandColors.splashTop,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.35)',
    borderRadius: 14,
    padding: 12,
  },
  previewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  previewTitle: { color: '#e2e8f0', fontSize: 15, fontWeight: '700' },
  previewImage: { width: '100%', height: 320, borderRadius: 10, backgroundColor: '#0b3a82' },
  previewDocCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.35)',
    backgroundColor: '#0b3a82',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 14,
    gap: 8,
  },
  previewDocName: { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
  previewOpenBtn: {
    marginTop: 4,
    backgroundColor: BrandColors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  previewOpenBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
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
