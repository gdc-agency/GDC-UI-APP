import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createDownloadResumable,
  documentDirectory,
  downloadAsync,
  getInfoAsync,
  makeDirectoryAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { runWithTransferProgress } from '@/utils/chat-transfer-progress';

const STORAGE_KEY = '@gdc_chat_doc_downloads_v1';

function sanitizeFileName(name) {
  const base = String(name || 'document').trim() || 'document';
  return base.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 120);
}

/** @returns {Promise<Record<string, string>>} */
async function readDownloadIndex() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/** @param {Record<string, string>} index */
async function writeDownloadIndex(index) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(index));
}

/**
 * @param {string} messageId
 * @returns {Promise<string | null>}
 */
export async function getCachedChatDocumentPath(messageId) {
  if (!messageId) return null;
  const index = await readDownloadIndex();
  const localUri = index[String(messageId)];
  if (!localUri) return null;
  try {
    const info = await getInfoAsync(localUri);
    if (info.exists) return localUri;
  } catch {
    /* fall through */
  }
  const next = { ...index };
  delete next[String(messageId)];
  await writeDownloadIndex(next);
  return null;
}

/**
 * @param {string} uri
 * @param {string} dest
 * @param {(ratio: number) => void} onProgress
 */
async function downloadRemoteWithProgress(uri, dest, onProgress) {
  onProgress(0);
  const resumable = createDownloadResumable(uri, dest, {}, (data) => {
    const expected = data.totalBytesExpectedToWrite;
    const written = data.totalBytesWritten;
    if (expected > 0) {
      onProgress(Math.min(1, written / expected));
    } else if (written > 0) {
      onProgress(Math.min(0.95, written / (written + 500000)));
    }
  });
  const result = await resumable.downloadAsync();
  if (!result || (result.status && result.status !== 200)) throw new Error('Download failed');
  onProgress(1);
}

/**
 * @param {string} dataUrl
 * @param {string} dest
 * @param {(ratio: number) => void} onProgress
 */
async function writeDataUrlWithProgress(dataUrl, dest, onProgress) {
  const match = dataUrl.match(/^data:[^;]+;base64,(.+)$/s);
  if (!match) throw new Error('Invalid attachment data');
  const b64 = match[1];
  const approxBytes = Math.floor((b64.length * 3) / 4);
  const estMs = Math.min(8000, Math.max(600, approxBytes / 40000));

  await runWithTransferProgress(
    () => writeAsStringAsync(dest, b64, { encoding: 'base64' }),
    onProgress,
    { from: 0, to: 1, maxMs: estMs },
  );
}

/**
 * Save a chat document attachment to app storage.
 * @param {{ messageId: string; uri: string; fileName?: string; onProgress?: (ratio: number) => void }} opts
 * @returns {Promise<string>}
 */
export async function downloadChatDocument({ messageId, uri, fileName, onProgress }) {
  if (!uri) throw new Error('Missing file URL');
  if (!documentDirectory) throw new Error('Storage unavailable');

  const safeName = sanitizeFileName(fileName);
  const dir = `${documentDirectory}chat-documents/`;
  await makeDirectoryAsync(dir, { intermediates: true });
  const dest = `${dir}${String(messageId)}_${safeName}`;

  const report = (ratio) => {
    if (typeof onProgress === 'function') onProgress(Math.min(1, Math.max(0, ratio)));
  };

  if (uri.startsWith('data:')) {
    await writeDataUrlWithProgress(uri, dest, report);
  } else if (/^https?:\/\//i.test(uri)) {
    try {
      await downloadRemoteWithProgress(uri, dest, report);
    } catch {
      await runWithTransferProgress(
        async () => {
          const result = await downloadAsync(uri, dest);
          if (result.status !== 200) throw new Error('Download failed');
        },
        report,
        { maxMs: 15000 },
      );
    }
  } else if (uri.startsWith('file://') || uri.startsWith('content://')) {
    if (Platform.OS === 'web') {
      const res = await fetch(uri);
      const blob = await res.blob();
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') resolve(reader.result);
          else reject(new Error('Read failed'));
        };
        reader.onerror = () => reject(reader.error || new Error('Read failed'));
        reader.readAsDataURL(blob);
      });
      await writeDataUrlWithProgress(dataUrl, dest, report);
    } else {
      await runWithTransferProgress(
        async () => {
          const result = await downloadAsync(uri, dest);
          if (result.status && result.status !== 200) throw new Error('Download failed');
        },
        report,
        { maxMs: 8000 },
      );
    }
  } else {
    throw new Error('Unsupported file source');
  }

  const index = await readDownloadIndex();
  index[String(messageId)] = dest;
  await writeDownloadIndex(index);
  return dest;
}
