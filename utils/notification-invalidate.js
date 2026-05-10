/**
 * When the notification inbox changes (read/delete/clear), subscribers refresh counts or lists.
 * Keeps tab badge in sync without backend changes.
 */

const listeners = new Set();

/** @param {() => void} cb */
export function subscribeNotificationInbox(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function invalidateNotificationInbox() {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch {
      /* ignore subscriber errors */
    }
  });
}
