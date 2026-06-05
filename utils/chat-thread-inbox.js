/**
 * Chat list ordering + optimistic thread upsert (WhatsApp-style: latest on top).
 */

/** @param {string | number | null | undefined} a @param {string | number | null | undefined} b */
export function threadIdEquals(a, b) {
  if (a == null || b == null) return false;
  return String(a).trim() === String(b).trim();
}

/** @param {Record<string, unknown>} thread */
export function threadLastActivityMs(thread) {
  const preview = thread?.threadPreview;
  const pMs = preview?.createdAtMs;
  if (typeof pMs === 'number' && Number.isFinite(pMs)) return pMs;
  const pIso = preview?.createdAtIso;
  if (pIso) {
    const t = new Date(String(pIso)).getTime();
    if (!Number.isNaN(t)) return t;
  }
  const msgs = Array.isArray(thread?.messages) ? thread.messages : [];
  if (msgs.length) {
    const last = msgs[msgs.length - 1];
    if (typeof last?.createdAtMs === 'number') return last.createdAtMs;
    if (last?.createdAtIso) {
      const t = new Date(String(last.createdAtIso)).getTime();
      if (!Number.isNaN(t)) return t;
    }
  }
  const created = thread?.server?.createdAt;
  if (created) {
    const t = new Date(String(created)).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

/** @param {Array<Record<string, unknown>>} threads */
export function sortThreadsByRecent(threads) {
  return [...(Array.isArray(threads) ? threads : [])].sort(
    (a, b) => threadLastActivityMs(b) - threadLastActivityMs(a),
  );
}

/**
 * Build minimal thread row when first message arrives before list API refresh.
 * @param {{
 *   chatId: string;
 *   ui: Record<string, unknown>;
 *   authorId: string;
 *   myId: string;
 *   userDirectoryById: Record<string, { displayName: string; roleLabel: string; avatarUrl: string | null }>;
 *   onlineUserIds: Set<string>;
 *   server?: Record<string, unknown>;
 * }} args
 */
export function buildPlaceholderThreadFromIncoming({
  chatId,
  ui,
  authorId,
  myId,
  userDirectoryById,
  onlineUserIds,
  server,
}) {
  const cid = String(chatId);
  const peerId = authorId && String(authorId) !== String(myId) ? String(authorId) : '';
  const baseServer =
    server && typeof server === 'object'
      ? server
      : {
          id: cid,
          kind: peerId ? 'dm' : 'group',
          scope: peerId ? 'dm' : 'group',
          memberIds: peerId ? [String(myId), peerId] : [String(myId)],
        };

  const members = Array.isArray(baseServer.memberIds) ? baseServer.memberIds.map(String) : [];
  const otherId = members.find((id) => id && id !== String(myId)) || peerId;
  const dir = otherId ? userDirectoryById[otherId] : null;
  const isGroup = String(baseServer.kind || '') === 'group';
  const title = isGroup
    ? String(baseServer.name || 'Group')
    : dir?.displayName || 'Chat';

  return {
    id: cid,
    server: baseServer,
    name: title,
    listTitle: title,
    headerName: title,
    headerRole: isGroup ? '' : dir?.roleLabel || '',
    listAvatarUrl: isGroup
      ? baseServer.avatarUrl
        ? String(baseServer.avatarUrl)
        : null
      : dir?.avatarUrl || null,
    peerId: isGroup ? '' : otherId,
    isOnline: otherId ? onlineUserIds.has(otherId) : false,
    // Let socket receive handler decide how much to increment unread; avoid double-counting.
    unread: 0,
    messages: [ui],
    threadPreview: ui,
    messagesHasMore: true,
    messagesLoadingOlder: false,
  };
}

/**
 * @param {Array<Record<string, unknown>>} prev
 * @param {string} chatId
 * @param {(thread: Record<string, unknown>) => Record<string, unknown>} updater
 */
export function upsertThreadInList(prev, chatId, updater) {
  const list = Array.isArray(prev) ? prev : [];
  const idx = list.findIndex((t) => threadIdEquals(t.id, chatId));
  if (idx >= 0) {
    const next = list.map((t, i) => (i === idx ? updater(t) : t));
    return sortThreadsByRecent(next);
  }
  const created = updater(
    buildPlaceholderThreadFromIncoming({
      chatId,
      ui: { id: 'pending', text: '', createdAtMs: Date.now() },
      authorId: '',
      myId: '',
      userDirectoryById: {},
      onlineUserIds: new Set(),
    }),
  );
  return sortThreadsByRecent([updater(created), ...list]);
}
