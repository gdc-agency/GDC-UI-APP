/** @param {string} id */
export function isTempMessageId(id) {
  return String(id || '').startsWith('temp-');
}

/** @param {string} [status] */
export function messageDeliveryRank(status) {
  const s = String(status || '');
  if (s === 'seen') return 4;
  if (s === 'delivered') return 3;
  if (s === 'sent') return 2;
  if (s === 'sending') return 1;
  if (s === 'failed') return 0;
  return 2;
}

/** @param {unknown} ids */
function normalizeReadBy(ids) {
  if (!Array.isArray(ids)) return [];
  return ids.map(String).filter(Boolean);
}

/** @param {unknown} a @param {unknown} b */
export function mergeReadByUserIds(a, b) {
  return [...new Set([...normalizeReadBy(a), ...normalizeReadBy(b)])];
}

/**
 * Keep best delivery state when merging API reload with in-memory messages (seen ticks must not reset).
 * @param {Record<string, unknown>} server
 * @param {Record<string, unknown> | undefined} local
 */
export function mergeOutgoingDeliveryState(server, local) {
  if (!local) return server;
  if (isTempMessageId(local.id) && local.me && (local.status === 'sending' || isMessageUploading(local))) {
    return local;
  }
  if (!local.me || !server.me) return server;
  const readByUserIds = mergeReadByUserIds(server.readByUserIds, local.readByUserIds);
  const serverRank = messageDeliveryRank(String(server.status || ''));
  const localRank = messageDeliveryRank(String(local.status || ''));
  const status = localRank > serverRank ? String(local.status || 'delivered') : String(server.status || 'delivered');
  const merged = { ...server, status, readByUserIds, uploadProgress: undefined };
  if ((merged.type === 'image' || local.type === 'image') && !merged.uri && local.uri) {
    merged.type = 'image';
    merged.uri = local.uri;
    if (!merged.text) merged.text = 'Photo';
  }
  if (merged.type === 'file' && !merged.uri && local.uri) {
    merged.uri = local.uri;
  }
  return merged;
}

/**
 * True only while an outgoing attachment is actively uploading.
 * @param {Record<string, unknown> | null | undefined} item
 */
export function isMessageUploading(item) {
  if (!item?.me) return false;
  if (item.status === 'failed') return false;
  if (item.status === 'sending') return true;
  if (typeof item.uploadProgress === 'number' && item.uploadProgress < 1) return true;
  return false;
}

/**
 * Normalize tick status for outgoing messages after upload/send completes.
 * @param {Record<string, unknown>} item
 */
export function resolveOutgoingMessageStatus(item) {
  const s = String(item.status || '');
  if (s === 'sending' || s === 'failed') return s;
  if (s === 'seen' || s === 'delivered' || s === 'sent') return s;
  return 'delivered';
}

/**
 * Strip upload fields and ensure stable post-upload UI state.
 * @param {Record<string, unknown>} ui
 * @param {{ status?: string }} [overrides]
 */
export function finalizeOutgoingMessage(ui, overrides = {}) {
  const next = { ...ui, ...overrides };
  delete next.uploadProgress;
  if (next.status === 'sending') next.status = 'sent';
  if (!next.status) next.status = 'delivered';
  return next;
}

/** @param {string} [status] */
export function statusIconName(status) {
  if (status === 'seen') return 'check-all';
  if (status === 'delivered') return 'check-all';
  if (status === 'sending') return 'clock-outline';
  if (status === 'failed') return 'alert-circle-outline';
  return 'check';
}

/** @param {string} [status] @param {boolean} [onDarkBubble] */
export function statusIconColor(status, onDarkBubble = true) {
  if (status === 'seen') return '#53bdeb';
  if (status === 'failed') return '#f87171';
  if (onDarkBubble) {
    if (status === 'delivered') return 'rgba(255,255,255,0.92)';
    if (status === 'sending') return 'rgba(255,255,255,0.85)';
    return 'rgba(255,255,255,0.9)';
  }
  return '#94a3b8';
}
