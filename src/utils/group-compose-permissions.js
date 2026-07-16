import { isGroupMessagingAdmin, isPendingUserRole, threadFromServer } from '@/utils/chat-permissions';

/**
 * Group chat compose rules (matches Chat-Services `isGroupAdmin` + `adminsOnlyMessages`).
 * @param {Record<string, unknown> | null | undefined} server
 * @param {string} myUserId
 * @param {string | null | undefined} [viewerRole]
 */
export function isGroupChatAdmin(server, myUserId, viewerRole) {
  if (!server || !myUserId) return false;
  const thread = threadFromServer(server);
  const user = {
    id: String(myUserId).trim(),
    role: viewerRole ? String(viewerRole) : 'Employee',
  };
  return isGroupMessagingAdmin(thread, user);
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
 * @param {string | null | undefined} [viewerRole]
 */
export function canComposeInChat(server, myUserId, viewerRole) {
  if (isPendingUserRole(viewerRole)) return false;
  if (!server) return true;
  if (!isGroupStyleChat(server)) return true;
  const adminsOnly =
    server.adminsOnlyMessages === true ||
    server.adminsOnlyMessages === 'true' ||
    server.adminsOnlyMessages === 1;
  if (!adminsOnly) return true;
  return isGroupChatAdmin(server, myUserId, viewerRole);
}
