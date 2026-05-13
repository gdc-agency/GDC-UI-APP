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
