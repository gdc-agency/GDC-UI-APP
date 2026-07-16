/** Organization production backends (Render). */
export const GDC_REMOTE_API = {
  auth: 'https://org-gdc-backend.onrender.com',
  task: 'https://org-task-backend.onrender.com',
  chat: 'https://org-chat-backend-rey1.onrender.com',
  attendance: 'https://org-attendence-backend.onrender.com',
};

/** Broken / retired hosts — never call these from the app. */
export const LEGACY_RENDER_HOSTS = new Set([
  'gdc-backend-yrit.onrender.com',
  'taskmanagment-backend-34i7.onrender.com',
  'chat-backend-y6j2.onrender.com',
  'attendence-service-rdvv.onrender.com',
]);

/** Local PC backends when EXPO_PUBLIC_API_MODE=local */
export const LOCAL_API_PORTS = {
  auth: 5000,
  task: 5001,
  chat: 5002,
  attendance: 5003,
};

function stripUrlWhitespace(url) {
  return String(url || '')
    .replace(/\s+/g, '')
    .trim();
}

function hostFromUrl(url) {
  try {
    return new URL(stripUrlWhitespace(url)).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/** @param {'auth'|'task'|'chat'|'attendance'} service */
export function sanitizeServiceUrl(url, service) {
  const fallback = GDC_REMOTE_API[service] || '';
  const s = stripUrlWhitespace(url).replace(/\/+$/, '');
  if (!s) return fallback;
  const host = hostFromUrl(s);
  if (LEGACY_RENDER_HOSTS.has(host)) return fallback;
  return s;
}

export function isLegacyRenderHost(url) {
  return LEGACY_RENDER_HOSTS.has(hostFromUrl(url));
}
