import {
  cacheDirectory,
  getContentUriAsync,
  writeAsStringAsync,
} from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { downloadChatDocument, getCachedChatDocumentPath } from '@/utils/chat-document-download';

function sanitizeFileName(name) {
  const base = String(name || 'document').trim() || 'document';
  return base.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 120);
}

/** @param {string} fileName */
export function guessDocumentMimeType(fileName) {
  const n = String(fileName || '').toLowerCase();
  if (n.endsWith('.pdf')) return 'application/pdf';
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
  if (n.endsWith('.doc')) return 'application/msword';
  if (n.endsWith('.docx')) return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  if (n.endsWith('.xls')) return 'application/vnd.ms-excel';
  if (n.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (n.endsWith('.ppt')) return 'application/vnd.ms-powerpoint';
  if (n.endsWith('.pptx')) return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  if (n.endsWith('.txt')) return 'text/plain';
  if (n.endsWith('.zip')) return 'application/zip';
  return 'application/octet-stream';
}

/**
 * @param {string} dataUrl
 * @param {string} fileName
 * @param {string} [messageId]
 */
async function materializeDataUrl(dataUrl, fileName, messageId) {
  if (!cacheDirectory) throw new Error('Storage unavailable');
  const match = dataUrl.match(/^data:([^;]+)?;base64,(.+)$/s);
  if (!match) throw new Error('Invalid file data');
  const dest = `${cacheDirectory}chat_open_${messageId || Date.now()}_${sanitizeFileName(fileName)}`;
  await writeAsStringAsync(dest, match[2], { encoding: 'base64' });
  return dest;
}

/**
 * Resolve attachment URI to a local file path suitable for opening.
 * @param {{ uri: string; fileName?: string; messageId?: string }} opts
 * @returns {Promise<string>}
 */
export async function resolveChatDocumentLocalUri({ uri, fileName, messageId }) {
  const source = String(uri || '').trim();
  if (!source) throw new Error('File not available');

  if (messageId) {
    const cached = await getCachedChatDocumentPath(String(messageId));
    if (cached) return cached;
  }

  if (source.startsWith('file://') || source.startsWith('content://')) {
    return source;
  }

  if (source.startsWith('data:')) {
    return materializeDataUrl(source, fileName, messageId);
  }

  if (/^https?:\/\//i.test(source)) {
    if (!messageId) throw new Error('Missing message id');
    return downloadChatDocument({
      messageId: String(messageId),
      uri: source,
      fileName,
    });
  }

  throw new Error('Unsupported file source');
}

/**
 * Open a chat document with the system viewer / browser.
 * @param {{ uri: string; fileName?: string; messageId?: string }} opts
 */
export async function openChatDocument({ uri, fileName, messageId }) {
  const localUri = await resolveChatDocumentLocalUri({ uri, fileName, messageId });
  const safeName = sanitizeFileName(fileName);

  if (Platform.OS === 'web') {
    if (localUri.startsWith('data:')) {
      const anchor = document.createElement('a');
      anchor.href = localUri;
      anchor.download = safeName;
      anchor.rel = 'noopener';
      anchor.click();
      return;
    }
    await Linking.openURL(localUri);
    return;
  }

  let openUri = localUri;
  if (Platform.OS === 'android') {
    try {
      openUri = await getContentUriAsync(localUri);
    } catch {
      openUri = localUri;
    }
  }

  try {
    await Linking.openURL(openUri);
    return;
  } catch {
    /* try raw file uri on iOS */
  }

  if (Platform.OS === 'ios' && !localUri.startsWith('file://')) {
    await Linking.openURL(`file://${localUri.replace(/^file:\/\//, '')}`);
    return;
  }

  await Linking.openURL(localUri);
}
