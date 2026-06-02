/**
 * Sum per-thread unread counts (WhatsApp-style total for tab badge).
 * @param {Array<{ unread?: number }>} threads
 */
export function computeTotalChatUnread(threads) {
  if (!Array.isArray(threads)) return 0;
  return threads.reduce((sum, t) => sum + (Number(t?.unread) || 0), 0);
}

/**
 * @param {number} n
 * @returns {string | undefined} Expo tabBarBadge value
 */
export function formatTabBadgeCount(n) {
  const total = Number(n) || 0;
  if (total <= 0) return undefined;
  if (total > 99) return '99+';
  return String(total);
}

/** Shared red pill for bottom-tab badges (Chat + Alerts). */
export const tabBarBadgeStyle = {
  backgroundColor: '#ef4444',
  color: '#ffffff',
  fontSize: 11,
  fontWeight: '700',
};
