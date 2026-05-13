import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';

import {
  createGroupChat,
  deleteChatMessage,
  listChatMessages,
  listChatThreads,
  markChatRead,
  openDmChat,
  postChatMessage,
} from '@/services/api/chat-api';
import { ChatApiError } from '@/services/api/chat-http';
import { getAllUsers } from '@/services/api/admin-api';
import { listAuthUsers } from '@/services/api/auth-api';
import { getMyTeamRoster, getVisibleDirectory } from '@/services/api/teams-api';
import { ensureGdcSocketConnected, getGdcSocket } from '@/services/realtime/gdc-socket';
import { isAdminRole } from '@/utils/roles';
import { formatDisplayRole, formatFileSize, mapDirectoryUser, resolveProfileImageUri } from '@/utils/chat-directory';
import { readLocalUriAsDataUrl } from '@/utils/chat-attachment-read';

const HIDDEN_CHAT_IDS_PREFIX = 'gdc_chat_hidden_threads:';
const HIDDEN_MESSAGE_IDS_PREFIX = 'gdc_chat_hidden_messages:';

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
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
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
  const myMessageStatus = othersRead ? 'seen' : 'delivered';
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
  const displayName = dir?.displayName || namePreset.trim() || 'Chat';
  const roleLabel = dir?.roleLabel || '';
  const listTitle = roleLabel ? `${displayName} (${roleLabel})` : displayName;
  return {
    listTitle,
    headerName: displayName,
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
  const [inboxError, setInboxError] = useState(/** @type {string | null} */ (null));
  const silentRefreshTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const typingClearTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const [typingPeerId, setTypingPeerId] = useState(/** @type {string | null} */ (null));
  const hiddenChatIdsRef = useRef(hiddenChatIds);
  const hiddenMessageIdsByChatRef = useRef(hiddenMessageIdsByChat);
  const scheduleSilentThreadRefreshRef = useRef(/** @type {(() => void) | null} */ (null));

  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

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

  const loadContacts = useCallback(async () => {
    if (!token || !user) {
      setContacts([]);
      setDirectoryRows([]);
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
      const mergedDirectory = new Map();
      for (const row of allDirectoryRows) mergedDirectory.set(row.id, row);
      for (const row of rows) mergedDirectory.set(row.id, row);
      setDirectoryRows([...mergedDirectory.values()]);
      setContacts(rows);
    } catch {
      setContacts([]);
      setDirectoryRows([]);
    }
  }, [token, user, myId]);

  const mapServerThreads = useCallback(
    (rawList) => {
      const prevById = new Map(threadsRef.current.map((t) => [String(t.id), t]));
      return rawList.filter((server) => !hiddenChatIds.has(String(server?.id ?? ''))).map((server) => {
        const id = String(server.id);
        const old = prevById.get(id);
        const display = buildThreadDisplay(server, myId, userDirectoryById);
        const mergedMessages =
          old && Array.isArray(old.messages) && old.messages.length > 0
            ? old.messages.filter((m) => !hiddenMessageIdsByChat[id]?.has(String(m.id)))
            : [];
        const mergedUnread = old ? Number(old.unread) || 0 : 0;
        const threadPreview = old?.threadPreview ?? null;
        const messagesHasMore = old?.messagesHasMore !== undefined ? old.messagesHasMore : true;
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
        setThreads(mapServerThreads(list));
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
    [token, myId, mapServerThreads],
  );

  const loadContactsRef = useRef(loadContacts);
  const refreshThreadsRef = useRef(refreshThreads);

  useEffect(() => {
    loadContactsRef.current = loadContacts;
  }, [loadContacts]);

  useEffect(() => {
    refreshThreadsRef.current = refreshThreads;
  }, [refreshThreads]);

  const scheduleSilentThreadRefresh = useCallback(() => {
    if (silentRefreshTimerRef.current) clearTimeout(silentRefreshTimerRef.current);
    silentRefreshTimerRef.current = setTimeout(() => {
      silentRefreshTimerRef.current = null;
      void refreshThreads({ silent: true });
    }, 450);
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
        await refreshThreadsRef.current({ silent });
      })();
      return () => {
        cancelled = true;
      };
    }, [myId, token]),
  );

  useEffect(
    () => () => {
      if (silentRefreshTimerRef.current) clearTimeout(silentRefreshTimerRef.current);
      if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    setThreads((prev) =>
      prev.map((row) => {
        const server = row.server;
        if (!server || typeof server !== 'object') return row;
        const display = buildThreadDisplay(server, myId, userDirectoryById);
        return {
          ...row,
          name: display.listTitle,
          listTitle: display.listTitle,
          headerName: display.headerName,
          headerRole: display.headerRole,
          listAvatarUrl: display.listAvatarUrl,
          peerId: display.peerId || '',
          isOnline: display.peerId ? onlineUserIds.has(display.peerId) : false,
        };
      }),
    );
  }, [onlineUserIds, userDirectoryById, myId]);

  useEffect(() => {
    const markOnline = (row) => ({ ...row, online: onlineUserIds.has(String(row.id)) });
    setContacts((prev) => prev.map(markOnline));
    setDirectoryRows((prev) => prev.map(markOnline));
  }, [onlineUserIds]);

  const selectedChatIdRef = useRef(/** @type {string | null} */ (null));

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
          if (t.id !== chatId) return t;
          if (opts.before) {
            const existing = Array.isArray(t.messages) ? t.messages : [];
            const merged = sortChatMessages([...existing, ...ui.filter((n) => !existing.some((e) => e.id === n.id))]);
            return { ...t, messages: merged, messagesHasMore: hasMore, messagesLoadingOlder: false };
          }
          return { ...t, messages: ui, messagesHasMore: hasMore, messagesLoadingOlder: false };
        }),
      );
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
      setThreads((prev) => prev.map((row) => (row.id === chatId ? { ...row, messagesLoadingOlder: true } : row)));
      try {
        await loadMessagesForChat(chatId, { limit: 40, before });
      } finally {
        setThreads((prev) => prev.map((row) => (row.id === chatId ? { ...row, messagesLoadingOlder: false } : row)));
      }
    },
    [token, loadMessagesForChat],
  );

  const openChat = useCallback(
    async (chatId) => {
      if (!token || !chatId) return;
      selectedChatIdRef.current = chatId;
      setTypingPeerId(null);
      const sock = ensureGdcSocketConnected(token, myId);
      sock?.emit('joinRoom', chatId);
      void markChatRead(token, chatId).catch(() => {});
      await loadMessagesForChat(chatId);
      setThreads((prev) => prev.map((t) => (t.id === chatId ? { ...t, unread: 0 } : t)));
    },
    [token, myId, loadMessagesForChat],
  );

  const startDm = useCallback(
    async (otherUserId) => {
      if (!token || !myId) throw new Error('Not signed in');
      const thread = await openDmChat(token, { otherUserId: String(otherUserId) });
      await refreshThreads({ silent: true });
      const id = thread && typeof thread === 'object' && thread.id != null ? String(thread.id) : '';
      if (id) await openChat(id);
      return id;
    },
    [token, myId, refreshThreads, openChat],
  );

  const createGroup = useCallback(
    async ({ name, memberIds, scope, privacyLockedInvites, adminsOnlyMessages, avatarUrl }) => {
      if (!token || !myId) throw new Error('Not signed in');
      const unique = Array.from(new Set([myId, ...memberIds.map(String)])).filter(Boolean);
      const thread = await createGroupChat(token, {
        scope,
        name: name || 'Group',
        memberIds: unique,
        privacyLockedInvites: !!privacyLockedInvites,
        adminsOnlyMessages: !!adminsOnlyMessages,
        avatarUrl,
      });
      await refreshThreads({ silent: true });
      const id = thread && typeof thread === 'object' && thread.id != null ? String(thread.id) : '';
      if (id) await openChat(id);
      return id;
    },
    [token, myId, refreshThreads, openChat],
  );

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
      setThreads((prev) =>
        prev.map((t) =>
          t.id === chatId
            ? {
                ...t,
                messages: mergeMessageList(Array.isArray(t.messages) ? t.messages : [], optimisticUi),
                threadPreview: optimisticUi,
              }
            : t,
        ),
      );
      try {
        const msg = await postChatMessage(token, chatId, {
          body: trimmed,
          replyToId: options.replyToId ? String(options.replyToId) : undefined,
          forwardedFrom: options.forwardedFrom && typeof options.forwardedFrom === 'object' ? options.forwardedFrom : undefined,
        });
        if (!msg || typeof msg !== 'object') return;
        getGdcSocket()?.emit('sendMessage', { chatId, message: msg });
        const ui = mapApiMessageToUi(msg, myId);
        setThreads((prev) =>
          prev.map((t) => {
            if (t.id !== chatId) return t;
            const msgs = Array.isArray(t.messages) ? t.messages : [];
            const next = mergeMessageList(
              msgs.filter((m) => m.id !== tempId && m.id !== ui.id),
              ui,
            );
            return { ...t, messages: next, threadPreview: ui };
          }),
        );
      } catch (e) {
        setThreads((prev) =>
          prev.map((t) =>
            t.id === chatId
              ? { ...t, messages: (Array.isArray(t.messages) ? t.messages : []).filter((m) => m.id !== tempId) }
              : t,
          ),
        );
        throw e;
      }
    },
    [token, myId],
  );

  const sendAttachment = useCallback(
    async (chatId, { uri, mimeType, fileName }, opts = {}) => {
      const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : () => {};
      if (!token || !chatId || !uri) throw new Error('Missing attachment data');
      onProgress(0.08);
      const { dataUrl, byteLength } = await readLocalUriAsDataUrl(uri, mimeType, fileName);
      onProgress(0.45);
      const safeName = fileName && String(fileName).trim() ? String(fileName).trim() : 'file';
      const mime = mimeType && String(mimeType).trim() ? String(mimeType).trim() : 'application/octet-stream';
      const attachment = {
        mimeType: mime,
        fileName: safeName,
        dataUrl,
        sizeBytes: byteLength,
      };
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const nowIso = new Date().toISOString();
      const nowMs = Date.now();
      const isImg = mime.startsWith('image/');
      const optimisticUi = isImg
        ? {
            id: tempId,
            me: true,
            type: 'image',
            text: 'Photo',
            uri: dataUrl,
            time: formatMsgTime(nowIso),
            createdAtIso: nowIso,
            createdAtMs: nowMs,
            status: 'sending',
          }
        : {
            id: tempId,
            me: true,
            type: 'file',
            text: 'Document',
            fileName: safeName,
            fileSizeLabel: formatFileSize(byteLength),
            uri: dataUrl,
            time: formatMsgTime(nowIso),
            createdAtIso: nowIso,
            createdAtMs: nowMs,
            status: 'sending',
          };
      setThreads((prev) =>
        prev.map((t) =>
          t.id === chatId
            ? {
                ...t,
                messages: mergeMessageList(Array.isArray(t.messages) ? t.messages : [], optimisticUi),
                threadPreview: optimisticUi,
              }
            : t,
        ),
      );
      onProgress(0.72);
      try {
        const msg = await postChatMessage(token, chatId, { body: '', attachment });
        if (!msg || typeof msg !== 'object') return;
        getGdcSocket()?.emit('sendMessage', { chatId, message: msg });
        const ui = mapApiMessageToUi(msg, myId);
        setThreads((prev) =>
          prev.map((t) => {
            if (t.id !== chatId) return t;
            const msgs = Array.isArray(t.messages) ? t.messages : [];
            const next = mergeMessageList(
              msgs.filter((m) => m.id !== tempId && m.id !== ui.id),
              ui,
            );
            return { ...t, messages: next, threadPreview: ui };
          }),
        );
        onProgress(1);
      } catch (e) {
        setThreads((prev) =>
          prev.map((t) =>
            t.id === chatId
              ? { ...t, messages: (Array.isArray(t.messages) ? t.messages : []).filter((m) => m.id !== tempId) }
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
    getGdcSocket()?.emit('chatTyping', { chatId: id, typing: !!typing });
  }, []);

  useEffect(() => {
    if (!token || !myId) return undefined;
    ensureGdcSocketConnected(token, myId);
    const s = getGdcSocket();
    if (!s) return undefined;

    const onReceive = (payload) => {
      const p = payload && typeof payload === 'object' ? payload : {};
      const chatId = p.chatId != null ? String(p.chatId) : '';
      const serverMsg = p.message && typeof p.message === 'object' ? p.message : null;
      if (!chatId || !serverMsg) {
        scheduleSilentThreadRefreshRef.current?.();
        return;
      }
      const authorId = String(serverMsg.authorId ?? '');
      const ui = mapApiMessageToUi(serverMsg, myId);
      const isOpen = selectedChatIdRef.current === chatId;

      if (hiddenChatIdsRef.current.has(chatId)) {
        const nextHidden = new Set(hiddenChatIdsRef.current);
        nextHidden.delete(chatId);
        setHiddenChatIds(nextHidden);
        void writeStringSet(storageKey(HIDDEN_CHAT_IDS_PREFIX, myId), nextHidden);
        scheduleSilentThreadRefreshRef.current?.();
      }

      setThreads((prev) =>
        prev.map((t) => {
          if (t.id !== chatId) return t;
          const msgs = Array.isArray(t.messages) ? t.messages : [];
          if (hiddenMessageIdsByChatRef.current[chatId]?.has(String(ui.id))) return t;
          const nextMsgs = isOpen ? mergeMessageList(msgs, ui) : msgs;
          let unread = Number(t.unread) || 0;
          if (!isOpen && authorId && authorId !== String(myId)) unread += 1;
          return { ...t, messages: nextMsgs, unread, threadPreview: ui };
        }),
      );
    };

    const onThreadUpdated = () => {
      scheduleSilentThreadRefreshRef.current?.();
    };

    const onChatTyping = (payload) => {
      const p = payload && typeof payload === 'object' ? payload : {};
      const chatId = p.chatId != null ? String(p.chatId) : '';
      const peer = p.userId != null ? String(p.userId) : '';
      if (!chatId || chatId !== selectedChatIdRef.current) return;
      if (!peer || peer === String(myId)) return;
      if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);
      if (p.typing) {
        setTypingPeerId(peer);
        typingClearTimerRef.current = setTimeout(() => {
          typingClearTimerRef.current = null;
          setTypingPeerId(null);
        }, 4500);
      } else {
        setTypingPeerId((cur) => (cur === peer ? null : cur));
      }
    };

    const onChatRead = (payload) => {
      const p = payload && typeof payload === 'object' ? payload : {};
      const chatId = p.chatId != null ? String(p.chatId) : '';
      const readerId = p.readerId != null ? String(p.readerId) : '';
      if (!chatId || !readerId || readerId === String(myId)) return;
      setThreads((prev) =>
        prev.map((t) => {
          if (String(t.id) !== chatId) return t;
          const messages = (Array.isArray(t.messages) ? t.messages : []).map((m) =>
            m.me && m.status !== 'seen' ? { ...m, status: 'seen' } : m,
          );
          const preview = t.threadPreview?.me ? { ...t.threadPreview, status: 'seen' } : t.threadPreview;
          return { ...t, messages, threadPreview: preview };
        }),
      );
    };

    const onMessageDeleted = (payload) => {
      const p = payload && typeof payload === 'object' ? payload : {};
      const chatId = p.chatId != null ? String(p.chatId) : '';
      const messageId = p.messageId != null ? String(p.messageId) : '';
      if (!chatId || !messageId) return;
      setThreads((prev) =>
        prev.map((t) =>
          String(t.id) === chatId
            ? {
                ...t,
                messages: (Array.isArray(t.messages) ? t.messages : []).filter((m) => String(m.id) !== messageId),
                threadPreview: t.threadPreview?.id === messageId ? null : t.threadPreview,
              }
            : t,
        ),
      );
    };

    s.on('receiveMessage', onReceive);
    s.on('chat.thread.updated', onThreadUpdated);
    s.on('chatTyping', onChatTyping);
    s.on('chat.read', onChatRead);
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
    return () => {
      s.off('receiveMessage', onReceive);
      s.off('chat.thread.updated', onThreadUpdated);
      s.off('chatTyping', onChatTyping);
      s.off('chat.read', onChatRead);
      s.off('chat.message.deleted', onMessageDeleted);
      s.off('presence:update', onPresenceUpdate);
      s.off('presence:snapshot', onPresenceSnapshot);
    };
  }, [token, myId]);

  const closeChat = useCallback(() => {
    const id = selectedChatIdRef.current;
    selectedChatIdRef.current = null;
    setTypingPeerId(null);
    emitChatTyping(id, false);
    if (id) getGdcSocket()?.emit('leaveRoom', id);
  }, [emitChatTyping]);

  const groupScopeForRole = useCallback(() => {
    const r = user?.role;
    if (isAdminRole(r)) return 'group';
    if (r === 'HR') return 'hr_group';
    if (r === 'Team Leader') return 'tl_group';
    return 'group';
  }, [user?.role]);

  const typingPeerLabel = useMemo(() => {
    if (!typingPeerId) return '';
    const row = userDirectoryById[typingPeerId];
    return row?.displayName || 'Someone';
  }, [typingPeerId, userDirectoryById]);

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
      await deleteChatMessage(token, cid, mid, { mode: 'hard' });
      setThreads((prev) =>
        prev.map((t) =>
          String(t.id) === cid
            ? {
                ...t,
                messages: (Array.isArray(t.messages) ? t.messages : []).filter((m) => String(m.id) !== mid),
                threadPreview: t.threadPreview?.id === mid ? null : t.threadPreview,
              }
            : t,
        ),
      );
    },
    [token],
  );

  return {
    threads,
    setThreads,
    contacts,
    inboxLoading,
    inboxError,
    refreshThreads,
    loadMessagesForChat,
    loadOlderMessages,
    openChat,
    startDm,
    createGroup,
    sendText,
    sendAttachment,
    groupScopeForRole,
    myUserId: myId,
    closeChat,
    emitChatTyping,
    typingPeerId,
    typingPeerLabel,
    hideChatForMe,
    hideMessageForMe,
    deleteMessageForEveryone,
  };
}
