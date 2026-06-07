import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { NativeModules, Platform } from 'react-native';

/** Always read latest `extra` (fixes stale URLs when Metro cache / Expo loads config after first import). */
export function getExpoExtra() {
  return (
    Constants.expoConfig?.extra ??
    (typeof Constants.manifest2 === 'object' && Constants.manifest2?.extra
      ? /** @type {Record<string, unknown>} */ (Constants.manifest2.extra)
      : null) ??
    Constants.manifest?.extra ??
    {}
  );
}

/** Remove accidental spaces in URLs (e.g. `http://192.168.1 .19:3000` breaks fetch / DNS). */
function stripUrlWhitespace(url) {
  return String(url || '')
    .replace(/\s+/g, '')
    .trim();
}

const apiConfigLogKeys = new Set();

function logApiConfigOnce(level, key, message) {
  if (apiConfigLogKeys.has(key)) return;
  apiConfigLogKeys.add(key);
  const fn = level === 'warn' ? console.warn : console.log;
  fn(message);
}

/**
 * `expo start --tunnel` exposes Metro via Expo cloud (*.exp.direct), not your PC.
 * Using that hostname for REST API → wrong machine, very long hangs.
 */
function isTunnelOrCloudPackagerHost(host) {
  if (!host || typeof host !== 'string') return true;
  const h = host.toLowerCase().trim();
  if (h === 'localhost' || h === '127.0.0.1') return true;
  return (
    h.includes('.exp.direct') ||
    h.endsWith('.expo.dev') ||
    h.includes('ngrok') ||
    h.includes('ngrok-free.app')
  );
}

function devMachineHostFromExpo() {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri && typeof hostUri === 'string') {
    const host = hostUri.split(':')[0].replace(/\s+/g, '');
    if (host && !isTunnelOrCloudPackagerHost(host)) return host;
  }
  const legacy = Constants.manifest && typeof Constants.manifest === 'object' ? Constants.manifest.debuggerHost : null;
  if (legacy && typeof legacy === 'string') {
    const host = legacy.split(':')[0].replace(/\s+/g, '');
    if (host && !isTunnelOrCloudPackagerHost(host)) return host;
  }
  return null;
}

/**
 * Packager URL embedded in the bundle.
 * e.g. http://192.168.1.15:8081/... → 192.168.1.15
 */
function devMachineHostFromBundle() {
  try {
    const url = NativeModules?.SourceCode?.scriptURL;
    if (!url || typeof url !== 'string') return null;
    const noProto = url.replace(/^[a-zA-Z+-]+:\/\//, '');
    const host = noProto.split(':')[0].split('/')[0].replace(/\s+/g, '');
    if (!host || isTunnelOrCloudPackagerHost(host)) return null;
    return host;
  } catch {
    return null;
  }
}

function resolveDevLanHost() {
  const raw = devMachineHostFromExpo() || devMachineHostFromBundle();
  if (!raw) return null;
  return String(raw).replace(/\s+/g, '').trim();
}

function portFromConfiguredUrl(url) {
  const m = String(url).match(/:(\d+)(?:\/|$)/);
  return m ? m[1] : null;
}

export function isLoopbackUrl(url) {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:|\/|$)/i.test(String(url));
}

/** Render / HTTPS deploy — never rewrite to Metro LAN in dev. */
function isRemoteHostedUrl(url) {
  const s = stripUrlWhitespace(String(url || '')).replace(/\/+$/, '');
  if (!s) return false;
  try {
    const u = new URL(s);
    if (u.protocol === 'https:') return true;
    if (/\.onrender\.com$/i.test(u.hostname)) return true;
  } catch {
    return /^https:\/\//i.test(s) || /\.onrender\.com/i.test(s);
  }
  return false;
}

/**
 * Browsers (Expo web on a laptop) and phones cannot use "localhost" for APIs on another interface.
 * When Metro exposes a LAN host, rewrite loopback URLs to that host (port preserved).
 */
function rewriteLoopbackUrlToMetroLan(url) {
  const s = stripUrlWhitespace(String(url || '')).replace(/\/+$/, '');
  if (!isLoopbackUrl(s)) return s;
  const lan = resolveDevLanHost();
  if (!lan) return s;
  try {
    const u = new URL(s);
    u.hostname = lan;
    return stripUrlWhitespace(u.toString()).replace(/\/+$/, '');
  } catch {
    return s;
  }
}

