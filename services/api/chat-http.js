import { getChatApiBaseUrl } from '@/constants/api-config';

const REQUEST_TIMEOUT_MS = 45000;

function chatNetworkHint() {
  const base = getChatApiBaseUrl();
  return [
    `Chat service URL: ${base}`,
    'Set expo.extra.chatApiPort (default 5002) or expo.extra.chatApiBaseUrl. Chat service must use the same JWT_SECRET as Auth for Bearer tokens.',
    'Restart Metro with: npx expo start -c if you changed app.json.',
  ].join('\n');
}

export class ChatApiError extends Error {
  /** @param {string} message */
  /** @param {number} status */
  /** @param {unknown} body */
  constructor(message, status, body) {
    super(message);
    this.name = 'ChatApiError';
    this.status = status;
    this.body = body;
  }
}

/**
 * HTTP helper for Chat-Services (separate base URL; same CRM JWT as Auth).
 *
 * @param {string} path - e.g. `/api/chats`
 * @param {object} [options]
 */
export async function chatApiRequest(path, options = {}) {
  const { method = 'GET', token, body, headers = {}, isFormData = false } = options;
  const base = getChatApiBaseUrl();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  /** @type {Record<string, string>} */
  const h = {
    Accept: 'application/json',
    ...headers,
  };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  if (body != null && !isFormData) {
    h['Content-Type'] = 'application/json';
  }

  /** @type {RequestInit} */
  const init = { method, headers: h };
  if (body != null) {
    init.body = isFormData ? body : JSON.stringify(body);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  init.signal = controller.signal;

  let res;
  try {
    res = await fetch(url, init);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err && typeof err === 'object' && 'name' in err && err.name === 'AbortError') {
      throw new Error(`Chat request timed out (${REQUEST_TIMEOUT_MS / 1000}s).\n\n${chatNetworkHint()}`);
    }
    const raw = err && typeof err.message === 'string' ? err.message : 'Network error';
    throw new Error(`${raw}\n\n${chatNetworkHint()}`);
  }
  clearTimeout(timeoutId);

  const text = await res.text();
  /** @type {unknown} */
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const msg =
      typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string'
        ? data.message
        : `Chat request failed (${res.status})`;
    throw new ChatApiError(msg, res.status, data);
  }

  return data;
}
