import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SkeletonGroup, SkeletonListRow } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import {
  clearAllNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/data/api';
import { ApiError } from '@/data/api/http';
import { invalidateNotificationInbox } from '@/utils/notification-invalidate';
import {
  deleteNotificationSmart,
  mapNotificationRow,
  navigateFromNotificationTarget,
  normalizeNotificationsList,
} from '@/utils/notification-helpers';
import { cn } from '@/theme/cn';

const CATEGORY_ICONS = {
  attendance: 'calendar-clock',
  task: 'checkbox-marked-circle-outline',
  request: 'clipboard-text-outline',
  system: 'bell-outline',
  chat: 'message-text-outline',
};

function iconForCategory(cat, eventKey) {
  const key = String(eventKey || '');
  if (key.startsWith('chat-msg-')) return CATEGORY_ICONS.chat;
  return CATEGORY_ICONS[String(cat || '').toLowerCase()] || CATEGORY_ICONS.system;
}

function formatTime(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return String(iso);
  }
}

function alertError(title, err) {
  const detail =
    err instanceof ApiError && err.status ? `${err.message} (HTTP ${err.status})` : err?.message ?? 'Something went wrong';
  if (Platform.OS === 'web' && typeof globalThis.alert === 'function') {
    globalThis.alert(`${title}\n\n${detail}`);
  } else {
    Alert.alert(title, detail);
  }
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const { colors } = useTheme();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marking, setMarking] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const load = useCallback(async () => {
    if (!token) {
      setItems([]);
      setLoading(false);
      setLoadError(null);
      return;
    }
    try {
      const res = await listNotifications(token, 100);
      const raw = normalizeNotificationsList(res);
      setItems(raw.map(mapNotificationRow));
      setLoadError(null);
    } catch (e) {
      setItems([]);
      setLoadError(e?.message ?? 'Could not load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    invalidateNotificationInbox();
  }

  async function onMarkAllRead() {
    if (!token || marking) return;
    setMarking(true);
    try {
      await markAllNotificationsRead(token);
      await load();
      invalidateNotificationInbox();
    } catch (e) {
      alertError('Update failed', e);
    } finally {
      setMarking(false);
    }
  }

  function onClearAll() {
    if (!token || items.length === 0) return;
    const msg = 'Remove every notification from this list?';
    const run = () => {
      void (async () => {
        try {
          await clearAllNotifications(token);
          await load();
          invalidateNotificationInbox();
        } catch (e) {
          alertError('Clear failed', e);
        }
      })();
    };
    if (Platform.OS === 'web' && typeof globalThis.confirm === 'function') {
      if (globalThis.confirm(msg)) run();
      return;
    }
    Alert.alert('Clear all notifications', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear all', style: 'destructive', onPress: run },
    ]);
  }

  async function onOpenItem(item) {
    if (!token) return;

    const nid = Number(String(item.id ?? '').trim());
    if (!item.read && Number.isFinite(nid)) {
      setItems((prev) => prev.map((r) => (r.id === item.id ? { ...r, read: true } : r)));
      try {
        await markNotificationRead(token, nid);
        invalidateNotificationInbox();
      } catch {
        await load();
        return;
      }
    }

    if (item.targetPath) {
      const ok = navigateFromNotificationTarget(router, item.targetPath);
      if (!ok) {
        if (Platform.OS === 'web' && typeof globalThis.alert === 'function') {
          globalThis.alert(`Unsupported target: ${item.targetPath}`);
        } else {
          Alert.alert('Open link', `Unsupported target: ${item.targetPath}`);
        }
      }
    }
  }

  function onDeleteItem(item) {
    if (!token) return;
    const msg = 'Remove this notification?';
    const runDelete = () => {
      void (async () => {
        try {
          await deleteNotificationSmart(token, item);
          await load();
          invalidateNotificationInbox();
        } catch (e) {
          alertError('Delete failed', e);
          await load();
          invalidateNotificationInbox();
        }
      })();
    };
    if (Platform.OS === 'web' && typeof globalThis.confirm === 'function') {
      if (globalThis.confirm(msg)) runDelete();
      return;
    }
    Alert.alert('Delete notification', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: runDelete },
    ]);
  }

  const unreadCount = items.filter((r) => !r.read).length;

  return (
    <SafeAreaView className="flex-1 bg-page" edges={['top', 'bottom']}>
      <View className="h-14 flex-row items-center justify-between border-b border-border-strong px-2.5">
        {router.canGoBack() ? (
          <Pressable className="h-[34px] w-[34px] items-center justify-center rounded-[10px]" onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
          </Pressable>
        ) : (
          <View className="h-[34px] w-[34px]" />
        )}
        <Text className="text-[22px] font-extrabold text-text">Notifications</Text>
        <View className="h-[34px] w-[34px]" />
      </View>

      <View className="flex-row items-center justify-between border-b border-border px-4 py-2.5">
        <Text className="mr-2 flex-1 text-[13px] text-text-muted">
          {items.length} item(s)
          {unreadCount > 0 ? ` · ${unreadCount} unread` : ''}
        </Text>
        <View className="flex-row items-center gap-2.5">
          <Pressable onPress={onClearAll} disabled={!token || items.length === 0}>
            <Text className={cn('text-sm font-bold text-primary-mid', (!token || items.length === 0) && 'opacity-40')}>
              Clear all
            </Text>
          </Pressable>
          <Text className="text-sm font-normal text-text-secondary">|</Text>
          <Pressable onPress={onMarkAllRead} disabled={!token || marking || items.length === 0}>
            <Text
              className={cn(
                'text-sm font-bold text-primary-mid',
                (!token || items.length === 0) && 'opacity-40',
              )}>
              {marking ? '…' : 'Mark all read'}
            </Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <SkeletonGroup speedMs={1650} delayMs={160}>
          <View className="pb-[100px]">
            {Array.from({ length: 8 }, (_, i) => (
              <SkeletonListRow key={`n-skel-${i}`} />
            ))}
          </View>
        </SkeletonGroup>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => (item.id ? `nid-${item.id}` : `nidx-${index}-${item.createdAt || ''}`)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primaryMid} />}
          contentContainerClassName="gap-2.5 px-3.5 py-2.5 pb-[100px]"
          ListEmptyComponent={
            <Text className="mt-10 px-6 text-center text-[15px] text-text-muted">
              {loadError
                ? loadError
                : 'No alerts yet. Task assignments, leave updates, and system messages appear here when your team sends them. Chat unread counts are on the Chat tab.'}
            </Text>
          }
          renderItem={({ item }) => (
            <View
              className={cn(
                'flex-row items-stretch overflow-hidden rounded-[14px] border border-border-strong bg-card',
                !item.read && 'border bg-surface-muted',
              )}
              style={!item.read ? { borderColor: colors.chipActiveBorder } : undefined}>
              {!item.read ? <View className="w-1 rounded-l-[14px] bg-primary-mid" /> : null}
              <Pressable
                className="min-w-0 flex-1 flex-row items-start gap-3 py-3.5 pl-3 pr-2"
                onPress={() => void onOpenItem(item)}
                android_ripple={{ color: colors.borderStrong }}>
                <View className="h-11 w-11 shrink-0 items-center justify-center rounded-full bg-info-bg">
                  <MaterialCommunityIcons
                    name={iconForCategory(item.category, item.eventKey)}
                    size={20}
                    color={colors.primaryMid}
                  />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[15px] font-extrabold leading-5 text-text">{item.title}</Text>
                  {item.description ? (
                    <Text className="mt-1 text-[13px] leading-[19px] text-text-muted">{item.description}</Text>
                  ) : null}
                  <View className="mt-2 flex-row items-center gap-[5px]">
                    <MaterialCommunityIcons name="clock-outline" size={13} color={colors.textSecondary} />
                    <Text className="text-xs font-semibold text-text-secondary">{formatTime(item.createdAt)}</Text>
                  </View>
                </View>
              </Pressable>
              <View className="flex-row items-start gap-2 pr-3 pt-3.5">
                {!item.read ? <View className="mt-3.5 h-2 w-2 shrink-0 rounded-full bg-primary-mid" /> : null}
                <Pressable
                  className="h-9 w-9 items-center justify-center rounded-[10px] border border-border-strong bg-card"
                  hitSlop={12}
                  onPress={(e) => {
                    e?.stopPropagation?.();
                    onDeleteItem(item);
                  }}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