/**
 * Expo **web** runs in the same OS as Auth. Fetching your own LAN IP (e.g. 192.168.1.7) from that
 * same machine often fails on Windows ("Failed to fetch") while phones on Wi‑Fi work. Use loopback
 * in dev. Opt out: EXPO_PUBLIC_API_USE_CONFIGURED_URL=1.
 */
function applyWebDevLoopbackForSameMachineAuth(url) {
  const normalized = stripUrlWhitespace(String(url || '')).replace(/\/+$/, '');
  if (Platform.OS !== 'web') return normalized;
  if (typeof __DEV__ === 'undefined' || !__DEV__) return normalized;
  if (isRemoteHostedUrl(normalized)) return normalized;
  if (String(process.env.EXPO_PUBLIC_API_USE_CONFIGURED_URL ?? '').trim() === '1') {
    return normalized;
  }
  if (!isLoopbackUrl(normalized)) {
    try {
      const u = new URL(normalized);
      if (u.protocol !== 'http:') return normalized;
    } catch {
      return normalized;
    }
  }
  try {
    const u = new URL(normalized);
    const port = u.port || '5001';
    const out = stripUrlWhitespace(`http://127.0.0.1:${port}`).replace(/\/+$/, '');
    if (out !== normalized) {
      logApiConfigOnce('log', `web-loopback:${out}`, `[api-config] Web dev: use ${out} instead of LAN URL (same-PC browser ↔ API).`);
    }
    return out;
  } catch {
    return normalized;
  }
}

/**
 * Auth (Aouth-Service) base URL — re-resolved on each call so device/LAN never sticks to an old value.
 * @param {Record<string, unknown>} ex
 */
function resolveApiBaseUrlFromExtra(ex) {
  const configuredUrl = stripUrlWhitespace(String(ex.apiBaseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? ''));
  if (configuredUrl && isRemoteHostedUrl(configuredUrl)) {
    return configuredUrl.replace(/\/+$/, '');
  }
  const apiPort = String(
    ex.apiPort ?? process.env.EXPO_PUBLIC_API_PORT ?? portFromConfiguredUrl(configuredUrl) ?? '5001',
  );
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
  const isWeb = Platform.OS === 'web';
  const isDevClient = isNative || isWeb;
  const forceConfigured =
    String(process.env.EXPO_PUBLIC_API_USE_CONFIGURED_URL ?? '').trim() === '1';

  /**
   * On device or Expo web, `expo.extra.apiBaseUrl` may be stale vs the PC running Metro.
   * Prefer the host Metro reports when it differs from the configured host. Opt out with
   * EXPO_PUBLIC_API_USE_CONFIGURED_URL=1.
   */
  if (isDev && isDevClient && !forceConfigured && !isRemoteHostedUrl(configuredUrl)) {
    const lan = resolveDevLanHost();
    if (lan) {
      if (configuredUrl && !isLoopbackUrl(configuredUrl)) {
        try {
          const host = new URL(configuredUrl).hostname.replace(/\s+/g, '');
          if (host === lan) {
            return stripUrlWhitespace(configuredUrl).replace(/\/+$/, '');
          }
          const url = stripUrlWhitespace(`http://${lan}:${apiPort}`);
          logApiConfigOnce(
            'warn',
            `auth-host-mismatch:${url}:${configuredUrl}`,
            `[api-config] Dev: Auth → ${url} (Metro LAN) instead of configured ${configuredUrl} (host mismatch). Set EXPO_PUBLIC_API_USE_CONFIGURED_URL=1 to force configured URL.`,
          );
          return url.replace(/\/+$/, '');
        } catch {
          /* fall through to LAN URL below */
        }
      }
      const url = stripUrlWhitespace(`http://${lan}:${apiPort}`);
      logApiConfigOnce('log', `lan-api:${url}`, `[api-config] Dev: LAN API → ${url}`);
      return url.replace(/\/+$/, '');
    }
  }

  if (configuredUrl && !isLoopbackUrl(configuredUrl)) {
    return stripUrlWhitespace(configuredUrl).replace(/\/+$/, '');
  }

  if (isDev && isDevClient) {
    if (Platform.OS === 'android' && Device.isDevice === false) {
      const url = stripUrlWhitespace(`http://10.0.2.2:${apiPort}`);
      logApiConfigOnce('warn', `android-emulator:${url}`, `[api-config] Dev: Android emulator → ${url}`);
      return url.replace(/\/+$/, '');
    }
  }

  const fallback = stripUrlWhitespace(configuredUrl || `http://localhost:${apiPort}`);
  const out = fallback.replace(/\/+$/, '');
  if (isDevClient && isLoopbackUrl(out) && !resolveDevLanHost()) {
    logApiConfigOnce(
      'warn',
      `loopback-api:${out}`,
      `[api-config] API is loopback (${out}). For mobile or Expo web use your PC LAN IP (e.g. http://192.168.x.x:${apiPort}) or start Expo on LAN so Metro host is detected.`,
    );
  }
  return stripUrlWhitespace(out).replace(/\/+$/, '');
}

