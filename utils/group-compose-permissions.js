/**
 * Group chat compose rules (matches Chat-Services `isGroupAdmin` + `adminsOnlyMessages`).
 * @param {Record<string, unknown> | null | undefined} server
 * @param {string} myUserId
 */
export function isGroupChatAdmin(server, myUserId) {
  if (!server || !myUserId) return false;
  const my = String(myUserId).trim();
  if (!my) return false;
  const adminIds = Array.isArray(server.adminIds) ? server.adminIds.map(String) : [];
  if (adminIds.some((id) => id === my)) return true;
  const createdBy =
    server.createdById != null && String(server.createdById).trim().length > 0
      ? String(server.createdById).trim()
      : '';
  return !!createdBy && createdBy === my;
}

/**
 * @param {Record<string, unknown> | null | undefined} server
 * @param {string} myUserId
 */
export function isGroupStyleChat(server) {
  if (!server) return false;
  const kind = String(server.kind || '');
  const scope = String(server.scope || '');
  return kind === 'group' || scope === 'hr_group' || scope === 'tl_group';
}

/**
 * Whether the current user may send messages (text, attachments) in this thread.
 * @param {Record<string, unknown> | null | undefined} server
 * @param {string} myUserId
 */
export function canComposeInChat(server, myUserId) {
  if (!server) return true;
  if (!isGroupStyleChat(server)) return true;
  const adminsOnly =
    server.adminsOnlyMessages === true ||
    server.adminsOnlyMessages === 'true' ||
    server.adminsOnlyMessages === 1;
  if (!adminsOnly) return true;
  return isGroupChatAdmin(server, myUserId);
}
