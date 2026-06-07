import { getTaskApiBaseUrl } from '@/data/constants/api-config';
import { Platform } from 'react-native';

const REQUEST_TIMEOUT_MS = 45000;

function taskNetworkHint() {
  const base = getTaskApiBaseUrl();
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.warn('[api] Task request failed', { base, platform: Platform.OS });
    if (Platform.OS === 'web') {
      return `Cannot connect to the task service at ${base}. In Expo web dev, run the local Task service (npm run dev in taskmanagment-Services, port 4000) or set EXPO_PUBLIC_API_USE_CONFIGURED_URL=1 after Render CORS is updated.`;
    }
    return `Cannot connect to the task service at ${base}. Ensure Task service is running (port 4000) and your phone/PC are on the same Wi‑Fi.`;
  }
  return 'Cannot connect to the task service. Check your network and try again.';
}

export class TaskApiError extends Error {
  /** @param {string} message */
  /** @param {number} status */
  /** @param {unknown} body */
  constructor(message, status, body) {
    super(message);
    this.name = 'TaskApiError';
    this.status = status;
    this.body = body;
  }
}

/**
 * HTTP helper for Task Management Service (separate base URL from main Auth API).
 *
 * @param {string} path - e.g. `/api/getTasks`
 * @param {object} [options]
 * @param {string} [options.method]
 * @param {string} [options.token] - JWT Bearer (same token as Auth)
 * @param {object} [options.body] - JSON body unless isFormData
 * @param {Record<string, string>} [options.headers]
 * @param {boolean} [options.isFormData]
 */
export async function taskApiRequest(path, options = {}) {
  const { method = 'GET', token, body, headers = {}, isFormData = false } = options;
  const base = getTaskApiBaseUrl();
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
      throw new Error(`Task request timed out (${REQUEST_TIMEOUT_MS / 1000}s).\n\n${taskNetworkHint()}`);
    }
    const raw = err && typeof err.message === 'string' ? err.message : 'Network error';
    throw new Error(`${raw}\n\n${taskNetworkHint()}`);
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
        : `Task request failed (${res.status})`;
    throw new TaskApiError(msg, res.status, data);
  }

  return data;
}
