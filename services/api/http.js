import { API_BASE_URL } from '@/constants/api-config';

function networkErrorHint() {
  const base = API_BASE_URL;
  const isLocalhost = /localhost|127\.0\.0\.1/i.test(base);
  const parts = [
    `URL: ${base}`,
    isLocalhost
      ? 'Still localhost: use Expo Go on device with dev mode — api-config should auto-pick PC IP; or set app.json extra.apiBaseUrl to http://YOUR_PC_IP:PORT'
      : 'Check: Auth service running, PC firewall allows PORT, phone + PC on same Wi‑Fi.',
    'Android emulator: http://10.0.2.2:PORT if LAN auto fails.',
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
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

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

  let res;
  try {
    res = await fetch(url, init);
  } catch (err) {
    const raw = err && typeof err.message === 'string' ? err.message : 'Network error';
    throw new Error(`${raw}\n\n${networkErrorHint()}`);
  }

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
