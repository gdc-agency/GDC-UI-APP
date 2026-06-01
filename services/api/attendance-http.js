import { getAttendanceApiBaseUrl, isLoopbackUrl } from '@/constants/api-config';
import { Platform } from 'react-native';

const REQUEST_TIMEOUT_MS = 45000;

function attendanceNetworkHint() {
  const base = getAttendanceApiBaseUrl();
  const lines = [
    `Attendance service URL: ${base}`,
    'Attendance must run on your PC (Attendence-Service, PORT=5000).',
    'app.json: same Wi‑Fi IP as apiBaseUrl + attendanceApiPort 5000.',
    'Restart Metro: npx expo start -c',
  ];
  if (Platform.OS === 'web') {
    lines.push('Web: restart Attendence-Service after CORS update; use http://127.0.0.1:5000 on same PC.');
  } else if (isLoopbackUrl(base)) {
    lines.push('On a real phone, 127.0.0.1 does not work — use your PC LAN IP (e.g. http://192.168.1.7:5000).');
  }
  return lines.join('\n');
}

export class AttendanceApiError extends Error {
  /** @param {string} message */
  /** @param {number} status */
  /** @param {unknown} body */
  constructor(message, status, body) {
    super(message);
    this.name = 'AttendanceApiError';
    this.status = status;
    this.body = body;
  }
}

/**
 * @param {string} path
 * @param {object} [options]
 * @param {string} [options.method]
 * @param {string} [options.token]
 * @param {object} [options.body]
 * @param {Record<string, string>} [options.headers]
 */
export async function attendanceApiRequest(path, options = {}) {
  const { method = 'GET', token, body, headers = {} } = options;
  const base = getAttendanceApiBaseUrl();
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  /** @type {Record<string, string>} */
  const h = {
    Accept: 'application/json',
    ...headers,
  };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  if (body != null) {
    h['Content-Type'] = 'application/json';
  }

  /** @type {RequestInit} */
  const init = { method, headers: h };
  if (body != null) {
    init.body = JSON.stringify(body);
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
      throw new Error(`Attendance request timed out (${REQUEST_TIMEOUT_MS / 1000}s).\n\n${attendanceNetworkHint()}`);
    }
    const raw = err && typeof err.message === 'string' ? err.message : 'Network error';
    throw new Error(`${raw}\n\n${attendanceNetworkHint()}`);
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
        : typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
          ? data.error
          : `Attendance request failed (${res.status})`;
    throw new AttendanceApiError(msg, res.status, data);
  }

  return data;
}
