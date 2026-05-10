import Constants from 'expo-constants';
import { NativeModules, Platform } from 'react-native';

const extra = Constants.expoConfig?.extra ?? Constants.manifest?.extra ?? {};

/**
 * Metro / Expo dev server host from expo config.
 * Example: hostUri "192.168.1.8:8081" → "192.168.1.8"
 */
function devMachineHostFromExpo() {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri && typeof hostUri === 'string') {
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') return host;
  }
  const legacy = Constants.manifest && typeof Constants.manifest === 'object' ? Constants.manifest.debuggerHost : null;
  if (legacy && typeof legacy === 'string') {
    const host = legacy.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') return host;
  }
  return null;
}

/**
 * Packager URL embedded in the bundle (works on physical device when hostUri is missing).
 * e.g. http://192.168.1.15:8081/... → 192.168.1.15
 */
function devMachineHostFromBundle() {
  try {
    const url = NativeModules?.SourceCode?.scriptURL;
    if (!url || typeof url !== 'string') return null;
    const noProto = url.replace(/^[a-zA-Z+-]+:\/\//, '');
    const host = noProto.split(':')[0].split('/')[0];
    if (!host || host === 'localhost' || host === '127.0.0.1') return null;
    return host;
  } catch {
    return null;
  }
}

function resolveDevLanHost() {
  return devMachineHostFromExpo() || devMachineHostFromBundle();
}

function portFromConfiguredUrl(url) {
  const m = String(url).match(/:(\d+)(?:\/|$)/);
  return m ? m[1] : null;
}

const configuredUrl = String(extra.apiBaseUrl ?? process.env.EXPO_PUBLIC_API_BASE_URL ?? '').trim();
/** Match Aouth-Service default (.env PORT=3000) */
const apiPort = String(
  extra.apiPort ?? process.env.EXPO_PUBLIC_API_PORT ?? portFromConfiguredUrl(configuredUrl) ?? '3000',
);

function isLoopbackUrl(url) {
  return /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:|\/|$)/i.test(String(url));
}

/**
 * Resolved API base (no trailing slash).
 *
 * Physical device + Expo Go: never use localhost for API — use LAN IP from Metro / bundle.
 */
export const API_BASE_URL = (() => {
  if (configuredUrl && !isLoopbackUrl(configuredUrl)) {
    return configuredUrl.replace(/\/+$/, '');
  }

  const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
  const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

  if (isDev && isNative) {
    const lan = resolveDevLanHost();
    if (lan) {
      const url = `http://${lan}:${apiPort}`;
      console.log(`[api-config] Dev: LAN API → ${url}`);
      return url;
    }
    if (Platform.OS === 'android') {
      const url = `http://10.0.2.2:${apiPort}`;
      console.warn(`[api-config] Dev: no LAN host found; Android emulator fallback → ${url}`);
      return url;
    }
  }

  const fallback = configuredUrl || `http://localhost:${apiPort}`;
  const out = fallback.replace(/\/+$/, '');
  if (isNative && isLoopbackUrl(out)) {
    console.warn(
      `[api-config] API is still loopback (${out}). Physical device cannot reach your PC. Set expo.extra.apiBaseUrl to http://YOUR_PC_IP:${apiPort}`,
    );
  }
  return out;
})();
