import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { getAllUsers } from '@/services/api/admin-api';
import { listAuthUsers } from '@/services/api/auth-api';
import {
    addGroupMembers,
    createGroupChat,
    deleteChatMessage,
    deleteGroupChat,
    demoteGroupAdmin,
    leaveGroupChat,
    listChatMessages,
    listChatThreads,
    markChatRead,
    openDmChat,
    postChatMessage,
    promoteGroupAdmin,
    removeGroupMembers,
    updateGroupChat,
} from '@/services/api/chat-api';
import { ChatApiError } from '@/services/api/chat-http';
import { deleteNotificationByEventKey } from '@/services/api/notifications-api';
import { fetchChatParticipantSnapshots } from '@/services/api/profile-api';
import { getMyTeamRoster, getVisibleDirectory } from '@/services/api/teams-api';
import { ensureGdcSocketConnected, getGdcSocket } from '@/services/realtime/gdc-socket';
import { readLocalUriAsDataUrl } from '@/utils/chat-attachment-read';
import { patchMessagesWithTombstone, toDeletedMessageUi } from '@/utils/chat-deleted-message';
import { formatDisplayRole, formatFileSize, mapDirectoryUser, resolveProfileImageUri } from '@/utils/chat-directory';
import { clearChatInAppNotice, messagePreviewLabel, publishChatInAppNotice } from '@/utils/chat-in-app-notice';
import {
    finalizeOutgoingMessage,
    isMessageUploading,
    isTempMessageId,
    mergeOutgoingDeliveryState,
} from '@/utils/chat-message-status';
import {
    buildPlaceholderThreadFromIncoming,
    sortThreadsByRecent,
    threadIdEquals,
} from '@/utils/chat-thread-inbox';
import {
    runWithTransferProgress,
    startTransferProgressAnimator,
} from '@/utils/chat-transfer-progress';
import { publishChatUnreadTotal, resetChatUnreadBus } from '@/utils/chat-unread-bus';
import { computeTotalChatUnread } from '@/utils/compute-total-chat-unread';
import {
    buildGroupCreateKey,
    createGroupIdempotencyKey,
    runGroupCreateOnce,
} from '@/utils/group-create-guard';
import { invalidateNotificationInbox } from '@/utils/notification-invalidate';
import { isAdminRole } from '@/utils/roles';
import { syncChatInAppNotification } from '@/utils/sync-chat-in-app-notification';

const HIDDEN_CHAT_IDS_PREFIX = 'gdc_chat_hidden_threads:';
const HIDDEN_MESSAGE_IDS_PREFIX = 'gdc_chat_hidden_messages:';
const DIRECTORY_CACHE_PREFIX = 'gdc_chat_directory_cache:';

/** @param {Record<string, unknown> | undefined} existing @param {Record<string, unknown> | undefined} incoming */
function mergeDirectoryContactRow(existing, incoming) {
  if (!incoming) return existing;
  if (!existing) return incoming;
  return {
    ...existing,
    ...incoming,
    displayName: incoming.displayName || existing.displayName,
    roleLabel: incoming.roleLabel || existing.roleLabel,
    name: incoming.name || existing.name,
    status: incoming.status || existing.status,
    avatarUrl: incoming.avatarUrl || existing.avatarUrl,
    online: incoming.online ?? existing.online,
  };
}

/** Merge directory rows; keep the first non-null avatar when sources disagree. */
function mergeDirectoryLists(...lists) {
  const map = new Map();
  for (const list of lists) {
    for (const row of list) {
      if (!row?.id) continue;
      const id = String(row.id);
      map.set(id, mergeDirectoryContactRow(map.get(id), row));
    }
  }
  return [...map.values()];
}

/** @param {Array<Record<string, unknown>>} threads @param {string} myUserId */
function collectThreadParticipantIds(threads, myUserId) {
  const ids = new Set();
  const me = String(myUserId || '');
  for (const t of threads) {
    if (t?.peerId) {
      const pid = String(t.peerId).trim();
      if (pid && pid !== me) ids.add(pid);
    }
    const server = t?.server;
    if (!server || typeof server !== 'object') continue;
    const members = Array.isArray(server.memberIds) ? server.memberIds : [];
    for (const m of members) {
      const id = String(m || '').trim();
      if (id && id !== me) ids.add(id);
    }
  }
  return [...ids];
}

/**
 * Rows already in memory (socket / optimistic) but missing from a stale API page —
 * includes incoming messages for the open chat, not only the sender's own.
 */
function shouldPreserveLocalOnlyMessage(localMsg, serverMessages) {
  if (!localMsg) return false;
  const id = String(localMsg.id);
  if (serverMessages.some((s) => String(s.id) === id)) return false;
  if (isTempMessageId(id) && localMsg.me && (localMsg.status === 'sending' || isMessageUploading(localMsg))) {
    return true;
  }
  if (localMsg.me && localMsg.status === 'failed') return true;
  const localMs = messageSortKey(localMsg);
  if (!localMs) return false;
  const serverNewestMs = serverMessages.reduce((max, s) => Math.max(max, messageSortKey(s)), 0);
  if (localMs >= serverNewestMs - 5000) return true;
  return Date.now() - localMs < 180000;
}

/** Merge API messages with in-memory rows: keep temp uploads + never downgrade seen/delivered ticks. */
function mergeMessagesWithLocal(serverMessages, localMessages) {
  const localById = new Map();
  for (const m of localMessages) localById.set(String(m.id), m);

  const merged = serverMessages.map((server) =>
    mergeOutgoingDeliveryState(server, localById.get(String(server.id))),
  );
  const mergedIds = new Set(merged.map((m) => String(m.id)));

  for (const m of localMessages) {
    const id = String(m.id);
    if (mergedIds.has(id)) continue;
    if (isTempMessageId(id) && m.me && (m.status === 'sending' || isMessageUploading(m))) {
      merged.push(m);
      mergedIds.add(id);
      continue;
    }
    if (shouldPreserveLocalOnlyMessage(m, serverMessages)) {
      merged.push(m);
      mergedIds.add(id);
    }
  }

  return sortChatMessages(merged);
}

function reconcileOutgoingMessage(messages, tempId, confirmedUi) {
  const tid = String(tempId);
  const cid = String(confirmedUi.id);
  const filtered = messages.filter((m) => String(m.id) !== tid && String(m.id) !== cid);
  return mergeMessageList(filtered, finalizeOutgoingMessage(confirmedUi));
}

function normalizeRoleKey(role) {
  return String(role || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace('teamleader', 'team_leader');
}

function canStartPersonalChat(myRole, targetRole) {
  const me = normalizeRoleKey(myRole);
  const target = normalizeRoleKey(targetRole);
  if (!target) return false;
  if (me === 'admin') return ['hr', 'team_leader', 'employee'].includes(target);
  if (me === 'hr') return ['admin', 'team_leader', 'employee'].includes(target);
  if (me === 'team_leader') return ['admin', 'hr', 'employee'].includes(target);
  if (me === 'employee') return ['admin', 'hr', 'team_leader'].includes(target);
  return false;
}

function storageKey(prefix, userId) {
  return `${prefix}${String(userId || 'anonymous')}`;
}

async function readStringSet(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr.map(String) : []);
  } catch {
    return new Set();
  }
}

async function writeStringSet(key, set) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    /* local hide state is best-effort */
  }
}

function sameStringSet(a, b) {
  if (a === b) return true;
  if (!a || !b || a.size !== b.size) return false;
  for (const item of a) {
    if (!b.has(item)) return false;
  }
  return true;
}

function formatMsgTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(String(iso));
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  } catch {
    return '';
  }
}

