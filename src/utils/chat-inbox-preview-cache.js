import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'gdc_chat_inbox_preview:';

/** @param {string} myId */
export function previewCacheStorageKey(myId) {
  return `${PREFIX}${String(myId || '').trim()}`;
}

/** @param {unknown} preview */
export function slimPreviewForCache(preview) {
  if (!preview || typeof preview !== 'object') return null;
  const p = /** @type {Record<string, unknown>} */ ({ ...preview });
  if (p.type === 'image' && typeof p.uri === 'string') delete p.uri;
  if (p.type === 'file' && typeof p.uri === 'string' && String(p.uri).startsWith('data:')) delete p.uri;
  return p;
}

/** @param {string} myId @returns {Promise<Record<string, Record<string, unknown>>>} */
export async function loadPreviewCache(myId) {
  const key = previewCacheStorageKey(myId);
  if (!key || key === PREFIX) return {};
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** @param {string} myId @param {Record<string, Record<string, unknown>>} cache */
export async function savePreviewCache(myId, cache) {
  const key = previewCacheStorageKey(myId);
  if (!key || key === PREFIX) return;
  try {
    await AsyncStorage.setItem(key, JSON.stringify(cache || {}));
  } catch {
    /* ignore */
  }
}

/** @param {unknown} preview */
export function previewHasContent(preview) {
  if (!preview || typeof preview !== 'object') return false;
  const p = /** @type {Record<string, unknown>} */ (preview);
  if (p.deleted) return true;
  if (p.type === 'image' || p.type === 'file') return true;
  return String(p.text || '').trim().length > 0;
}
