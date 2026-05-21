/** WhatsApp-style stable accent color per sender id. */
const PALETTE = [
  '#e53935',
  '#d81b60',
  '#8e24aa',
  '#5e35b1',
  '#3949ab',
  '#1e88e5',
  '#00897b',
  '#43a047',
  '#f4511e',
  '#6d4c41',
];

/**
 * @param {string} userId
 * @returns {string}
 */
export function groupSenderColor(userId) {
  const s = String(userId || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
