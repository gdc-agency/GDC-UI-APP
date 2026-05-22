import { createMyNotification } from '@/services/api/notifications-api';
import { invalidateNotificationInbox } from '@/utils/notification-invalidate';

/**
 * Persist chat alert via deployed Auth API (POST /api/auth/notifications).
 * Safe for mobile — no internal service key.
 *
 * @param {string} token
 * @param {{ chatId: string; title?: string; preview?: string; senderName?: string }} notice
 */
export async function syncChatInAppNotification(token, notice) {
  const chatId = String(notice?.chatId || '').trim();
  if (!token || !chatId) return;

  const title = String(notice.title || 'New message').trim() || 'New message';
  const preview = String(notice.preview || 'New message').trim() || 'New message';
  const senderName = String(notice.senderName || '').trim();
  const description = senderName ? `${senderName}: ${preview}` : preview;

  try {
    await createMyNotification(token, {
      title,
      description,
      category: 'system',
      eventKey: `chat-msg-${chatId}`,
      targetPath: `/messages?chatId=${encodeURIComponent(chatId)}`,
      upsert: true,
    });
    invalidateNotificationInbox();
  } catch {
    /* non-blocking — socket banner still works */
  }
}
