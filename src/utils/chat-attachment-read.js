import {
  copyAsync,
  documentDirectory,
  getInfoAsync,
  readAsStringAsync,
} from 'expo-file-system/legacy';
import { Platform } from 'react-native';

/** Skip oversized uploads — large base64 payloads can OOM crash release APKs. */
const MAX_READ_BYTES = 900_000;

/**
 * @param {string} uri
 */
async function assertReadableSize(uri) {
  try {
    const info = await getInfoAsync(uri, { size: true });
    if (info.exists && typeof info.size === 'number' && info.size > MAX_READ_BYTES) {
      throw new Error('File too large');
    }
  } catch (err) {
    if (err instanceof Error && err.message === 'File too large') throw err;
  }
}

/**
 * @param {string} uri
 */
async function resolveNativeReadUri(uri) {
  const src = String(uri || '').trim();
  if (!src) throw new Error('Missing file URI');

  try {
    await assertReadableSize(src);
    const b64 = await readAsStringAsync(src, { encoding: 'base64' });
    return b64;
  } catch (firstErr) {
    if (firstErr instanceof Error && firstErr.message === 'File too large') throw firstErr;
    if (!documentDirectory) throw firstErr;

    const dest = `${documentDirectory}gdc-upload-${Date.now()}.jpg`;
    await copyAsync({ from: src, to: dest });
    await assertReadableSize(dest);
    return readAsStringAsync(dest, { encoding: 'base64' });
  }
}

/**
 * Read local file URI as data URL for Chat API attachment field.
 * @param {string} uri
 * @param {string} mimeType
 * @param {string} [fileName]
 * @returns {Promise<{ dataUrl: string; byteLength: number }>}
 */
export async function readLocalUriAsDataUrl(uri, mimeType, fileName = 'file') {
  const mime = mimeType && String(mimeType).trim() ? String(mimeType).trim() : 'application/octet-stream';

  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    if (blob.size > MAX_READ_BYTES) throw new Error('File too large');
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const r = reader.result;
        if (typeof r === 'string') resolve(r);
        else reject(new Error('Could not read file'));
      };
      reader.onerror = () => reject(reader.error || new Error('Read failed'));
      reader.readAsDataURL(blob);
    });
    const approx = Math.floor((dataUrl.length * 3) / 4) - String(fileName).length;
    return { dataUrl, byteLength: Math.max(0, approx) };
  }

  const b64 = await resolveNativeReadUri(uri);
  if (b64.length * 0.75 > MAX_READ_BYTES) throw new Error('File too large');
  const dataUrl = `data:${mime};base64,${b64}`;
  const pad = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  const byteLength = Math.floor((b64.length * 3) / 4) - pad;
  return { dataUrl, byteLength };
}
