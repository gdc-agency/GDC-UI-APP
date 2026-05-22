/** @typedef {(chatId: string) => void} ChatOpenListener */

/** @type {string | null} */
let pendingChatId = null;
/** @type {Set<ChatOpenListener>} */
const listeners = new Set();

/**
 * Queue opening a chat (e.g. from Alerts notification tap).
 * @param {string} chatId
 */
export function publishPendingChatOpen(chatId) {
  const id = String(chatId || '').trim();
  if (!id) return;
  pendingChatId = id;
  listeners.forEach((cb) => {
    try {
      cb(id);
    } catch {
      /* ignore */
    }
  });
}

/** @returns {string | null} */
export function consumePendingChatOpen() {
  const id = pendingChatId;
  pendingChatId = null;
  return id;
}

/**
 * @param {ChatOpenListener} cb
 * @returns {() => void}
 */
export function subscribePendingChatOpen(cb) {
  listeners.add(cb);
  if (pendingChatId) {
    try {
      cb(pendingChatId);
    } catch {
      /* ignore */
    }
  }
  return () => listeners.delete(cb);
}
