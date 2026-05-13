import { readAsStringAsync } from 'expo-file-system/legacy';
import { Platform } from 'react-native';

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

  const b64 = await readAsStringAsync(uri, { encoding: 'base64' });
  const dataUrl = `data:${mime};base64,${b64}`;
  const pad = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  const byteLength = Math.floor((b64.length * 3) / 4) - pad;
  return { dataUrl, byteLength };
}
