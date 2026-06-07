import { useEffect, useState } from 'react';

import { useAuth } from '@/context/auth-context';
import { listNotifications } from '@/data/api';
import { ensureGdcSocketConnected, getGdcSocket } from '@/data/realtime/gdc-socket';
import { formatTabBadgeCount } from '@/utils/compute-total-chat-unread';
import { mapNotificationRow, normalizeNotificationsList } from '@/utils/notification-helpers';
import { invalidateNotificationInbox, subscribeNotificationInbox } from '@/utils/notification-invalidate';

/**
 * Realtime Alerts tab badge via Auth Socket `newNotification` + REST reconcile.
 * @param {{ enabled?: boolean }} [opts]
 * @returns {{ badge: string | undefined; unreadCount: number; refresh: () => void }}
 */
export function useGdcNotificationRealtime(opts = {}) {
  const { enabled = true } = opts;
  const { token, user } = useAuth();
  const userId = user?.id != null ? String(user.id) : '';
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = () => {
    invalidateNotificationInbox();
  };

  useEffect(() => {
    if (!enabled || !token) {
      setUnreadCount(0);
      return undefined;
    }

    let cancelled = false;

    const loadUnread = async () => {
      try {
        const res = await listNotifications(token, 100);
        const rows = normalizeNotificationsList(res).map(mapNotificationRow);
        const n = rows.filter((r) => !r.read).length;
        if (!cancelled) setUnreadCount(n);
      } catch {
        if (!cancelled) setUnreadCount(0);
      }
    };

    void loadUnread();
    return subscribeNotificationInbox(() => {
      void loadUnread();
    });
  }, [enabled, token]);

  useEffect(() => {
    if (!enabled || !token || !userId) return undefined;

    ensureGdcSocketConnected(token, userId);
    const sock = getGdcSocket();
    if (!sock) return undefined;

    const bump = () => invalidateNotificationInbox();

    const onChatSignal = () => {
      bump();
    };

    sock.on('newNotification', bump);
    sock.on('task.updated', bump);
    sock.on('dailyUpdates.updated', bump);
    sock.on('receiveMessage', onChatSignal);
    sock.on('chat.message', onChatSignal);

    return () => {
      sock.off('newNotification', bump);
      sock.off('task.updated', bump);
      sock.off('dailyUpdates.updated', bump);
      sock.off('receiveMessage', onChatSignal);
      sock.off('chat.message', onChatSignal);
    };
  }, [enabled, token, userId]);

  return {
    badge: formatTabBadgeCount(unreadCount),
    unreadCount,
    refresh,
  };
}
