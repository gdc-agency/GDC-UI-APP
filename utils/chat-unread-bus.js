/** @type {Set<(total: number) => void>} */
const listeners = new Set();
let lastTotal = 0;

/**
 * @param {(total: number) => void} cb
 */
export function subscribeChatUnreadTotal(cb) {
  listeners.add(cb);
  cb(lastTotal);
  return () => listeners.delete(cb);
}

/** @param {number} total */
export function publishChatUnreadTotal(total) {
  const n = Math.max(0, Number(total) || 0);
  if (n === lastTotal) return;
  lastTotal = n;
  listeners.forEach((cb) => {
    try {
      cb(n);
    } catch {
      /* ignore */
    }
  });
}

export function resetChatUnreadBus() {
  lastTotal = 0;
  listeners.forEach((cb) => {
    try {
      cb(0);
    } catch {
      /* ignore */
    }
  });
}