function messageSortKey(m) {
  const ms = m?.createdAtMs;
  if (typeof ms === 'number' && Number.isFinite(ms)) return ms;
  const iso = m?.createdAtIso;
  if (iso) {
    const t = new Date(String(iso)).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

function sortChatMessages(msgs) {
  return [...msgs].sort((a, b) => messageSortKey(a) - messageSortKey(b));
}

function mergeMessageList(existing, incomingUi) {
  const filtered = existing.filter((m) => m.id !== incomingUi.id);
  filtered.push(incomingUi);
  return sortChatMessages(filtered);
}

/** @param {Record<string, unknown>} m @param {string} myUserId */
function mapApiMessageToUi(m, myUserId) {
  const authorId = String(m.authorId ?? '');
  const readBy = Array.isArray(m.readByUserIds) ? m.readByUserIds.map(String) : [];
  const othersRead = readBy.some((id) => id && id !== String(myUserId));
  const myMessageStatus = othersRead ? 'seen' : 'delivered'; // loaded history: delivered until read
  const attachment = m.attachment && typeof m.attachment === 'object' ? m.attachment : null;
  const mime = attachment && typeof attachment.mimeType === 'string' ? attachment.mimeType : '';
  const isImage = mime.startsWith('image/') && attachment && typeof attachment.dataUrl === 'string';
  const fileName = attachment && typeof attachment.fileName === 'string' ? attachment.fileName : '';
  const sizeBytes =
    attachment && typeof attachment.sizeBytes === 'number'
      ? attachment.sizeBytes
      : attachment && typeof attachment.byteLength === 'number'
        ? attachment.byteLength
        : null;
  const fileSizeLabel = sizeBytes != null && Number.isFinite(sizeBytes) ? formatFileSize(sizeBytes) : '';
  const createdAtIso = m.createdAt != null ? String(m.createdAt) : new Date().toISOString();
  const createdAtMs = new Date(createdAtIso).getTime() || Date.now();

  if (isImage) {
    return {
      id: String(m.id),
      authorId,
      me: authorId === String(myUserId),
      type: 'image',
      text: 'Photo',
      uri: String(attachment.dataUrl),
      time: formatMsgTime(m.createdAt),
      createdAtIso,
      createdAtMs,
      deleted: !!m.deleted,
      replyToId: m.replyToId ? String(m.replyToId) : '',
      forwardedFrom: m.forwardedFrom && typeof m.forwardedFrom === 'object' ? m.forwardedFrom : null,
      status: authorId === String(myUserId) ? myMessageStatus : undefined,
      readByUserIds: readBy,
    };
  }
  if (attachment && fileName) {
    return {
      id: String(m.id),
      authorId,
      me: authorId === String(myUserId),
      type: 'file',
      text: 'Document',
      fileName,
      fileSizeLabel,
      uri: typeof attachment.dataUrl === 'string' ? attachment.dataUrl : undefined,
      time: formatMsgTime(m.createdAt),
      createdAtIso,
      createdAtMs,
      deleted: !!m.deleted,
      replyToId: m.replyToId ? String(m.replyToId) : '',
      forwardedFrom: m.forwardedFrom && typeof m.forwardedFrom === 'object' ? m.forwardedFrom : null,
      status: authorId === String(myUserId) ? myMessageStatus : undefined,
      readByUserIds: readBy,
    };
  }
  return {
    id: String(m.id),
    authorId,
    me: authorId === String(myUserId),
    text: m.deleted ? 'This message was deleted' : String(m.body ?? ''),
    time: formatMsgTime(m.createdAt),
    createdAtIso,
    createdAtMs,
    deleted: !!m.deleted,
    replyToId: m.replyToId ? String(m.replyToId) : '',
    forwardedFrom: m.forwardedFrom && typeof m.forwardedFrom === 'object' ? m.forwardedFrom : null,
    status: authorId === String(myUserId) ? myMessageStatus : undefined,
    readByUserIds: readBy,
  };
}

/**
 * @param {Record<string, unknown>} server
 * @param {string} myId
 * @param {Record<string, { displayName: string; roleLabel: string; avatarUrl: string | null }>} directory
 */
function buildThreadDisplay(server, myId, directory) {
  const kind = String(server.kind || '');
  const scope = String(server.scope || '');
  const namePreset = server.name != null ? String(server.name) : '';

  if (kind === 'group' || scope === 'hr_group' || scope === 'tl_group') {
    const title = namePreset.trim() || 'Group';
    const listAvatarUrl = server.avatarUrl ? resolveProfileImageUri(server.avatarUrl) : null;
    return {
      listTitle: title,
      headerName: title,
      headerRole: '',
      listAvatarUrl,
    };
  }

  const members = Array.isArray(server.memberIds) ? server.memberIds.map(String) : [];
  const otherId = members.find((id) => id && id !== String(myId)) || '';
  const dir = otherId ? directory[otherId] : null;
  // NEW CODE ADDED FOR CHAT LIST NAME LOADING — avoid sticky "Chat" placeholder for DMs
  const displayName = dir?.displayName || namePreset.trim() || '';
  const roleLabel = dir?.roleLabel || '';
  return {
    listTitle: displayName || (otherId ? '' : 'Chat'),
    headerName: displayName || (otherId ? '' : 'Chat'),
    headerRole: roleLabel,
    listAvatarUrl: dir?.avatarUrl || null,
      peerId: otherId,
  };
}

/**
 * @param {{ token: string | null; user: { id?: string | number; role?: string; name?: string } | null }} args
 */
export function useGdcChatInbox({ token, user }) {
  const myId = user?.id != null ? String(user.id) : '';
  const [threads, setThreads] = useState(/** @type {Array<Record<string, unknown>>} */ ([]));
  const threadsRef = useRef(threads);
  const [contacts, setContacts] = useState(
    /** @type {Array<{ id: string; displayName: string; roleLabel: string; avatarUrl: string | null; name: string; status: string }>} */ ([]),
  );
  const [directoryRows, setDirectoryRows] = useState(
    /** @type {Array<{ id: string; displayName: string; roleLabel: string; avatarUrl: string | null; name: string; status: string }>} */ ([]),
  );
  const [onlineUserIds, setOnlineUserIds] = useState(/** @type {Set<string>} */ (new Set()));
  const [hiddenChatIds, setHiddenChatIds] = useState(/** @type {Set<string>} */ (new Set()));
  const [hiddenMessageIdsByChat, setHiddenMessageIdsByChat] = useState(
    /** @type {Record<string, Set<string>>} */ ({}),
  );
  const [inboxLoading, setInboxLoading] = useState(false);
  const [directoryHydrated, setDirectoryHydrated] = useState(false);
  const [inboxError, setInboxError] = useState(/** @type {string | null} */ (null));
  const silentRefreshTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const openChatReloadTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const typingClearTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const readAckTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const lastReadAckChatRef = useRef('');
  const scheduleMarkChatReadRef = useRef(/** @type {((chatId: string) => void) | null} */ (null));
  const flushMarkChatReadRef = useRef(/** @type {(chatId: string) => Promise<void>} */ (async () => {}));
  const applySeenToThreadRef = useRef(/** @type {(thread: Record<string, unknown>, readerId?: string) => Record<string, unknown>} */ ((t) => t));
  const typingEmitTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const lastTypingEmitRef = useRef(/** @type {{ chatId: string; typing: boolean } | null} */ (null));
  const [typingPeerId, setTypingPeerId] = useState(/** @type {string | null} */ (null));
  const hiddenChatIdsRef = useRef(hiddenChatIds);
  const hiddenMessageIdsByChatRef = useRef(hiddenMessageIdsByChat);
  const scheduleSilentThreadRefreshRef = useRef(/** @type {(() => void) | null} */ (null));
  const applyServerThreadPatchRef = useRef(/** @type {((thread: Record<string, unknown> | null, action?: Record<string, unknown>) => void) | null} */ (null));
  const evictChatFromInboxRef = useRef(/** @type {((chatId: string, opts?: { persistHide?: boolean }) => void) | null} */ (null));
  const userDirectoryByIdRef = useRef(/** @type {Record<string, { displayName: string; roleLabel: string; avatarUrl: string | null }>} */ ({}));
  const onlineUserIdsRef = useRef(/** @type {Set<string>} */ (new Set()));
  /** chatId → temp message id while attachment upload is in flight (blocks premature socket merge). */
  const outboundAttachmentUploadRef = useRef(/** @type {Map<string, string>} */ (new Map()));
  const inboxSyncedFromServerRef = useRef(false);
  /** chatId → last successful messages fetch (ms) */
  const lastMessagesLoadAtRef = useRef(/** @type {Map<string, number>} */ (new Map()));
  /** Dedupe socket deliveries (relay may hit user + chat rooms, or receiveMessage + chat.message). */
  const processedInboundMessageIdsRef = useRef(/** @type {Set<string>} */ (new Set()));
  /** chatId → last message id we already showed in the in-app banner */
  const lastNotifiedMessageIdByChatRef = useRef(/** @type {Record<string, string>} */ ({}));

  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  useEffect(() => {
    if (!token) {
      resetChatUnreadBus();
      return;
    }
    publishChatUnreadTotal(computeTotalChatUnread(threads));
  }, [token, threads]);

  useEffect(() => {
    onlineUserIdsRef.current = onlineUserIds;
  }, [onlineUserIds]);

  const [incomingNotice, setIncomingNotice] = useState(/** @type {import('@/utils/chat-in-app-notice').ChatInAppNotice | null} */ (null));

  useEffect(() => {
    if (!myId) {
      clearChatInAppNotice();
      setIncomingNotice(null);
      inboxSyncedFromServerRef.current = false;
    }
  }, [myId]);

  const dismissIncomingNotice = useCallback((chatId) => {
    setIncomingNotice((prev) => {
      if (!prev) return null;
      if (chatId != null && !threadIdEquals(prev.chatId, chatId)) return prev;
      clearChatInAppNotice();
      return null;
    });
  }, []);

  useEffect(() => {
    hiddenChatIdsRef.current = hiddenChatIds;
  }, [hiddenChatIds]);

  useEffect(() => {
    hiddenMessageIdsByChatRef.current = hiddenMessageIdsByChat;
  }, [hiddenMessageIdsByChat]);

  useEffect(() => {
    if (hiddenChatIds.size === 0) return;
    setThreads((prev) => prev.filter((t) => !hiddenChatIds.has(String(t.id))));
  }, [hiddenChatIds]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!myId) {
        setHiddenChatIds(new Set());
        setHiddenMessageIdsByChat({});
        return;
      }
      const [chatIds, messagePairs] = await Promise.all([
        readStringSet(storageKey(HIDDEN_CHAT_IDS_PREFIX, myId)),
        readStringSet(storageKey(HIDDEN_MESSAGE_IDS_PREFIX, myId)),
      ]);
      if (cancelled) return;
      const byChat = {};
      for (const pair of messagePairs) {
        const [chatId, messageId] = String(pair).split(':');
        if (!chatId || !messageId) continue;
        if (!byChat[chatId]) byChat[chatId] = new Set();
        byChat[chatId].add(messageId);
      }
      setHiddenChatIds(chatIds);
      setHiddenMessageIdsByChat(byChat);
    })();
    return () => {
      cancelled = true;
    };
  }, [myId]);

  const userDirectoryById = useMemo(() => {
    const m = /** @type {Record<string, { displayName: string; roleLabel: string; avatarUrl: string | null }>} */ ({});
    for (const c of directoryRows) {
      m[String(c.id)] = {
        displayName: c.displayName || c.name,
        roleLabel: c.roleLabel || c.status || '',
        avatarUrl: c.avatarUrl || null,
      };
    }
    for (const c of contacts) {
      m[String(c.id)] = {
        displayName: c.displayName || c.name,
        roleLabel: c.roleLabel || c.status || '',
        avatarUrl: c.avatarUrl || null,
      };
    }
    if (myId) {
      const selfName = String(user?.name || 'You').trim();
      const selfRole = user?.role != null ? String(user.role) : '';
      m[myId] = {
        displayName: selfName,
        roleLabel: formatDisplayRole(selfRole),
        avatarUrl: resolveProfileImageUri(user?.avatar),
      };
    }
    return m;
  }, [contacts, directoryRows, myId, user?.avatar, user?.name, user?.role]);

  useEffect(() => {
    userDirectoryByIdRef.current = userDirectoryById;
  }, [userDirectoryById]);

  const loadContacts = useCallback(async () => {
    if (!token || !user) {
      setContacts([]);
      setDirectoryRows([]);
      setDirectoryHydrated(false);
      return;
    }
    try {
      const mapRows = (items) =>
        (Array.isArray(items) ? items : [])
          .map((u) => {
            const id = u?.id != null ? String(u.id) : u?.user_id != null ? String(u.user_id) : '';
            if (!id || id === myId) return null;
            const mapped = mapDirectoryUser(id, u);
            return {
              ...mapped,
              name: mapped.displayName,
              status: mapped.roleLabel,
              online: false,
              gdc_id: u?.gdc_id != null ? String(u.gdc_id) : u?.gdcId != null ? String(u.gdcId) : '',
              email: u?.email != null ? String(u.email) : '',
            };
          })
          .filter(Boolean);

      let allDirectoryRows = [];
      try {
        const allUsers = await listAuthUsers(token);
        allDirectoryRows = mapRows(Array.isArray(allUsers) ? allUsers : allUsers?.data);
      } catch {
        allDirectoryRows = [];
      }

      let rows = [];
      if (isAdminRole(user.role) || user.role === 'HR') {
        let data = [];
        try {
          const res = await getAllUsers(token, { approvedOnly: true });
          data = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        } catch {
          data = allDirectoryRows;
        }
        rows = mapRows(data).filter((row) => canStartPersonalChat(user.role, row.roleLabel));
      } else {
        let members = [];
        try {
          const visible = await getVisibleDirectory(token);
          members = Array.isArray(visible?.members) ? visible.members : Array.isArray(visible?.data) ? visible.data : [];
        } catch {
          const roster = await getMyTeamRoster(token);
          members = Array.isArray(roster?.members) ? roster.members : [];
        }
        rows = mapRows(members).filter((row) => canStartPersonalChat(user.role, row.roleLabel));
      }
      const mergedList = mergeDirectoryLists(allDirectoryRows, rows);
      setDirectoryRows(mergedList);
      setContacts(rows);
      setDirectoryHydrated(true);
      if (myId) {
        void AsyncStorage.setItem(storageKey(DIRECTORY_CACHE_PREFIX, myId), JSON.stringify(mergedList)).catch(
          () => {},
        );
      }
    } catch {
      setContacts([]);
      setDirectoryRows([]);
      setDirectoryHydrated(true);
    }
  }, [token, user, myId]);

  const mergeSnapshotRows = useCallback(
    (snapRows) => {
      const mapped = (Array.isArray(snapRows) ? snapRows : [])
        .map((u) => {
          const id = u?.id != null ? String(u.id) : '';
          if (!id || id === myId) return null;
          const m = mapDirectoryUser(id, u);
          return {
            ...m,
            name: m.displayName,
            status: m.roleLabel,
            online: false,
          };
        })
        .filter(Boolean);
      if (!mapped.length) return;
      setDirectoryRows((prev) => mergeDirectoryLists(prev, mapped));
      setContacts((prev) => mergeDirectoryLists(prev, mapped));
    },
    [myId],
  );

  const hydrateChatParticipants = useCallback(
    async (userIds) => {
      if (!token || !myId) return;
      const dir = userDirectoryByIdRef.current;
      const need = [...new Set((userIds || []).map(String).filter((id) => id && id !== myId))].filter(
        (id) => !dir[id]?.avatarUrl,
      );
      if (!need.length) return;
      try {
        const res = await fetchChatParticipantSnapshots(token, need.slice(0, 120));
        const data = Array.isArray(res?.data) ? res.data : [];
        mergeSnapshotRows(data);
      } catch {
        /* snapshots optional */
      }
    },
    [token, myId, mergeSnapshotRows],
  );

  const mapServerThreads = useCallback(
    (rawList, opts = {}) => {
      const syncFromServer = !!opts.syncFromServer;
      const preserveMessageChatId = opts.preserveMessageChatId
        ? String(opts.preserveMessageChatId)
        : '';
      const prevById = new Map(threadsRef.current.map((t) => [String(t.id), t]));
      return rawList.filter((server) => !hiddenChatIds.has(String(server?.id ?? ''))).map((server) => {
        const id = String(server.id);
        const old = prevById.get(id);
        const display = buildThreadDisplay(server, myId, userDirectoryById);
        const preserveOpenMessages =
          syncFromServer &&
          preserveMessageChatId &&
          id === preserveMessageChatId &&
          old &&
          Array.isArray(old.messages) &&
          old.messages.length > 0;
        const mergedMessages = preserveOpenMessages
          ? old.messages.filter((m) => !hiddenMessageIdsByChat[id]?.has(String(m.id)))
          : syncFromServer
            ? []
            : old && Array.isArray(old.messages) && old.messages.length > 0
              ? old.messages.filter((m) => !hiddenMessageIdsByChat[id]?.has(String(m.id)))
              : [];
        const mergedUnread = syncFromServer && !preserveOpenMessages ? 0 : old ? Number(old.unread) || 0 : 0;
        const threadPreview =
          syncFromServer && !preserveOpenMessages ? null : (old?.threadPreview ?? null);
        const messagesHasMore = syncFromServer
          ? preserveOpenMessages
            ? old?.messagesHasMore !== undefined
              ? old.messagesHasMore
              : true
            : true
          : old?.messagesHasMore !== undefined
            ? old.messagesHasMore
            : true;
        return {
          id,
          server,
          name: display.listTitle,
          listTitle: display.listTitle,
          headerName: display.headerName,
          headerRole: display.headerRole,
          listAvatarUrl: display.listAvatarUrl,
          peerId: display.peerId || '',
          isOnline: display.peerId ? onlineUserIds.has(display.peerId) : false,
          unread: mergedUnread,
          messages: mergedMessages,
          threadPreview,
          messagesHasMore,
          messagesLoadingOlder: false,
        };
      });
    },
    [hiddenChatIds, hiddenMessageIdsByChat, myId, onlineUserIds, userDirectoryById],
  );

  const refreshThreads = useCallback(
    async (opts = {}) => {
      const silent = !!opts.silent;
      /** Full reset only when explicitly requested (pull-to-refresh). Default: merge thread list, keep cached messages. */
      const syncFromServer = !!opts.syncFromServer;
      if (!token || !myId) {
        setThreads([]);
        return;
      }
      const hadThreads = threadsRef.current.length > 0;
      const showSpinner = !silent && !hadThreads;
      if (showSpinner) {
        setInboxLoading(true);
        setInboxError(null);
      }
      try {
        const list = await listChatThreads(token);
        const openChatId = selectedChatIdRef.current ? String(selectedChatIdRef.current) : '';
        const mapped = mapServerThreads(list, {
          syncFromServer,
          preserveMessageChatId: syncFromServer && openChatId ? openChatId : '',
        });
        const serverIds = new Set(mapped.map((t) => String(t.id)));
        setThreads(sortThreadsByRecent(mapped));
        void hydrateChatParticipants(collectThreadParticipantIds(mapped, myId));
        if (selectedChatIdRef.current && !serverIds.has(selectedChatIdRef.current)) {
          selectedChatIdRef.current = null;
          setTypingPeerId(null);
        }
        if (showSpinner) setInboxError(null);
      } catch (e) {
        const msg = e instanceof ChatApiError ? e.message : e instanceof Error ? e.message : 'Could not load chats';
        if (!silent) setInboxError(msg);
        if (!silent && !hadThreads) {
          setThreads([]);
        }
      } finally {
        if (showSpinner) setInboxLoading(false);
      }
    },
    [token, myId, mapServerThreads, hydrateChatParticipants],
  );

  const loadContactsRef = useRef(loadContacts);
  const hydrateChatParticipantsRef = useRef(hydrateChatParticipants);
  const refreshThreadsRef = useRef(refreshThreads);

  useEffect(() => {
    loadContactsRef.current = loadContacts;
  }, [loadContacts]);

  useEffect(() => {
    hydrateChatParticipantsRef.current = hydrateChatParticipants;
  }, [hydrateChatParticipants]);

  useEffect(() => {
    refreshThreadsRef.current = refreshThreads;
  }, [refreshThreads]);

  const refreshThreadsImmediate = useCallback(() => {
    if (silentRefreshTimerRef.current) {
      clearTimeout(silentRefreshTimerRef.current);
      silentRefreshTimerRef.current = null;
    }
    void refreshThreads({ silent: true });
  }, [refreshThreads]);

  const scheduleSilentThreadRefresh = useCallback(() => {
    if (silentRefreshTimerRef.current) clearTimeout(silentRefreshTimerRef.current);
    silentRefreshTimerRef.current = setTimeout(() => {
      silentRefreshTimerRef.current = null;
      void refreshThreads({ silent: true });
    }, 180);
  }, [refreshThreads]);

  useEffect(() => {
    scheduleSilentThreadRefreshRef.current = scheduleSilentThreadRefresh;
  }, [scheduleSilentThreadRefresh]);

  useFocusEffect(
    useCallback(() => {
      if (!token || !myId) return undefined;
      let cancelled = false;
      (async () => {
        await loadContactsRef.current();
        if (cancelled) return;
        const silent = threadsRef.current.length > 0;
        const needsFullSync = !inboxSyncedFromServerRef.current;
        await refreshThreadsRef.current({
          silent,
          syncFromServer: needsFullSync,
        });
        inboxSyncedFromServerRef.current = true;
      })();
      return () => {
        cancelled = true;
      };
    }, [myId, token]),
  );

  /** Light inbox sync while dashboard is open (metadata only — keeps in-memory messages). */
  useEffect(() => {
    if (!token || !myId) return undefined;

    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void loadContactsRef.current?.();
        void refreshThreadsRef.current?.({ silent: true });
      }
    });

    const poll = setInterval(() => {
      void refreshThreadsRef.current?.({ silent: true });
    }, 90000);

    return () => {
      appSub.remove();
      clearInterval(poll);
    };
  }, [token, myId]);

  useEffect(
    () => () => {
      if (silentRefreshTimerRef.current) clearTimeout(silentRefreshTimerRef.current);
      if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    setThreads((prev) => {
      let changed = false;
      const next = prev.map((row) => {
        const server = row.server;
        if (!server || typeof server !== 'object') return row;
        const display = buildThreadDisplay(server, myId, userDirectoryById);
        const peerId = display.peerId || '';
        const isOnline = peerId ? onlineUserIds.has(peerId) : false;
        if (
          row.name === display.listTitle &&
          row.listTitle === display.listTitle &&
          row.headerName === display.headerName &&
          row.headerRole === display.headerRole &&
          row.listAvatarUrl === display.listAvatarUrl &&
          row.peerId === peerId &&
          row.isOnline === isOnline
        ) {
          return row;
        }
        changed = true;
        return {
          ...row,
          name: display.listTitle,
          listTitle: display.listTitle,
          headerName: display.headerName,
          headerRole: display.headerRole,
          listAvatarUrl: display.listAvatarUrl,
          peerId,
          isOnline,
        };
      });
      return changed ? next : prev;
    });
  }, [onlineUserIds, userDirectoryById, myId]);

  useEffect(() => {
    const markOnline = (row) => ({ ...row, online: onlineUserIds.has(String(row.id)) });
    setContacts((prev) => prev.map(markOnline));
    setDirectoryRows((prev) => prev.map(markOnline));
  }, [onlineUserIds]);

  const selectedChatIdRef = useRef(/** @type {string | null} */ (null));
  const [activeChatId, setActiveChatIdState] = useState(/** @type {string | null} */ (null));

  const setActiveChatId = useCallback((chatId) => {
    const id = chatId != null ? String(chatId).trim() : '';
    selectedChatIdRef.current = id || null;
    setActiveChatIdState(id || null);
    if (!id) setTypingPeerId(null);
  }, []);

  const loadMessagesForChat = useCallback(
    async (chatId, opts = {}) => {
      if (!token || !chatId) return;
      const limit = opts.limit != null ? Number(opts.limit) : 80;
      const rows = await listChatMessages(token, chatId, { limit, before: opts.before });
      const hiddenForChat = hiddenMessageIdsByChat[String(chatId)] || new Set();
      const ui = rows.map((m) => mapApiMessageToUi(m, myId)).filter((m) => !hiddenForChat.has(String(m.id)));
      const hasMore = rows.length >= limit;
      setThreads((prev) =>
        prev.map((t) => {
          if (!threadIdEquals(t.id, chatId)) return t;
          if (opts.before) {
            const existing = Array.isArray(t.messages) ? t.messages : [];
            const merged = sortChatMessages([...existing, ...ui.filter((n) => !existing.some((e) => e.id === n.id))]);
            return { ...t, messages: merged, messagesHasMore: hasMore, messagesLoadingOlder: false };
          }
          const existing = Array.isArray(t.messages) ? t.messages : [];
          const merged = mergeMessagesWithLocal(ui, existing);
          const preview =
            t.threadPreview && merged.some((m) => String(m.id) === String(t.threadPreview.id))
              ? mergeOutgoingDeliveryState(
                  merged.find((m) => String(m.id) === String(t.threadPreview.id)) || t.threadPreview,
                  t.threadPreview,
                )
              : merged.length
                ? merged[merged.length - 1]
                : t.threadPreview;
          return { ...t, messages: merged, messagesHasMore: hasMore, messagesLoadingOlder: false, threadPreview: preview };
        }),
      );
      lastMessagesLoadAtRef.current.set(String(chatId), Date.now());
    },
    [hiddenMessageIdsByChat, token, myId],
  );

  const loadOlderMessages = useCallback(
    async (chatId) => {
      if (!token || !chatId) return;
      const t = threadsRef.current.find((x) => x.id === chatId);
      const msgs = Array.isArray(t?.messages) ? t.messages : [];
      if (!t?.messagesHasMore || t?.messagesLoadingOlder || msgs.length === 0) return;
      const oldest = msgs[0];
      const before = oldest?.createdAtIso;
      if (!before) return;
      setThreads((prev) =>
        prev.map((row) => (threadIdEquals(row.id, chatId) ? { ...row, messagesLoadingOlder: true } : row)),
      );
      try {
        await loadMessagesForChat(chatId, { limit: 40, before });
      } finally {
        setThreads((prev) =>
          prev.map((row) => (threadIdEquals(row.id, chatId) ? { ...row, messagesLoadingOlder: false } : row)),
        );
      }
    },
    [token, loadMessagesForChat],
  );

  const patchThreadDisplayFromDirectory = useCallback(
    (chatId) => {
      const id = String(chatId || '').trim();
      if (!id) return;
      setThreads((prev) =>
        prev.map((t) => {
          if (String(t.id) !== id) return t;
          const server = t.server && typeof t.server === 'object' ? t.server : {};
          const display = buildThreadDisplay(server, myId, userDirectoryById);
          return {
            ...t,
            name: display.listTitle,
            listTitle: display.listTitle,
            headerName: display.headerName,
            headerRole: display.headerRole,
            listAvatarUrl: display.listAvatarUrl,
            peerId: display.peerId || t.peerId || '',
            isOnline: display.peerId ? onlineUserIds.has(display.peerId) : t.isOnline,
          };
        }),
      );
    },
    [myId, onlineUserIds, userDirectoryById],
  );

  const patchThreadDisplayFromDirectoryRef = useRef(patchThreadDisplayFromDirectory);
  useEffect(() => {
    patchThreadDisplayFromDirectoryRef.current = patchThreadDisplayFromDirectory;
  }, [patchThreadDisplayFromDirectory]);

  const applySeenToThread = useCallback((thread, readerId) => {
    const reader = String(readerId || '').trim();
    const messages = (Array.isArray(thread.messages) ? thread.messages : []).map((m) => {
      if (!m.me || m.status === 'seen') return m;
      const readBy = Array.isArray(m.readByUserIds) ? [...m.readByUserIds] : [];
      if (reader && !readBy.includes(reader)) readBy.push(reader);
      return { ...m, status: 'seen', readByUserIds: readBy, uploadProgress: undefined };
    });
    const preview =
      thread.threadPreview?.me && thread.threadPreview.status !== 'seen'
        ? { ...thread.threadPreview, status: 'seen' }
        : thread.threadPreview;
    return { ...thread, messages, threadPreview: preview };
  }, []);

  // NEW CODE ADDED FOR REAL-TIME SEEN TICK FIX — socket fallback when HTTP relay is unavailable
  const emitMessageSeenSocket = useCallback(
    (chatId) => {
      const id = String(chatId || '').trim();
      if (!id || !myId) return;
      const sock = getGdcSocket();
      if (!sock?.connected) return;
      const body = { chatId: id, readerId: String(myId), at: Date.now() };
      sock.emit('message_seen', body);
    },
    [myId],
  );

  const flushMarkChatRead = useCallback(
    async (chatId) => {
      const id = String(chatId || '').trim();
      if (!token || !id || !threadIdEquals(selectedChatIdRef.current, id)) return;
      try {
        await markChatRead(token, id);
        emitMessageSeenSocket(id);
      } catch {
        emitMessageSeenSocket(id);
      }
    },
    [token, emitMessageSeenSocket],
  );

  useEffect(() => {
    applySeenToThreadRef.current = applySeenToThread;
  }, [applySeenToThread]);

  useEffect(() => {
    flushMarkChatReadRef.current = flushMarkChatRead;
  }, [flushMarkChatRead]);

  // NEW CODE ADDED FOR REAL-TIME SEEN TICK FIX — debounced read ack while receiver has chat open
  scheduleMarkChatReadRef.current = (chatId) => {
    const id = String(chatId || '').trim();
    if (!token || !id || !threadIdEquals(selectedChatIdRef.current, id)) return;
    if (readAckTimerRef.current) clearTimeout(readAckTimerRef.current);
    readAckTimerRef.current = setTimeout(() => {
      readAckTimerRef.current = null;
      lastReadAckChatRef.current = id;
      void flushMarkChatReadRef.current(id);
    }, 120);
  };

  const openChat = useCallback(
    async (chatId, opts = {}) => {
      if (!token || !chatId) return;
      const id = String(chatId).trim();
      selectedChatIdRef.current = id;
      setTypingPeerId(null);
      patchThreadDisplayFromDirectory(id);
      const active = threadsRef.current.find((t) => threadIdEquals(t.id, id));
      const peerIds = active?.peerId
        ? [String(active.peerId)]
        : Array.isArray(active?.server?.memberIds)
          ? active.server.memberIds.map(String)
          : [];
      void hydrateChatParticipantsRef.current?.(peerIds);
      const sock = ensureGdcSocketConnected(token, myId);
      sock?.emit('joinRoom', id);
      lastReadAckChatRef.current = '';
      setThreads((prev) => prev.map((t) => (threadIdEquals(t.id, id) ? { ...t, unread: 0 } : t)));
      dismissIncomingNotice(id);
      void deleteNotificationByEventKey(token, `chat-msg-${id}`)
        .catch(() => {})
        .finally(() => invalidateNotificationInbox());

      const hasCached = Array.isArray(active?.messages) && active.messages.length > 0;
      const lastLoad = lastMessagesLoadAtRef.current.get(id) || 0;
      const stale = Date.now() - lastLoad > 25000;
      const force = !!opts.force;

      if (!hasCached || force) {
        void loadMessagesForChat(id).catch(() => {});
      } else if (stale) {
        void loadMessagesForChat(id).catch(() => {});
      } else {
        setTimeout(() => {
          if (!threadIdEquals(selectedChatIdRef.current, id)) return;
          void loadMessagesForChat(id).catch(() => {});
        }, 600);
      }

      void flushMarkChatReadRef.current(id).catch(() => {});
      patchThreadDisplayFromDirectory(id);
    },
    [token, myId, loadMessagesForChat, patchThreadDisplayFromDirectory, dismissIncomingNotice],
  );

  /** Opens or creates DM without loading messages (fast path for picker → chat). */
  const ensureDmChat = useCallback(
    async (otherUserId) => {
      if (!token || !myId) throw new Error('Not signed in');
      const thread = await openDmChat(token, { otherUserId: String(otherUserId) });
      const id = thread && typeof thread === 'object' && thread.id != null ? String(thread.id) : '';
      if (id && thread) {
        setThreads((prev) => {
          if (prev.some((t) => threadIdEquals(t.id, id))) return sortThreadsByRecent(prev);
          const mapped = mapServerThreads([thread]);
          return sortThreadsByRecent([...mapped, ...prev]);
        });
      }
      void refreshThreads({ silent: true });
      return id;
    },
    [token, myId, mapServerThreads, refreshThreads],
  );

  const startDm = useCallback(
    async (otherUserId) => {
      const id = await ensureDmChat(otherUserId);
      if (id) await openChat(id);
      return id;
    },
    [ensureDmChat, openChat],
  );

  const evictChatFromInbox = useCallback(
    (chatId, { persistHide = false } = {}) => {
      const cid = String(chatId || '').trim();
      if (!cid) return;

      dismissIncomingNotice(cid);

      if (threadIdEquals(selectedChatIdRef.current, cid)) {
        selectedChatIdRef.current = null;
        setActiveChatIdState(null);
        setTypingPeerId(null);
        lastReadAckChatRef.current = '';
        if (readAckTimerRef.current) {
          clearTimeout(readAckTimerRef.current);
          readAckTimerRef.current = null;
        }
        getGdcSocket()?.emit('leaveRoom', cid);
      }

      if (persistHide && myId) {
        setHiddenChatIds((prev) => {
          if (prev.has(cid)) return prev;
          const next = new Set(prev);
          next.add(cid);
          void writeStringSet(storageKey(HIDDEN_CHAT_IDS_PREFIX, myId), next);
          return next;
        });
      }

      setThreads((prev) => {
        const next = prev.filter((t) => !threadIdEquals(t.id, cid));
        return next.length === prev.length ? prev : next;
      });
    },
    [dismissIncomingNotice, myId],
  );

  const applyServerThreadPatch = useCallback(
    (serverThread, action = {}) => {
      const actionName = action?.action ? String(action.action) : '';
      const cid =
        action?.chatId != null
          ? String(action.chatId)
          : serverThread && typeof serverThread === 'object' && serverThread.id != null
            ? String(serverThread.id)
            : '';
      const removedIds = Array.isArray(action?.removedIds) ? action.removedIds.map(String) : [];
      const iWasRemoved = !!(myId && removedIds.includes(String(myId)));

      if (actionName === 'group_deleted' || iWasRemoved) {
        if (cid) evictChatFromInbox(cid, { persistHide: true });
        return;
      }

      if (!serverThread || typeof serverThread !== 'object') {
        return;
      }

      const mapped = mapServerThreads([serverThread]);
      if (!mapped.length) return;
      const row = mapped[0];
      const threadId = String(serverThread.id ?? row.id);
      const members = Array.isArray(serverThread.memberIds) ? serverThread.memberIds.map(String) : [];
      const iAmMember = myId && members.includes(String(myId));
      const joinedViaAdd =
        actionName === 'member_added' &&
        Array.isArray(action?.memberIds) &&
        action.memberIds.map(String).includes(String(myId));

      if (!iAmMember) {
        evictChatFromInbox(threadId, { persistHide: true });
        return;
      }

      setThreads((prev) => {
        const idx = prev.findIndex((t) => threadIdEquals(t.id, threadId));
        if (idx >= 0) {
          const old = prev[idx];
          const next = [...prev];
          let unread = Number(old.unread) || 0;
          if (joinedViaAdd && iAmMember) unread = Math.max(unread, 1);
          next[idx] = {
            ...old,
            ...row,
            server: serverThread,
            messages: Array.isArray(old.messages) ? old.messages : [],
            unread,
            threadPreview: old.threadPreview ?? row.threadPreview,
          };
          return sortThreadsByRecent(next);
        }
        return sortThreadsByRecent([
          {
            ...row,
            server: serverThread,
            unread: joinedViaAdd ? 1 : 0,
            messages: [],
            threadPreview: null,
          },
          ...prev,
        ]);
      });
    },
    [evictChatFromInbox, mapServerThreads, myId],
  );

  const createGroup = useCallback(
    async ({
      name,
      memberIds,
      scope,
      privacyLockedInvites,
      adminsOnlyMessages,
      avatarUrl,
      idempotencyKey,
      openAfterCreate = true,
    }) => {
      if (!token || !myId) throw new Error('Not signed in');
      const unique = Array.from(new Set([myId, ...memberIds.map(String)])).filter(Boolean);
      const idem = idempotencyKey || createGroupIdempotencyKey();
      const guardKey = buildGroupCreateKey({
        name: name || 'Group',
        memberIds: unique,
        creatorId: myId,
        idempotencyKey: idem,
      });

      return runGroupCreateOnce(guardKey, async () => {
        let resolvedAvatar = avatarUrl;
        if (resolvedAvatar && !String(resolvedAvatar).startsWith('http')) {
          try {
            const { dataUrl } = await readLocalUriAsDataUrl(String(resolvedAvatar), 'image/jpeg', 'group.jpg');
            resolvedAvatar = dataUrl;
          } catch {
            resolvedAvatar = undefined;
          }
        }
        const thread = await createGroupChat(token, {
          scope,
          name: name || 'Group',
          memberIds: unique,
          privacyLockedInvites: !!privacyLockedInvites,
          adminsOnlyMessages: !!adminsOnlyMessages,
          avatarUrl: resolvedAvatar,
          idempotencyKey: idem,
        });
        const id = thread && typeof thread === 'object' && thread.id != null ? String(thread.id) : '';
        if (id) {
          applyServerThreadPatch(thread, { action: 'group_created', chatId: id });
          refreshThreadsImmediate();
          if (openAfterCreate) await openChat(id);
        } else {
          await refreshThreads({ silent: true });
        }
        return { id, thread: thread && typeof thread === 'object' ? thread : null };
      });
    },
    [
      token,
      myId,
      applyServerThreadPatch,
      refreshThreads,
      openChat,
      refreshThreadsImmediate,
    ],
  );

  const patchGroupFromServer = useCallback(
    async (chatId, patches) => {
      if (!token || !chatId) throw new Error('Missing chat');
      const body = { ...patches };
      if (body.avatarUrl && !String(body.avatarUrl).startsWith('http')) {
        try {
          const { dataUrl } = await readLocalUriAsDataUrl(String(body.avatarUrl), 'image/jpeg', 'group.jpg');
          body.avatarUrl = dataUrl;
        } catch {
          delete body.avatarUrl;
        }
      }
      const thread = await updateGroupChat(token, chatId, body);
      if (thread) applyServerThreadPatch(thread, { action: 'group_updated', chatId });
      return thread;
    },
    [token, applyServerThreadPatch],
  );

  const addGroupMembersToChat = useCallback(
    async (chatId, memberIds) => {
      if (!token || !chatId) throw new Error('Missing chat');
      const thread = await addGroupMembers(token, chatId, { memberIds: memberIds.map(String) });
      if (thread) {
        applyServerThreadPatch(thread, { action: 'member_added', chatId, memberIds: memberIds.map(String) });
        refreshThreadsImmediate();
      }
      return thread;
    },
    [token, applyServerThreadPatch, refreshThreadsImmediate],
  );

  const removeGroupMembersFromChat = useCallback(
    async (chatId, memberIds) => {
      if (!token || !chatId) throw new Error('Missing chat');
      const res = await removeGroupMembers(token, chatId, { memberIds: memberIds.map(String) });
      const thread = res && typeof res === 'object' && 'memberIds' in res ? res : res?.data;
      if (thread && typeof thread === 'object') {
        applyServerThreadPatch(thread, { action: 'member_removed', chatId, removedIds: memberIds });
      } else {
        refreshThreadsImmediate();
      }
      return thread;
    },
    [token, applyServerThreadPatch, refreshThreadsImmediate],
  );

  const leaveGroup = useCallback(
    async (chatId) => {
      if (!token || !chatId) throw new Error('Missing chat');
      const res = await leaveGroupChat(token, chatId);
      if (res && typeof res === 'object' && res.deleted) {
        evictChatFromInbox(chatId, { persistHide: true });
      } else if (res && typeof res === 'object') {
        applyServerThreadPatch(res, { action: 'member_removed', chatId, removedIds: [myId] });
      }
      refreshThreadsImmediate();
    },
    [token, myId, applyServerThreadPatch, evictChatFromInbox, refreshThreadsImmediate],
  );

  const deleteGroup = useCallback(
    async (chatId) => {
      if (!token || !chatId) throw new Error('Missing chat');
      await deleteGroupChat(token, chatId);
      evictChatFromInbox(chatId, { persistHide: true });
      refreshThreadsImmediate();
    },
    [token, evictChatFromInbox, refreshThreadsImmediate],
  );

  const promoteGroupMemberAdmin = useCallback(
    async (chatId, memberId) => {
      if (!token || !chatId) throw new Error('Missing chat');
      const thread = await promoteGroupAdmin(token, chatId, { memberId: String(memberId) });
      if (thread) applyServerThreadPatch(thread, { action: 'group_updated', chatId });
      return thread;
    },
    [token, applyServerThreadPatch],
  );

  const demoteGroupMemberAdmin = useCallback(
    async (chatId, memberId) => {
      if (!token || !chatId) throw new Error('Missing chat');
      const thread = await demoteGroupAdmin(token, chatId, String(memberId));
      if (thread) applyServerThreadPatch(thread, { action: 'group_updated', chatId });
      return thread;
    },
    [token, applyServerThreadPatch],
  );

  useEffect(() => {
    applyServerThreadPatchRef.current = applyServerThreadPatch;
  }, [applyServerThreadPatch]);

  useEffect(() => {
    evictChatFromInboxRef.current = evictChatFromInbox;
  }, [evictChatFromInbox]);

  const sendText = useCallback(
    async (chatId, text, options = {}) => {
      if (!token || !chatId) return;
      const trimmed = String(text || '').trim();
      if (!trimmed) return;
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const nowIso = new Date().toISOString();
      const optimisticUi = {
        id: tempId,
        me: true,
        text: trimmed,
        time: formatMsgTime(nowIso),
        createdAtIso: nowIso,
        createdAtMs: Date.now(),
        replyToId: options.replyToId ? String(options.replyToId) : '',
        forwardedFrom: options.forwardedFrom && typeof options.forwardedFrom === 'object' ? options.forwardedFrom : null,
        status: 'sending',
      };
      setThreads((prev) => {
        const exists = prev.some((t) => threadIdEquals(t.id, chatId));
        const next = exists
          ? prev.map((t) =>
              threadIdEquals(t.id, chatId)
                ? {
                    ...t,
                    messages: mergeMessageList(Array.isArray(t.messages) ? t.messages : [], optimisticUi),
                    threadPreview: optimisticUi,
                  }
                : t,
            )
          : [
              ...prev,
              {
                id: String(chatId),
                server: { id: String(chatId), kind: 'dm', memberIds: [myId] },
                name: 'Chat',
                listTitle: 'Chat',
                headerName: 'Chat',
                headerRole: '',
                messages: [optimisticUi],
                threadPreview: optimisticUi,
                unread: 0,
                messagesHasMore: true,
                messagesLoadingOlder: false,
              },
            ];
        return sortThreadsByRecent(next);
      });
      try {
        const msg = await postChatMessage(token, chatId, {
          body: trimmed,
          replyToId: options.replyToId ? String(options.replyToId) : undefined,
          forwardedFrom: options.forwardedFrom && typeof options.forwardedFrom === 'object' ? options.forwardedFrom : undefined,
        });
        if (!msg || typeof msg !== 'object') return;
        const ui = finalizeOutgoingMessage(mapApiMessageToUi(msg, myId));
        setThreads((prev) =>
          sortThreadsByRecent(
            prev.map((t) => {
              if (!threadIdEquals(t.id, chatId)) return t;
              const msgs = Array.isArray(t.messages) ? t.messages : [];
              const next = reconcileOutgoingMessage(msgs, tempId, ui);
              return { ...t, messages: next, threadPreview: ui };
            }),
          ),
        );
        getGdcSocket()?.emit('sendMessage', { chatId: String(chatId), message: msg });
      } catch (e) {
        setThreads((prev) =>
          prev.map((t) =>
            threadIdEquals(t.id, chatId)
              ? {
                  ...t,
                  messages: (Array.isArray(t.messages) ? t.messages : []).map((m) =>
                    m.id === tempId ? { ...m, status: 'failed', uploadProgress: undefined } : m,
                  ),
                }
              : t,
          ),
        );
        throw e;
      }
    },
    [token, myId],
  );

  const sendAttachment = useCallback(
    async (chatId, { uri, mimeType, fileName, sizeBytes: hintedSize }, opts = {}) => {
      const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : () => {};
      if (!token || !chatId || !uri) throw new Error('Missing attachment data');
      const safeName = fileName && String(fileName).trim() ? String(fileName).trim() : 'file';
      const mime = mimeType && String(mimeType).trim() ? String(mimeType).trim() : 'application/octet-stream';
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const nowIso = new Date().toISOString();
      const nowMs = Date.now();
      const isImg = mime.startsWith('image/');
      const sizeHint =
        typeof hintedSize === 'number' && Number.isFinite(hintedSize) && hintedSize >= 0
          ? formatFileSize(hintedSize)
          : '';
      outboundAttachmentUploadRef.current.set(String(chatId), tempId);
      const optimisticUi = isImg
        ? {
            id: tempId,
            me: true,
            type: 'image',
            text: 'Photo',
            uri: String(uri),
            time: formatMsgTime(nowIso),
            createdAtIso: nowIso,
            createdAtMs: nowMs,
            status: 'sending',
            uploadProgress: 0,
          }
        : {
            id: tempId,
            me: true,
            type: 'file',
            text: 'Document',
            fileName: safeName,
            fileSizeLabel: sizeHint,
            uri: String(uri),
            time: formatMsgTime(nowIso),
            createdAtIso: nowIso,
            createdAtMs: nowMs,
            status: 'sending',
            uploadProgress: 0,
          };

      const patchOptimistic = (patch) => {
        setThreads((prev) =>
          prev.map((t) => {
            if (!threadIdEquals(t.id, chatId)) return t;
            const msgs = Array.isArray(t.messages) ? t.messages : [];
            const nextMsgs = msgs.map((m) => (m.id === tempId ? { ...m, ...patch } : m));
            const preview = t.threadPreview?.id === tempId ? { ...t.threadPreview, ...patch } : t.threadPreview;
            return { ...t, messages: nextMsgs, threadPreview: preview };
          }),
        );
      };

      setThreads((prev) =>
        prev.map((t) =>
          threadIdEquals(t.id, chatId)
            ? {
                ...t,
                messages: mergeMessageList(Array.isArray(t.messages) ? t.messages : [], optimisticUi),
                threadPreview: optimisticUi,
              }
            : t,
        ),
      );
      const reportUpload = (ratio) => {
        const v = Math.min(0.99, Math.max(0, ratio));
        onProgress(v);
        patchOptimistic({ uploadProgress: v, status: 'sending' });
      };

      reportUpload(0);
      try {
        const readMaxMs =
          typeof hintedSize === 'number' && hintedSize > 0
            ? Math.min(14000, 2500 + hintedSize / 6000)
            : 7000;
        const { dataUrl, byteLength } = await runWithTransferProgress(
          () => readLocalUriAsDataUrl(uri, mimeType, fileName),
          reportUpload,
          { from: 0, to: 0.52, maxMs: readMaxMs },
        );

        const attachment = {
          mimeType: mime,
          fileName: safeName,
          dataUrl,
          sizeBytes: byteLength,
        };
        const postMaxMs =
          typeof byteLength === 'number' && byteLength > 0
            ? Math.min(16000, 3000 + byteLength / 5000)
            : 9000;
        const postAnim = startTransferProgressAnimator(reportUpload, {
          from: 0.52,
          to: 0.96,
          maxMs: postMaxMs,
        });
        let msg;
        try {
          msg = await postChatMessage(token, chatId, { body: '', attachment });
          postAnim.complete(0.99);
        } catch (postErr) {
          postAnim.cancel();
          throw postErr;
        }
        if (!msg || typeof msg !== 'object') {
          outboundAttachmentUploadRef.current.delete(String(chatId));
          return;
        }

        reportUpload(1);
        const ui = finalizeOutgoingMessage(mapApiMessageToUi(msg, myId));
        setThreads((prev) =>
          prev.map((t) => {
            if (!threadIdEquals(t.id, chatId)) return t;
            const msgs = Array.isArray(t.messages) ? t.messages : [];
            const next = reconcileOutgoingMessage(msgs, tempId, ui);
            return { ...t, messages: next, threadPreview: ui };
          }),
        );
        outboundAttachmentUploadRef.current.delete(String(chatId));
        onProgress(1);
      } catch (e) {
        outboundAttachmentUploadRef.current.delete(String(chatId));
        setThreads((prev) =>
          prev.map((t) =>
            threadIdEquals(t.id, chatId)
              ? {
                  ...t,
                  messages: (Array.isArray(t.messages) ? t.messages : []).map((m) =>
                    m.id === tempId ? { ...m, status: 'failed', uploadProgress: undefined } : m,
                  ),
                }
              : t,
          ),
        );
        throw e;
      }
    },
    [token, myId],
  );

  const emitChatTyping = useCallback((chatId, typing) => {
    const id = chatId != null ? String(chatId).trim() : '';
    if (!id) return;
    const next = { chatId: id, typing: !!typing };
    const prev = lastTypingEmitRef.current;
    if (prev && prev.chatId === next.chatId && prev.typing === next.typing) return;

    lastTypingEmitRef.current = next;
    getGdcSocket()?.emit('chatTyping', next);
  }, []);

  const upgradeOwnMessageDelivery = useCallback((thread, messageId) => {
    const mid = String(messageId);
    const messages = (Array.isArray(thread.messages) ? thread.messages : []).map((m) => {
      if (!m.me || String(m.id) !== mid) return m;
      if (m.status === 'seen') return m;
      const next = { ...m, uploadProgress: undefined };
      if (next.status === 'sending') next.status = 'sent';
      if (next.status === 'sent') next.status = 'delivered';
      return next;
    });
    const preview =
      thread.threadPreview?.me && String(thread.threadPreview.id) === mid
        ? finalizeOutgoingMessage(
            {
              ...thread.threadPreview,
              status:
                thread.threadPreview.status === 'seen'
                  ? 'seen'
                  : thread.threadPreview.status === 'sent'
                    ? 'delivered'
                    : thread.threadPreview.status || 'delivered',
            },
            {},
          )
        : thread.threadPreview;
    return { ...thread, messages, threadPreview: preview };
  }, []);

  useEffect(() => {
    if (!token || !myId) return undefined;
    ensureGdcSocketConnected(token, myId);
    const s = getGdcSocket();
    if (!s) return undefined;

    const isChatParticipant = (chatId, authorId) => {
      const thread = threadsRef.current.find((t) => threadIdEquals(t.id, chatId));
      const members = Array.isArray(thread?.server?.memberIds)
        ? thread.server.memberIds.map(String)
        : [];
      if (members.length > 0) return members.includes(String(myId));
      if (authorId && authorId !== String(myId)) return true;
      return authorId === String(myId);
    };

    const pushIncomingNotice = (chatId, ui, authorId) => {
      const aid = String(authorId || '').trim();
      if (!aid || aid === String(myId)) return;
      if (!isChatParticipant(chatId, aid)) return;
      if (threadIdEquals(selectedChatIdRef.current, chatId)) return;
      const messageId = ui?.id != null ? String(ui.id) : '';
      if (messageId && lastNotifiedMessageIdByChatRef.current[String(chatId)] === messageId) return;
      if (messageId) lastNotifiedMessageIdByChatRef.current[String(chatId)] = messageId;
      const row = threadsRef.current.find((t) => threadIdEquals(t.id, chatId));
      const peer = aid ? userDirectoryByIdRef.current[aid] : null;
      const notice = {
        chatId: String(chatId),
        title: String(row?.listTitle || row?.name || peer?.displayName || 'Chat'),
        preview: messagePreviewLabel(ui),
        senderName: String(peer?.displayName || peer?.name || ''),
        at: Date.now(),
      };
      setIncomingNotice(notice);
      publishChatInAppNotice(notice);
      if (token) void syncChatInAppNotification(token, notice);
    };

    const onReceive = (payload) => {
      const p = payload && typeof payload === 'object' ? payload : {};
      const chatId = p.chatId != null ? String(p.chatId) : '';
      const serverMsg = p.message && typeof p.message === 'object' ? p.message : null;
      if (!chatId || !serverMsg) {
        scheduleSilentThreadRefreshRef.current?.();
        return;
      }
      const authorId = String(serverMsg.authorId ?? '');
      if (!isChatParticipant(chatId, authorId)) return;
      const inboundMessageId = serverMsg.id != null ? String(serverMsg.id) : '';
      if (inboundMessageId) {
        if (processedInboundMessageIdsRef.current.has(inboundMessageId)) return;
        processedInboundMessageIdsRef.current.add(inboundMessageId);
        if (processedInboundMessageIdsRef.current.size > 500) {
          const kept = [...processedInboundMessageIdsRef.current].slice(-250);
          processedInboundMessageIdsRef.current = new Set(kept);
        }
      }
      let ui = mapApiMessageToUi(serverMsg, myId);
      const isDeletedEvent = !!(serverMsg.deleted || ui.deleted);
      if (isDeletedEvent) {
        ui = toDeletedMessageUi(ui, { byMe: authorId === String(myId) });
      } else if (authorId === String(myId)) {
        ui = finalizeOutgoingMessage(ui);
      }
      const isAttachmentMsg = ui.type === 'file' || ui.type === 'image';
      const uploadStillActive =
        authorId === String(myId) &&
        isAttachmentMsg &&
        outboundAttachmentUploadRef.current.get(chatId) != null;
      const att = serverMsg.attachment && typeof serverMsg.attachment === 'object' ? serverMsg.attachment : null;
      const serverDataUrl =
        att && typeof att.dataUrl === 'string' && att.dataUrl.length > 48 ? att.dataUrl : '';
      const attachmentReady =
        !isAttachmentMsg ||
        !!(typeof ui.uri === 'string' && ui.uri.length > 48) ||
        !!serverDataUrl;
      const isOpen = threadIdEquals(selectedChatIdRef.current, chatId);

      if (hiddenChatIdsRef.current.has(chatId)) {
        const nextHidden = new Set(hiddenChatIdsRef.current);
        nextHidden.delete(chatId);
        setHiddenChatIds(nextHidden);
        void writeStringSet(storageKey(HIDDEN_CHAT_IDS_PREFIX, myId), nextHidden);
        scheduleSilentThreadRefreshRef.current?.();
      }

      let needsMessageReload = false;
      setThreads((prev) => {
        const patchThread = (t) => {
          const msgs = Array.isArray(t.messages) ? t.messages : [];
          if (hiddenMessageIdsByChatRef.current[chatId]?.has(String(ui.id))) return t;
          if (uploadStillActive) return t;
          if (!attachmentReady) {
            if (isOpen) needsMessageReload = true;
            return t;
          }
          let nextMsgs = msgs;
          if (isDeletedEvent) {
            const has = msgs.some((m) => String(m.id) === String(ui.id));
            nextMsgs = has
              ? patchMessagesWithTombstone(msgs, String(ui.id))
              : mergeMessageList(msgs, ui).slice(-80);
          } else if (isOpen) {
            if (authorId === String(myId)) {
              const base = msgs.filter((m) => !(m.me && isTempMessageId(m.id)));
              nextMsgs = mergeMessageList(base, ui);
            } else {
              nextMsgs = mergeMessageList(msgs, ui);
            }
          } else {
            nextMsgs = mergeMessageList(msgs, ui).slice(-80);
          }
          const isNewInbound =
            !!inboundMessageId && !msgs.some((m) => String(m.id) === inboundMessageId);
          let unread = Number(t.unread) || 0;
          if (!isOpen && authorId && authorId !== String(myId) && isNewInbound) unread += 1;
          if (isOpen) unread = 0;

          let row = { ...t, messages: nextMsgs, unread, threadPreview: ui };
          if (authorId === String(myId)) row = upgradeOwnMessageDelivery(row, ui.id);
          return row;
        };

        const idx = prev.findIndex((t) => threadIdEquals(t.id, chatId));
        if (idx >= 0) {
          const next = prev.map((t, i) => (i === idx ? patchThread(t) : t));
          return sortThreadsByRecent(next);
        }

        if (!attachmentReady) {
          if (isOpen) needsMessageReload = true;
          return prev;
        }

        const stub = buildPlaceholderThreadFromIncoming({
          chatId,
          ui,
          authorId,
          myId,
          userDirectoryById,
          onlineUserIds,
        });
        return sortThreadsByRecent([patchThread(stub), ...prev]);
      });

      if (needsMessageReload) void loadMessagesForChat(chatId);

      const isIncoming = authorId && authorId !== String(myId) && !isDeletedEvent && attachmentReady;
      if (isIncoming && !isOpen) {
        pushIncomingNotice(chatId, ui, authorId);
      } else if (isOpen) {
        dismissIncomingNotice(chatId);
      }

      if (isOpen && authorId && authorId !== String(myId)) {
        lastReadAckChatRef.current = '';
        scheduleMarkChatReadRef.current?.(chatId);
      }
    };

    const onThreadUpdated = (payload) => {
      const p = payload && typeof payload === 'object' ? payload : {};
      const chatId =
        p.chatId != null ? String(p.chatId) : p.thread?.id != null ? String(p.thread.id) : '';
      const actionName = p.action != null ? String(p.action) : '';
      const removedIds = Array.isArray(p.removedIds) ? p.removedIds.map(String) : [];

      if (actionName === 'group_deleted' && chatId) {
        evictChatFromInboxRef.current?.(chatId, { persistHide: true });
        return;
      }

      if (
        actionName === 'member_removed' &&
        chatId &&
        myId &&
        removedIds.includes(String(myId))
      ) {
        evictChatFromInboxRef.current?.(chatId, { persistHide: true });
        return;
      }

      if (actionName === 'member_added' && Array.isArray(p.memberIds) && p.memberIds.length) {
        void hydrateChatParticipantsRef.current?.(p.memberIds);
      }

      if (p.thread && typeof p.thread === 'object') {
        applyServerThreadPatchRef.current?.(p.thread, p);
        if (chatId) patchThreadDisplayFromDirectoryRef.current?.(chatId);
        return;
      }
      if (chatId) {
        scheduleSilentThreadRefreshRef.current?.();
      } else {
        scheduleSilentThreadRefreshRef.current?.();
      }
    };

    const onGroupEvent = (payload) => {
      onThreadUpdated(payload);
    };

    const scheduleOpenChatMessageReload = (chatId) => {
      if (!threadIdEquals(selectedChatIdRef.current, chatId)) return;
      if (openChatReloadTimerRef.current) clearTimeout(openChatReloadTimerRef.current);
      openChatReloadTimerRef.current = setTimeout(() => {
        openChatReloadTimerRef.current = null;
        if (threadIdEquals(selectedChatIdRef.current, chatId)) {
          void loadMessagesForChat(chatId);
        }
      }, 150);
    };

    /** Fallback when relay sends `chat.message` without full `receiveMessage` payload. */
    const onChatMessageSignal = (payload) => {
      const p = payload && typeof payload === 'object' ? payload : {};
      const chatId = p.chatId != null ? String(p.chatId) : '';
      if (!chatId) return;
      if (threadIdEquals(selectedChatIdRef.current, chatId)) {
        scheduleOpenChatMessageReload(chatId);
        return;
      }
      scheduleSilentThreadRefreshRef.current?.();
    };

    const onChatTyping = (payload) => {
      const p = payload && typeof payload === 'object' ? payload : {};
      const chatId = p.chatId != null ? String(p.chatId) : '';
      const peer = p.userId != null ? String(p.userId) : '';
      if (!chatId || !threadIdEquals(chatId, selectedChatIdRef.current)) return;
      if (!peer || peer === String(myId)) return;
      if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);
      if (p.typing) {
        setTypingPeerId(peer);
        typingClearTimerRef.current = setTimeout(() => {
          typingClearTimerRef.current = null;
          setTypingPeerId((cur) => (cur === peer ? null : cur));
        }, 3800);
      } else {
        setTypingPeerId((cur) => (cur === peer ? null : cur));
      }
    };

    // NEW CODE ADDED FOR REAL-TIME SEEN TICK FIX — chat.read + message_seen (HTTP relay + socket)
    const onChatRead = (payload) => {
      const p = payload && typeof payload === 'object' ? payload : {};
      const chatId = p.chatId != null ? String(p.chatId) : '';
      const readerId = p.readerId != null ? String(p.readerId) : '';
      if (!chatId || !readerId || readerId === String(myId)) return;
      setThreads((prev) =>
        prev.map((t) => (String(t.id) === chatId ? applySeenToThreadRef.current(t, readerId) : t)),
      );
    };

    const onMessageDeleted = (payload) => {
      const p = payload && typeof payload === 'object' ? payload : {};
      const chatId = p.chatId != null ? String(p.chatId) : '';
      const messageId = p.messageId != null ? String(p.messageId) : '';
      if (!chatId || !messageId) return;
      setThreads((prev) =>
        prev.map((t) => {
          if (!threadIdEquals(t.id, chatId)) return t;
          const msgs = patchMessagesWithTombstone(Array.isArray(t.messages) ? t.messages : [], messageId);
          const preview =
            t.threadPreview && String(t.threadPreview.id) === messageId
              ? toDeletedMessageUi(t.threadPreview, { byMe: false })
              : t.threadPreview;
          return { ...t, messages: msgs, threadPreview: preview };
        }),
      );
      setThreads((prev) => sortThreadsByRecent(prev));
    };

    s.on('receiveMessage', onReceive);
    s.on('chat.message', onChatMessageSignal);
    s.on('chat.thread.updated', onThreadUpdated);
    s.on('chat.group.member_added', onGroupEvent);
    s.on('chat.group.member_removed', onGroupEvent);
    s.on('chat.group.group_updated', onGroupEvent);
    s.on('chat.group.group_created', onGroupEvent);
    s.on('chat.group.group_deleted', onGroupEvent);
    s.on('chatTyping', onChatTyping);
    s.on('chat.read', onChatRead);
    s.on('message_seen', onChatRead);
    s.on('chat.message.deleted', onMessageDeleted);
    const onPresenceUpdate = (payload) => {
      const p = payload && typeof payload === 'object' ? payload : {};
      const userId = p.userId != null ? String(p.userId) : '';
      if (!userId) return;
      setOnlineUserIds((prev) => {
        const isOnline = prev.has(userId);
        if ((p.online && isOnline) || (!p.online && !isOnline)) return prev;
        const next = new Set(prev);
        if (p.online) next.add(userId);
        else next.delete(userId);
        return next;
      });
    };
    const onPresenceSnapshot = (payload) => {
      const p = payload && typeof payload === 'object' ? payload : {};
      const ids = Array.isArray(p.onlineUserIds) ? p.onlineUserIds.map(String) : [];
      const next = new Set(ids);
      setOnlineUserIds((prev) => (sameStringSet(prev, next) ? prev : next));
    };
    s.on('presence:update', onPresenceUpdate);
    s.on('presence:snapshot', onPresenceSnapshot);
    const onSocketConnect = () => {
      void refreshThreadsRef.current?.({ silent: true });
    };
    s.on('connect', onSocketConnect);
    s.on('reconnect', onSocketConnect);
    return () => {
      if (openChatReloadTimerRef.current) {
        clearTimeout(openChatReloadTimerRef.current);
        openChatReloadTimerRef.current = null;
      }
      s.off('connect', onSocketConnect);
      s.off('reconnect', onSocketConnect);
      s.off('receiveMessage', onReceive);
      s.off('chat.message', onChatMessageSignal);
      s.off('chat.thread.updated', onThreadUpdated);
      s.off('chat.group.member_added', onGroupEvent);
      s.off('chat.group.member_removed', onGroupEvent);
      s.off('chat.group.group_updated', onGroupEvent);
      s.off('chat.group.group_created', onGroupEvent);
      s.off('chat.group.group_deleted', onGroupEvent);
      s.off('chatTyping', onChatTyping);
      s.off('chat.read', onChatRead);
      s.off('message_seen', onChatRead);
      s.off('chat.message.deleted', onMessageDeleted);
      s.off('presence:update', onPresenceUpdate);
      s.off('presence:snapshot', onPresenceSnapshot);
    };
  }, [token, myId, userDirectoryById, onlineUserIds, upgradeOwnMessageDelivery, loadMessagesForChat, dismissIncomingNotice]);

  const closeChat = useCallback(() => {
    const id = selectedChatIdRef.current;
    selectedChatIdRef.current = null;
    setActiveChatIdState(null);
    setTypingPeerId(null);
    lastReadAckChatRef.current = '';
    if (readAckTimerRef.current) {
      clearTimeout(readAckTimerRef.current);
      readAckTimerRef.current = null;
    }
    if (typingEmitTimerRef.current) {
      clearTimeout(typingEmitTimerRef.current);
      typingEmitTimerRef.current = null;
    }
    emitChatTyping(id, false);
    if (id) getGdcSocket()?.emit('leaveRoom', id);
  }, [emitChatTyping]);

  const acknowledgeChatRead = useCallback(
    (chatId) => {
      const id = String(chatId || '').trim();
      if (!id) return;
      lastReadAckChatRef.current = '';
      scheduleMarkChatReadRef.current?.(id);
    },
    [],
  );

  const resolvePeerProfile = useCallback(
    (peerId) => {
      const id = String(peerId || '').trim();
      if (!id) return null;
      return userDirectoryById[id] || null;
    },
    [userDirectoryById],
  );

  const groupScopeForRole = useCallback(() => {
    const r = user?.role;
    if (isAdminRole(r)) return 'group';
    if (r === 'HR') return 'hr_group';
    if (r === 'Team Leader') return 'tl_group';
    return 'group';
  }, [user?.role]);

  const isPeerTyping = !!typingPeerId;

  const hideChatForMe = useCallback(
    async (chatId) => {
      const id = String(chatId || '').trim();
      if (!id || !myId) return;
      const next = new Set(hiddenChatIds);
      next.add(id);
      setHiddenChatIds(next);
      setThreads((prev) => prev.filter((t) => String(t.id) !== id));
      if (selectedChatIdRef.current === id) selectedChatIdRef.current = null;
      await writeStringSet(storageKey(HIDDEN_CHAT_IDS_PREFIX, myId), next);
    },
    [hiddenChatIds, myId],
  );

  const hideMessageForMe = useCallback(
    async (chatId, messageId) => {
      const cid = String(chatId || '').trim();
      const mid = String(messageId || '').trim();
      if (!cid || !mid || !myId) return;
      const nextByChat = { ...hiddenMessageIdsByChat };
      const nextSet = new Set(nextByChat[cid] || []);
      nextSet.add(mid);
      nextByChat[cid] = nextSet;
      setHiddenMessageIdsByChat(nextByChat);
      setThreads((prev) =>
        prev.map((t) =>
          String(t.id) === cid
            ? { ...t, messages: (Array.isArray(t.messages) ? t.messages : []).filter((m) => String(m.id) !== mid) }
            : t,
        ),
      );
      const pairs = new Set();
      for (const [threadId, ids] of Object.entries(nextByChat)) {
        for (const id of ids) pairs.add(`${threadId}:${id}`);
      }
      await writeStringSet(storageKey(HIDDEN_MESSAGE_IDS_PREFIX, myId), pairs);
    },
    [hiddenMessageIdsByChat, myId],
  );

  const deleteMessageForEveryone = useCallback(
    async (chatId, messageId) => {
      const cid = String(chatId || '').trim();
      const mid = String(messageId || '').trim();
      if (!token || !cid || !mid) return;

      const applyTombstone = (prev, byMe = true) =>
        sortThreadsByRecent(
          prev.map((t) => {
            if (!threadIdEquals(t.id, cid)) return t;
            const msgs = patchMessagesWithTombstone(Array.isArray(t.messages) ? t.messages : [], mid, { byMe });
            const preview =
              t.threadPreview && String(t.threadPreview.id) === mid
                ? toDeletedMessageUi(t.threadPreview, { byMe })
                : t.threadPreview;
            return { ...t, messages: msgs, threadPreview: preview };
          }),
        );

      try {
        const serverMsg = await deleteChatMessage(token, cid, mid, { mode: 'soft' });
        if (serverMsg && typeof serverMsg === 'object') {
          const ui = toDeletedMessageUi(mapApiMessageToUi(serverMsg, myId), { byMe: true });
          setThreads((prev) => applyTombstone(prev, true));
          getGdcSocket()?.emit('sendMessage', { chatId: cid, message: serverMsg });
          return;
        }
      } catch {
        /* soft delete failed — try hard */
      }

      await deleteChatMessage(token, cid, mid, { mode: 'hard' });
      setThreads((prev) => applyTombstone(prev, true));
    },
    [myId, token],
  );

  return {
    threads,
    totalUnreadMessages: computeTotalChatUnread(threads),
    incomingNotice,
    dismissIncomingNotice,
    setThreads,
    contacts,
    groupContacts: directoryRows.length > 0 ? directoryRows : contacts,
    inboxLoading,
    directoryHydrated,
    inboxError,
    refreshThreads,
    reloadContacts: loadContacts,
    loadMessagesForChat,
    loadOlderMessages,
    openChat,
    startDm,
    ensureDmChat,
    createGroup,
    patchGroupFromServer,
    addGroupMembersToChat,
    removeGroupMembersFromChat,
    leaveGroup,
    deleteGroup,
    promoteGroupMemberAdmin,
    demoteGroupMemberAdmin,
    applyServerThreadPatch,
    sendText,
    sendAttachment,
    groupScopeForRole,
    myUserId: myId,
    userDirectoryById,
    onlineUserIds,
    closeChat,
    activeChatId,
    setActiveChatId,
    emitChatTyping,
    typingPeerId,
    isPeerTyping,
    resolvePeerProfile,
    patchThreadDisplayFromDirectory,
    hideChatForMe,
    hideMessageForMe,
    deleteMessageForEveryone,
    acknowledgeChatRead,
  };
}
