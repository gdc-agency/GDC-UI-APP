import { chatApiRequest } from '@/services/api/chat-http';

/** @param {unknown} res */
function extractData(res) {
  if (res && typeof res === 'object' && 'data' in res) return /** @type {{ data?: unknown }} */ (res).data;
  return res;
}

/**
 * @param {string} token
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function listChatThreads(token) {
  const res = await chatApiRequest('/api/chats', { method: 'GET', token });
  const data = extractData(res);
  return Array.isArray(data) ? /** @type {Array<Record<string, unknown>>} */ (data) : [];
}

/**
 * @param {string} token
 * @param {{ otherUserId: string }} body
 */
export async function openDmChat(token, body) {
  const res = await chatApiRequest('/api/chats/dm', { method: 'POST', token, body });
  return extractData(res);
}

/**
 * @param {string} token
 * @param {{ scope: string; name?: string; memberIds: string[]; teamKey?: string; avatarUrl?: string }} body
 */
export async function createGroupChat(token, body) {
  const res = await chatApiRequest('/api/chats/group', { method: 'POST', token, body });
  return extractData(res);
}

/**
 * @param {string} token
 * @param {string} chatId
 * @param {{ name?: string; avatarUrl?: string | null; privacyLockedInvites?: boolean; adminsOnlyMessages?: boolean }} body
 */
export async function updateGroupChat(token, chatId, body) {
  const res = await chatApiRequest(`/api/chats/${encodeURIComponent(chatId)}`, {
    method: 'PATCH',
    token,
    body,
  });
  return extractData(res);
}

/** @param {string} token @param {string} chatId */
export async function deleteGroupChat(token, chatId) {
  return chatApiRequest(`/api/chats/${encodeURIComponent(chatId)}`, { method: 'DELETE', token });
}

/**
 * @param {string} token
 * @param {string} chatId
 * @param {{ memberIds: string[] }} body
 */
export async function addGroupMembers(token, chatId, body) {
  const res = await chatApiRequest(`/api/chats/${encodeURIComponent(chatId)}/members:add`, {
    method: 'POST',
    token,
    body,
  });
  return extractData(res);
}

/**
 * @param {string} token
 * @param {string} chatId
 * @param {{ memberIds: string[] }} body
 */
export async function removeGroupMembers(token, chatId, body) {
  const res = await chatApiRequest(`/api/chats/${encodeURIComponent(chatId)}/members:remove`, {
    method: 'DELETE',
    token,
    body,
  });
  return extractData(res);
}

/** @param {string} token @param {string} chatId */
export async function leaveGroupChat(token, chatId) {
  const res = await chatApiRequest(`/api/chats/${encodeURIComponent(chatId)}/leave`, {
    method: 'POST',
    token,
    body: {},
  });
  return extractData(res);
}

/**
 * @param {string} token
 * @param {string} chatId
 * @param {{ memberId: string }} body
 */
export async function promoteGroupAdmin(token, chatId, body) {
  const res = await chatApiRequest(`/api/chats/${encodeURIComponent(chatId)}/admins:add`, {
    method: 'POST',
    token,
    body,
  });
  return extractData(res);
}

/** @param {string} token @param {string} chatId @param {string} memberId */
export async function demoteGroupAdmin(token, chatId, memberId) {
  const res = await chatApiRequest(
    `/api/chats/${encodeURIComponent(chatId)}/admins:remove/${encodeURIComponent(memberId)}`,
    { method: 'DELETE', token },
  );
  return extractData(res);
}

/**
 * @param {string} token
 * @param {string} chatId
 * @param {{ limit?: number; before?: string }} [query]
 */
export async function listChatMessages(token, chatId, query = {}) {
  const q = new URLSearchParams();
  if (query.limit != null) q.set('limit', String(query.limit));
  if (query.before) q.set('before', query.before);
  const qs = q.toString();
  const res = await chatApiRequest(`/api/chats/${encodeURIComponent(chatId)}/messages${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    token,
  });
  const data = extractData(res);
  return Array.isArray(data) ? data : [];
}

/**
 * @param {string} token
 * @param {string} chatId
 * @param {{ body?: string; attachment?: unknown; replyToId?: string; forwardedFrom?: unknown }} body
 */
export async function postChatMessage(token, chatId, body) {
  const res = await chatApiRequest(`/api/chats/${encodeURIComponent(chatId)}/messages`, {
    method: 'POST',
    token,
    body,
  });
  return extractData(res);
}

/**
 * @param {string} token
 * @param {string} chatId
 * @param {string} messageId
 * @param {{ mode?: 'soft' | 'hard' | 'everyone' }} [options]
 */
export async function deleteChatMessage(token, chatId, messageId, options = {}) {
  const q = new URLSearchParams();
  if (options.mode) q.set('mode', String(options.mode));
  const qs = q.toString();
  const res = await chatApiRequest(
    `/api/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}${qs ? `?${qs}` : ''}`,
    { method: 'DELETE', token },
  );
  return extractData(res);
}

/**
 * @param {string} token
 * @param {string} chatId
 */
export async function markChatRead(token, chatId) {
  return chatApiRequest(`/api/chats/${encodeURIComponent(chatId)}/read`, { method: 'POST', token, body: {} });
}
