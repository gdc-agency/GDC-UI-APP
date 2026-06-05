import { getApiBaseUrl } from '@/constants/api-config';
import { Platform } from 'react-native';

/** Wrong host / firewall: avoid infinite spinner on mobile. */
/** Render free tier cold starts can exceed 25s on first request. */
const REQUEST_TIMEOUT_MS = 60000;

function networkErrorHint() {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    const base = getApiBaseUrl();
    console.warn('[api] Request failed', { base, platform: Platform.OS });
  }
  return 'Cannot connect to the server. Check your network and try again.';
}

export class ApiError extends Error {
  /** @param {string} message */
  /** @param {number} status */
  /** @param {unknown} body */
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

/**
 * Low-level JSON HTTP helper for the GDC backend.
 *
 * @param {string} path - Absolute path on API, e.g. `/api/auth/login`
 * @param {object} [options]
 * @param {string} [options.method]
 * @param {string} [options.token] - JWT (sent as Bearer)
 * @param {object} [options.body] - JSON-serializable (unless isFormData)
 * @param {Record<string, string>} [options.headers]
 * @param {boolean} [options.isFormData] - body is FormData; do not set Content-Type
 */
export async function apiRequest(path, options = {}) {
  const { method = 'GET', token, body, headers = {}, isFormData = false } = options;
  const url = `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;

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
      throw new Error(`Request timed out (${REQUEST_TIMEOUT_MS / 1000}s).\n\n${networkErrorHint()}`);
    }
    const raw = err && typeof err.message === 'string' ? err.message : 'Network error';
    throw new Error(`${raw}\n\n${networkErrorHint()}`);
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
        : `Request failed (${res.status})`;
    throw new ApiError(msg, res.status, data);
  }

  return data;
}
