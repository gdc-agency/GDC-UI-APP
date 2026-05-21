/** @param {string} id */
export function isTempMessageId(id) {
  return String(id || '').startsWith('temp-');
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
