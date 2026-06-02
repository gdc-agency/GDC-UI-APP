import { Alert } from 'react-native';

import { downloadChatDocument } from '@/utils/chat-document-download';
import { openChatDocument } from '@/utils/chat-document-open';

/** @param {{ id?: string; attachmentUri?: string; attachmentName?: string }} task */
function taskCacheId(task) {
  return task?.id != null ? `task_${task.id}` : undefined;
}

/** @param {{ attachmentUri?: string; attachmentName?: string; id?: string }} task */
export async function openTaskAttachment(task) {
  const uri = String(task?.attachmentUri || '').trim();
  if (!uri) throw new Error('Attachment is not available yet.');
  await openChatDocument({
    uri,
    fileName: task.attachmentName || 'attachment',
    messageId: taskCacheId(task),
  });
}

/** @param {{ attachmentUri?: string; attachmentName?: string; id?: string }} task */
export async function downloadTaskAttachment(task) {
  const uri = String(task?.attachmentUri || '').trim();
  if (!uri) throw new Error('Attachment is not available yet.');
  return downloadChatDocument({
    messageId: taskCacheId(task) || `task_${Date.now()}`,
    uri,
    fileName: task.attachmentName || 'attachment',
  });
}

/**
 * @param {{ attachmentUri?: string; attachmentName?: string; id?: string }} task
 * @param {{ onBusy?: (busy: boolean) => void }} [opts]
 */
export function promptTaskAttachmentActions(task, opts = {}) {
  const uri = String(task?.attachmentUri || '').trim();
  const label = task?.attachmentName || 'Attachment';
  if (!uri) {
    Alert.alert('Attachment', 'This file is not available on the server.');
    return;
  }

  Alert.alert(label, 'Open or save this file on your device?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'View',
      onPress: () => {
        void (async () => {
          try {
            opts.onBusy?.(true);
            await openTaskAttachment(task);
          } catch (e) {
            Alert.alert('Attachment', e?.message ?? 'Could not open file.');
          } finally {
            opts.onBusy?.(false);
          }
        })();
      },
    },
    {
      text: 'Download',
      onPress: () => {
        void (async () => {
          try {
            opts.onBusy?.(true);
            await downloadTaskAttachment(task);
            Alert.alert('Download', 'File saved on this device. Tap View to open it.');
          } catch (e) {
            Alert.alert('Download', e?.message ?? 'Could not download file.');
          } finally {
            opts.onBusy?.(false);
          }
        })();
      },
    },
  ]);
}
