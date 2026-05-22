/** @typedef {{ chatId: string; title: string; preview: string; senderName?: string; at: number }} ChatInAppNotice */

/** @type {Set<(notice: ChatInAppNotice | null) => void>} */
const listeners = new Set();
/** @type {ChatInAppNotice | null} */
let lastNotice = null;

/**
 * @param {(notice: ChatInAppNotice | null) => void} cb
 */
export function subscribeChatInAppNotice(cb) {
  listeners.add(cb);
  cb(lastNotice);
  return () => listeners.delete(cb);
}

/** @param {ChatInAppNotice | null} notice */
export function publishChatInAppNotice(notice) {
  lastNotice = notice;
  listeners.forEach((cb) => {
    try {
      cb(notice);
    } catch {
      /* ignore */
    }
  });
}

export function clearChatInAppNotice() {
  publishChatInAppNotice(null);
}

/** @param {Record<string, unknown> | null | undefined} ui */
export function messagePreviewLabel(ui) {
  if (!ui || typeof ui !== 'object') return 'New message';
  if (ui.deleted) return 'Message deleted';
  if (ui.type === 'image') return 'Photo';
  if (ui.type === 'file') return String(ui.fileName || 'Document');
  const text = String(ui.text || '').trim();
  return text || 'New message';
}
