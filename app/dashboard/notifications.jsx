import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand';
import { SkeletonGroup, SkeletonListRow } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth-context';
import {
  clearAllNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/services/api';
import { ApiError } from '@/services/api/http';
import { invalidateNotificationInbox } from '@/utils/notification-invalidate';
import {
  deleteNotificationSmart,
  mapNotificationRow,
  navigateFromNotificationTarget,
  normalizeNotificationsList,
} from '@/utils/notification-helpers';

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
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        {router.canGoBack() ? (
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={BrandColors.text} />
          </Pressable>
        ) : (
          <View style={styles.backBtn} />
        )}
        <Text style={styles.title}>Notifications</Text>
        <View style={styles.backBtn} />
      </View>

      <View style={styles.toolbar}>
        <Text style={styles.toolbarHint}>
          {items.length} item(s)
          {unreadCount > 0 ? ` · ${unreadCount} unread` : ''}
        </Text>
        <View style={styles.toolbarActions}>
          <Pressable onPress={onClearAll} disabled={!token || items.length === 0}>
            <Text style={[styles.toolbarLink, (!token || items.length === 0) && styles.toolbarLinkDisabled]}>Clear all</Text>
          </Pressable>
          <Pressable onPress={onMarkAllRead} disabled={!token || marking || items.length === 0}>
            <Text style={[styles.toolbarLink, (!token || items.length === 0) && styles.toolbarLinkDisabled]}>
              {marking ? '…' : 'Mark all read'}
            </Text>
          </Pressable>
        </View>
      </View>

      {loading ? (
        <SkeletonGroup speedMs={1650} delayMs={160}>
          <View style={styles.skeletonWrap}>
            {Array.from({ length: 8 }, (_, i) => (
              <SkeletonListRow key={`n-skel-${i}`} />
            ))}
          </View>
        </SkeletonGroup>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => (item.id ? `nid-${item.id}` : `nidx-${index}-${item.createdAt || ''}`)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BrandColors.primaryMid} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {loadError
                ? loadError
                : 'No alerts yet. Task assignments, leave updates, and system messages appear here when your team sends them. Chat unread counts are on the Chat tab.'}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.row, item.read && styles.rowRead]}>
              <Pressable
                style={styles.rowMain}
                onPress={() => void onOpenItem(item)}
                android_ripple={{ color: '#e2e8f0' }}>
                <View style={styles.iconWrap}>
                  <MaterialCommunityIcons
                    name={iconForCategory(item.category, item.eventKey)}
                    size={18}
                    color={BrandColors.primaryMid}
                  />
                </View>
                <View style={styles.body}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  {item.description ? <Text style={styles.rowText}>{item.description}</Text> : null}
                  <Text style={styles.meta}>{formatTime(item.createdAt)}</Text>
                </View>
                {!item.read ? <View style={styles.unreadDot} /> : <View style={styles.unreadDotSpacer} />}
              </Pressable>
              <Pressable
                style={styles.deleteBtn}
                hitSlop={12}
                onPress={(e) => {
                  e?.stopPropagation?.();
                  onDeleteItem(item);
                }}>
                <MaterialCommunityIcons name="trash-can-outline" size={18} color="#94a3b8" />
              </Pressable>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', color: BrandColors.text },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  toolbarHint: { fontSize: 13, color: BrandColors.textMuted, flex: 1, marginRight: 8 },
  toolbarActions: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  toolbarLink: { fontSize: 14, color: BrandColors.primaryMid, fontWeight: '700' },
  toolbarLinkDisabled: { opacity: 0.4 },
  list: { paddingVertical: 8, paddingHorizontal: 12, paddingBottom: 100 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  skeletonWrap: { paddingBottom: 100 },
  empty: { textAlign: 'center', marginTop: 40, color: BrandColors.textMuted, fontSize: 15, paddingHorizontal: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'flex-start',
    minWidth: 0,
  },
  rowRead: { opacity: 0.72 },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#eaf0ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  body: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: BrandColors.text },
  rowText: { marginTop: 4, fontSize: 13, lineHeight: 18, color: BrandColors.textMuted },
  meta: { marginTop: 6, fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  deleteBtn: { padding: 12, justifyContent: 'flex-start' },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BrandColors.primaryMid,
    marginTop: 8,
    flexShrink: 0,
  },
  unreadDotSpacer: { width: 8, marginTop: 8, flexShrink: 0 },
});
