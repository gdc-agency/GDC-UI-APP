import { getApiBaseUrl } from '@/constants/api-config';
import { Platform } from 'react-native';

/** Wrong host / firewall: avoid infinite spinner on mobile. */
const REQUEST_TIMEOUT_MS = 25000;

function networkErrorHint() {
  const base = getApiBaseUrl();
  const isLocalhost = /localhost|127\.0\.0\.1/i.test(base);
  const isEmulatorOnlyHost = /10\.0\.2\.2/i.test(base);
  const parts = [
    `URL: ${base}`,
    isEmulatorOnlyHost
      ? '10.0.2.2 only works inside the Android *emulator* (it means “the PC”). On a real Android phone use your PC Wi‑Fi IP in expo.extra.apiBaseUrl, e.g. http://192.168.1.50:3000.'
      : isLocalhost
        ? Platform.OS === 'web'
          ? 'Expo web on your laptop uses 127.0.0.1 for Auth in development (same PC). If you forced a LAN URL and login fails, unset EXPO_PUBLIC_API_USE_CONFIGURED_URL or fix Windows / browser access to that IP.'
          : 'Phone cannot reach localhost (that is the phone itself). In app.json set expo.extra.apiBaseUrl to http://YOUR_PC_LAN_IP:PORT or use a .env EXPO_PUBLIC_API_BASE_URL. Same Wi‑Fi; allow port in Windows Firewall.'
        : 'Check: Auth on that IP, Windows firewall, phone + PC on same Wi‑Fi. If your PC’s LAN address changed, restart Expo — in development the app uses Metro’s host when it differs from app.json (see [api-config] in Metro). Force a fixed URL with EXPO_PUBLIC_API_USE_CONFIGURED_URL=1.',
    'expo start --tunnel: tunnel only helps Metro; API must still be your PC LAN IP, not *.exp.direct.',
  ];
  return parts.join('\n');
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