/** @param {string} port */
function rewriteLegacyTaskPort5001(url, port) {
  const p = String(port || '4000');
  try {
    const u = new URL(stripUrlWhitespace(String(url)));
    /** Old task default was :5001; remap to `p` unless user really runs Task on 5001 (`p === '5001'`). */
    if (u.port === '5001' && p !== '5001') u.port = p;
    return stripUrlWhitespace(u.toString()).replace(/\/+$/, '');
  } catch {
    return stripUrlWhitespace(String(url))
      .replace(/\/+$/, '')
      .replace(/:(5001)(?=\/|\?|#|$)/, p !== '5001' ? `:${p}` : ':5001');
  }
}

/** @param {string} apiBase @param {string} taskApiPort */
function taskBaseFromAuthHost(apiBase, taskApiPort) {
  try {
    const u = new URL(stripUrlWhitespace(apiBase));
    u.port = String(taskApiPort);
    return stripUrlWhitespace(u.toString()).replace(/\/+$/, '');
  } catch {
    return `http://localhost:${String(taskApiPort)}`;
  }
}

/**
 * Task service base URL. Only `expo.extra.taskApiBaseUrl` overrides (no EXPO_PUBLIC_TASK_* — avoids stale :5001 in bundles).
 * @param {Record<string, unknown>} ex
 * @param {string} apiBase
 */
function resolveTaskApiBaseFromExtra(ex, apiBase) {
  let configuredTaskUrl = stripUrlWhitespace(String(ex.taskApiBaseUrl ?? '').replace(/^\uFEFF/, ''));
  if (configuredTaskUrl && isRemoteHostedUrl(configuredTaskUrl)) {
    return configuredTaskUrl.replace(/\/+$/, '');
  }
  /** Embedded / OTA manifests sometimes ship legacy `localhost:5001` — never use it. */
  if (/^(https?:\/\/)?(localhost|127\.0\.0\.1):5001(\/|\?|#|$)/i.test(configuredTaskUrl)) {
    configuredTaskUrl = '';
  }

  const rawTaskPort = ex.taskApiPort != null && ex.taskApiPort !== '' ? Number(ex.taskApiPort) : NaN;
  let taskApiPort = Number.isFinite(rawTaskPort) && rawTaskPort > 0 ? String(rawTaskPort) : '4000';
  /**
   * Published builds used `taskApiPort: 5001` when the server defaulted to 5001.
   * If full Task URL is not a non-loopback override, treat 5001 as mistake → 4000.
   */
  if (
    taskApiPort === '5001' &&
    (!configuredTaskUrl || isLoopbackUrl(configuredTaskUrl))
  ) {
    taskApiPort = '4000';
  }

  let out;
  if (configuredTaskUrl) {
    let u = stripUrlWhitespace(configuredTaskUrl).replace(/\/+$/, '');
    u = rewriteLegacyTaskPort5001(u, taskApiPort);
    try {
      void new URL(u);
      out = u.replace(/\/+$/, '');
    } catch {
      out = u;
    }
  } else {
    out = taskBaseFromAuthHost(apiBase, taskApiPort);
  }

  out = rewriteLegacyTaskPort5001(out, taskApiPort);

  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
  const isWeb = Platform.OS === 'web';
  if ((isNative || isWeb) && isLoopbackUrl(out) && !isLoopbackUrl(apiBase)) {
    out = taskBaseFromAuthHost(apiBase, taskApiPort);
    out = rewriteLegacyTaskPort5001(out, taskApiPort);
  }

  if (taskApiPort !== '5001') {
    try {
      const u = new URL(out);
      if (u.port === '5001') {
        u.port = String(taskApiPort);
        out = stripUrlWhitespace(u.toString()).replace(/\/+$/, '');
      }
    } catch {
      out = out.replace(/:(5001)(?=\/|\?|#|$)/, `:${taskApiPort}`);
    }
  }

  return out;
}

/**
 * Chat service base URL. `expo.extra.chatApiBaseUrl` overrides; else same host as Auth + `chatApiPort` (default 5003).
 * @param {Record<string, unknown>} ex
 * @param {string} apiBase
 */
function resolveChatApiBaseFromExtra(ex, apiBase) {
  let configuredChatUrl = stripUrlWhitespace(String(ex.chatApiBaseUrl ?? '').replace(/^\uFEFF/, ''));
  if (configuredChatUrl && isRemoteHostedUrl(configuredChatUrl)) {
    return configuredChatUrl.replace(/\/+$/, '');
  }
  const rawChatPort = ex.chatApiPort != null && ex.chatApiPort !== '' ? Number(ex.chatApiPort) : NaN;
  const chatApiPort = Number.isFinite(rawChatPort) && rawChatPort > 0 ? String(rawChatPort) : '5003';

  let out;
  if (configuredChatUrl) {
    try {
      void new URL(configuredChatUrl);
      out = stripUrlWhitespace(configuredChatUrl).replace(/\/+$/, '');
    } catch {
      out = configuredChatUrl;
    }
  } else {
    out = taskBaseFromAuthHost(apiBase, chatApiPort);
  }

  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
  const isWeb = Platform.OS === 'web';
  if ((isNative || isWeb) && isLoopbackUrl(out) && !isLoopbackUrl(apiBase)) {
    out = taskBaseFromAuthHost(apiBase, chatApiPort);
  }

  return stripUrlWhitespace(out).replace(/\/+$/, '');
}

/** Auth API base (no trailing slash). Call on each request — do not cache at module scope. */
export function getApiBaseUrl() {
  const ex = getExpoExtra();
  let out = applyWebDevLoopbackForSameMachineAuth(
    rewriteLoopbackUrlToMetroLan(resolveApiBaseUrlFromExtra(ex)),
  );

  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
  if (isNative && Device.isDevice === true && isLoopbackUrl(out)) {
    const lan = resolveDevLanHost();
    const apiPort = String(
      ex.apiPort ?? process.env.EXPO_PUBLIC_API_PORT ?? portFromConfiguredUrl(out) ?? '5001',
    );
    if (lan) {
      out = stripUrlWhitespace(`http://${lan}:${apiPort}`).replace(/\/+$/, '');
      logApiConfigOnce(
        'warn',
        `auth-device-lan:${out}`,
        `[api-config] Auth → ${out} (device cannot use loopback; using Metro LAN host)`,
      );
    }
  }

  return out;
}

/** Task Management API base (no trailing slash). Call on each request. */
export function getTaskApiBaseUrl() {
  const ex = getExpoExtra();
  const authBase = getApiBaseUrl();
  const rawPort = ex.taskApiPort != null && ex.taskApiPort !== '' ? Number(ex.taskApiPort) : NaN;
  let taskApiPort = Number.isFinite(rawPort) && rawPort > 0 ? String(rawPort) : '4000';
  if (taskApiPort === '5001') taskApiPort = '4000';

  const forceConfigured =
    String(process.env.EXPO_PUBLIC_API_USE_CONFIGURED_URL ?? '').trim() === '1';
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
  const isWeb = Platform.OS === 'web';
  const isDevClient = isNative || isWeb;

  /**
   * Dev / Expo: use local Task service (Metro LAN or loopback) even when app.json points at Render.
   * Production APK keeps the deployed Render URL. Opt out: EXPO_PUBLIC_API_USE_CONFIGURED_URL=1.
   */
  if (isDev && isDevClient && !forceConfigured) {
    /**
     * Expo web on the dev PC: Metro host is often `localhost` (ignored by resolveDevLanHost),
     * so the app was falling back to Render → browser CORS blocks Task (Auth allows 8081, Task does not).
     */
    if (Platform.OS === 'web') {
      const webHost =
        typeof window !== 'undefined' && window.location?.hostname
          ? String(window.location.hostname).toLowerCase()
          : '';
      if (webHost === 'localhost' || webHost === '127.0.0.1') {
        const loopback = stripUrlWhitespace(`http://127.0.0.1:${taskApiPort}`).replace(/\/+$/, '');
        logApiConfigOnce(
          'log',
          `task-web-loopback:${loopback}`,
          `[api-config] Dev web: Task → ${loopback} (local; Render Task lacks Expo web CORS)`,
        );
        return loopback;
      }
    }

    const lan = resolveDevLanHost();
    if (lan) {
      const localUrl = stripUrlWhitespace(`http://${lan}:${taskApiPort}`).replace(/\/+$/, '');
      logApiConfigOnce(
        'log',
        `task-dev-lan:${localUrl}`,
        `[api-config] Dev: Task → ${localUrl} (local service; set EXPO_PUBLIC_API_USE_CONFIGURED_URL=1 to use Render)`,
      );
      return applyWebDevLoopbackForSameMachineAuth(rewriteLoopbackUrlToMetroLan(localUrl));
    }
    if (Platform.OS === 'android' && Device.isDevice === false) {
      const emulatorUrl = stripUrlWhitespace(`http://10.0.2.2:${taskApiPort}`).replace(/\/+$/, '');
      logApiConfigOnce('log', `task-emulator:${emulatorUrl}`, `[api-config] Dev: Task → ${emulatorUrl}`);
      return emulatorUrl;
    }
  }

  let out = applyWebDevLoopbackForSameMachineAuth(
    rewriteLoopbackUrlToMetroLan(resolveTaskApiBaseFromExtra(ex, authBase)),
  );

  const isPhysicalDevice = isNative && Device.isDevice === true;
  if (isPhysicalDevice && isLoopbackUrl(out)) {
    const lan = resolveDevLanHost();
    if (lan) {
      out = stripUrlWhitespace(`http://${lan}:${taskApiPort}`).replace(/\/+$/, '');
      logApiConfigOnce(
        'warn',
        `task-device-lan:${out}`,
        `[api-config] Task → ${out} (device cannot use loopback; using Metro LAN host)`,
      );
    }
  }

  if (Platform.OS === 'web' && isDev) {
    const webHost =
      typeof window !== 'undefined' && window.location?.hostname
        ? String(window.location.hostname).toLowerCase()
        : '';
    if (webHost === 'localhost' || webHost === '127.0.0.1') {
      out = applyWebDevLoopbackForSameMachineAuth(out);
    }
  }

  return stripUrlWhitespace(out).replace(/\/+$/, '');
}

/** Chat service API base (no trailing slash). Separate deploy from Auth; same JWT as CRM login. */
export function getChatApiBaseUrl() {
  const ex = getExpoExtra();
  return applyWebDevLoopbackForSameMachineAuth(rewriteLoopbackUrlToMetroLan(resolveChatApiBaseFromExtra(ex, getApiBaseUrl())));
}

/**
 * Attendance service base URL. `expo.extra.attendanceApiBaseUrl` overrides; else Auth host + `attendanceApiPort` (default 5000).
 * @param {Record<string, unknown>} ex
 * @param {string} apiBase
 */
function resolveAttendanceApiBaseFromExtra(ex, apiBase) {
  let configuredUrl = stripUrlWhitespace(String(ex.attendanceApiBaseUrl ?? '').replace(/^\uFEFF/, ''));
  if (configuredUrl && isRemoteHostedUrl(configuredUrl)) {
    return configuredUrl.replace(/\/+$/, '');
  }
  const rawPort = ex.attendanceApiPort != null && ex.attendanceApiPort !== '' ? Number(ex.attendanceApiPort) : NaN;
  const attendanceApiPort = Number.isFinite(rawPort) && rawPort > 0 ? String(rawPort) : '5000';

  let out;
  if (configuredUrl) {
    try {
      void new URL(configuredUrl);
      out = stripUrlWhitespace(configuredUrl).replace(/\/+$/, '');
    } catch {
      out = configuredUrl;
    }
  } else {
    out = taskBaseFromAuthHost(apiBase, attendanceApiPort);
  }

  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
  const isWeb = Platform.OS === 'web';
  if ((isNative || isWeb) && isLoopbackUrl(out) && !isLoopbackUrl(apiBase)) {
    out = taskBaseFromAuthHost(apiBase, attendanceApiPort);
  }

  return stripUrlWhitespace(out).replace(/\/+$/, '');
}

/** Attendance service API base (no trailing slash). Same JWT as Auth login. */
export function getAttendanceApiBaseUrl() {
  const ex = getExpoExtra();
  const authBase = getApiBaseUrl();
  const rawPort = ex.attendanceApiPort != null && ex.attendanceApiPort !== '' ? Number(ex.attendanceApiPort) : NaN;
  const attendanceApiPort = Number.isFinite(rawPort) && rawPort > 0 ? String(rawPort) : '5000';
  const forceConfigured =
    String(process.env.EXPO_PUBLIC_API_USE_CONFIGURED_URL ?? '').trim() === '1';
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
  const isWeb = Platform.OS === 'web';
  const isDevClient = isNative || isWeb;

  let out = rewriteLoopbackUrlToMetroLan(resolveAttendanceApiBaseFromExtra(ex, authBase));

  const configuredAttendanceUrl = stripUrlWhitespace(String(ex.attendanceApiBaseUrl ?? ''));

  /**
   * Dev: `attendanceApiBaseUrl` in app.json often stays on an old LAN IP while Metro moves Auth to the
   * current PC host — phones then fail clock/manual fetches while web (127.0.0.1) still works.
   */
  if (isDev && isDevClient && !forceConfigured && !isRemoteHostedUrl(configuredAttendanceUrl)) {
    const lan = resolveDevLanHost();
    if (lan && configuredAttendanceUrl && !isLoopbackUrl(configuredAttendanceUrl)) {
      try {
        const host = new URL(configuredAttendanceUrl).hostname.replace(/\s+/g, '');
        if (host !== lan) {
          out = stripUrlWhitespace(`http://${lan}:${attendanceApiPort}`).replace(/\/+$/, '');
          logApiConfigOnce(
            'warn',
            `attendance-host-mismatch:${out}:${configuredAttendanceUrl}`,
            `[api-config] Dev: Attendance → ${out} (Metro LAN) instead of configured ${configuredAttendanceUrl}.`,
          );
        }
      } catch {
        /* fall through */
      }
    }
    try {
      const authHost = new URL(authBase).hostname.replace(/\s+/g, '');
      const outHost = new URL(out).hostname.replace(/\s+/g, '');
      if (authHost && outHost && authHost !== outHost && !isLoopbackUrl(authBase)) {
        const u = new URL(out);
        u.hostname = authHost;
        out = stripUrlWhitespace(u.toString()).replace(/\/+$/, '');
        logApiConfigOnce(
          'warn',
          `attendance-auth-host-sync:${out}`,
          `[api-config] Dev: Attendance host synced with Auth → ${out}`,
        );
      }
    } catch {
      /* ignore */
    }
  }

  const isPhysicalDevice = isNative && Device.isDevice === true;

  /** Real phone cannot reach the dev PC via 127.0.0.1 / localhost. */
  if (isPhysicalDevice && isLoopbackUrl(out)) {
    const lan = resolveDevLanHost();
    if (lan) {
      out = stripUrlWhitespace(`http://${lan}:${attendanceApiPort}`).replace(/\/+$/, '');
      logApiConfigOnce(
        'warn',
        `attendance-device-lan:${out}`,
        `[api-config] Attendance → ${out} (device cannot use loopback; using Metro LAN host)`,
      );
    }
  }

  /**
   * Expo web on the same PC: use loopback for Attendance (like Auth) — avoids Windows LAN fetch issues.
   * Expo web on phone browser keeps LAN IP (hostname is 192.168.x.x).
   */
  if (Platform.OS === 'web' && typeof __DEV__ !== 'undefined' && __DEV__) {
    const webHost =
      typeof window !== 'undefined' && window.location?.hostname
        ? String(window.location.hostname).toLowerCase()
        : '';
    const webDevOnSamePc = webHost === 'localhost' || webHost === '127.0.0.1';
    if (webDevOnSamePc) {
      out = applyWebDevLoopbackForSameMachineAuth(out);
    }
  }

  return stripUrlWhitespace(out).replace(/\/+$/, '');
}

/** True when the API URL cannot work on this physical device (localhost, or 10.0.2.2 on a real phone). */
export function isLoopbackApiOnNativeDevice() {
  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';
  if (!isNative) return false;
  const api = getApiBaseUrl();
  if (isLoopbackUrl(api)) return true;
  if (Platform.OS === 'android' && Device.isDevice === true && /10\.0\.2\.2/i.test(api)) return true;
  return false;
}

/** Production web build: loopback API is usually unreachable from real users’ machines. */
export function isLoopbackApiOnWebDev() {
  if (Platform.OS !== 'web') return false;
  if (typeof __DEV__ !== 'undefined' && __DEV__) return false;
  return isLoopbackUrl(getApiBaseUrl());
}

