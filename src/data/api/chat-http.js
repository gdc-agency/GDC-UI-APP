import { getChatApiBaseUrl } from '@/data/constants/api-config';
import { isLegacyRenderHost } from '@/data/constants/backend-urls';

const REQUEST_TIMEOUT_MS = 45000;

/** Base64url → JSON payload (RN-safe, no atob dependency). */
function decodeJwtPayload(token) {
  try {
    const part = String(token || '').split('.')[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let bytes = '';
    for (let i = 0; i < base64.length; i += 4) {
      const e1 = chars.indexOf(base64[i]);
      const e2 = chars.indexOf(base64[i + 1]);
      const e3 = chars.indexOf(base64[i + 2]);
      const e4 = chars.indexOf(base64[i + 3]);
      const c1 = (e1 << 2) | (e2 >> 4);
      const c2 = ((e2 & 15) << 4) | (e3 >> 2);
      const c3 = ((e3 & 3) << 6) | e4;
      bytes += String.fromCharCode(c1);
      if (e3 !== 64 && e3 !== -1) bytes += String.fromCharCode(c2);
      if (e4 !== 64 && e4 !== -1) bytes += String.fromCharCode(c3);
    }
    const json = decodeURIComponent(
      bytes
        .split('')
        .map((ch) => `%${`00${ch.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Chat backend identifies the caller by `x-user-id` (+ `x-organization-id`), not the JWT. */
function chatIdentityHeaders(token) {
  const payload = decodeJwtPayload(token);
  if (!payload) return {};
  const out = {};
  if (payload.id != null) out['x-user-id'] = String(payload.id);
  if (payload.organization_id != null) out['x-organization-id'] = String(payload.organization_id);
  return out;
}

function chatNetworkHint() {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn('[api] Chat request failed', { base: getChatApiBaseUrl() });
  }
  return 'Cannot connect to the chat service. Check your network and try again.';
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
  if (isLegacyRenderHost(base)) {
    throw new Error(
      'This app is pointing at a retired chat backend. Restart Expo with cache clear (npx expo start --lan -c).',
    );
  }
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  /** @type {Record<string, string>} */
  const h = {
    Accept: 'application/json',
    ...chatIdentityHeaders(token),
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
