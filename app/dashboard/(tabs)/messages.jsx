import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import React, { useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';

const INITIAL_THREADS = [
  {
    id: 'group-design',
    name: 'Fullsnack Designers',
    status: '7 online, 12 members',
    unread: 2,
    messages: [
      { id: '1', me: false, text: 'Hello guys, we have discussed about post-corona vacation plan.', time: '16:04' },
      { id: '2', me: true, text: "That's a very nice place! Can't wait.", time: '16:04' },
    ],
  },
  {
    id: 'darlene',
    name: 'Darlene Steward',
    status: 'online',
    unread: 5,
    messages: [{ id: '1', me: false, text: 'Please take a look at the images.', time: '18:31' }],
  },
  {
    id: 'lee',
    name: 'Lee Williamson',
    status: 'last seen recently',
    unread: 0,
    messages: [{ id: '1', me: false, text: "Yes, that's gonna work hopefully.", time: '06:12' }],
  },
];

const CONTACTS = [
  { id: 'ali', name: 'Ali Raza', status: 'online' },
  { id: 'sana', name: 'Sana Noor', status: 'last seen 2m ago' },
  { id: 'rabia', name: 'Rabia', status: 'typing...' },
  { id: 'nida', name: 'Nida', status: 'online' },
];

const currentTime = () =>
  new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

export default function MessagesScreen() {
  const { user } = useAuth();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const [threads, setThreads] = useState(INITIAL_THREADS);
  const [selectedId, setSelectedId] = useState(null);
  const [listSearch, setListSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  const roleTitle = useMemo(() => {
    if (user?.role === 'Admin') return 'Admin';
    if (user?.role === 'HR') return 'HR';
    if (user?.role === 'Team Leader') return 'Team Leader';
    return 'Employee';
  }, [user?.role]);

  const selected = useMemo(() => threads.find((thread) => thread.id === selectedId) ?? null, [threads, selectedId]);

  const filteredThreads = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((thread) => thread.name.toLowerCase().includes(q));
  }, [threads, listSearch]);

  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    const existingNames = new Set(threads.map((thread) => thread.name.toLowerCase()));
    return CONTACTS.filter((contact) => {
      if (existingNames.has(contact.name.toLowerCase())) return false;
      if (!q) return true;
      return contact.name.toLowerCase().includes(q);
    });
  }, [threads, contactSearch]);

  const openThread = (threadId) => {
    setSelectedId(threadId);
    setThreads((prev) => prev.map((thread) => (thread.id === threadId ? { ...thread, unread: 0 } : thread)));
  };

  const sendMessage = () => {
    const text = draft.trim();
    if (!text || !selectedId) return;
    const next = { id: String(Date.now()), me: true, text, time: currentTime() };
    setThreads((prev) =>
      prev.map((thread) => (thread.id === selectedId ? { ...thread, messages: [...thread.messages, next] } : thread))
    );
    setDraft('');
  };

  const startNewChat = (contact) => {
    const newId = `thread-${contact.id}`;
    setThreads((prev) => [{ id: newId, name: contact.name, status: contact.status, unread: 0, messages: [] }, ...prev]);
    setNewChatOpen(false);
    setContactSearch('');
    setSelectedId(newId);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {selected ? (
        <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.chatHeader}>
            <Pressable style={styles.backBtn} onPress={() => setSelectedId(null)}>
              <MaterialCommunityIcons name="arrow-left" size={22} color={BrandColors.text} />
            </Pressable>
            <View style={styles.avatarSm}>
              <Text style={styles.avatarText}>{selected.name.slice(0, 1)}</Text>
            </View>
            <View style={styles.headerMeta}>
              <Text style={styles.chatName}>{selected.name}</Text>
              <Text style={styles.chatStatus}>{selected.status}</Text>
            </View>
          </View>

          <FlatList
            data={selected.messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.msgList}
            ListEmptyComponent={<Text style={styles.emptyText}>No messages yet. Start chatting.</Text>}
            renderItem={({ item }) => (
              <View style={[styles.msgRow, item.me ? styles.msgRowMe : styles.msgRowOther]}>
                <View style={[styles.bubble, item.me ? styles.bubbleMe : styles.bubbleOther]}>
                  <Text style={[styles.bubbleText, item.me && styles.bubbleTextMe]}>{item.text}</Text>
                  <Text style={[styles.msgTime, item.me ? styles.msgTimeMe : styles.msgTimeOther]}>{item.time}</Text>
                </View>
              </View>
            )}
          />

          <View style={[styles.composer, { paddingBottom: tabBarHeight + Math.max(insets.bottom, 8) }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={sendMessage}
              placeholder="Write a message..."
              placeholderTextColor="#94a3b8"
              style={styles.input}
              returnKeyType="send"
            />
            <Pressable style={styles.sendBtn} onPress={sendMessage}>
              <MaterialCommunityIcons name="send" size={18} color="#fff" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      ) : (
        <View style={[styles.listScreen, { paddingBottom: tabBarHeight + 14 }]}>
          <View style={styles.listHeader}>
            <View>
              <Text style={styles.listTitle}>Chats</Text>
              <Text style={styles.listSubTitle}>{roleTitle} conversation inbox</Text>
            </View>
            <Pressable style={styles.newBtn} onPress={() => setNewChatOpen(true)}>
              <MaterialCommunityIcons name="message-plus-outline" size={18} color={BrandColors.primaryMid} />
            </Pressable>
          </View>

          <View style={styles.searchWrap}>
            <MaterialCommunityIcons name="magnify" size={18} color="#94a3b8" />
            <TextInput
              value={listSearch}
              onChangeText={setListSearch}
              placeholder="Search messages"
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
            />
          </View>

          <FlatList
            data={filteredThreads}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const last = item.messages[item.messages.length - 1];
              return (
                <Pressable style={styles.chatCard} onPress={() => openThread(item.id)}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.name.slice(0, 1)}</Text>
                  </View>
                  <View style={styles.chatBody}>
                    <View style={styles.chatTop}>
                      <Text style={styles.chatCardName}>{item.name}</Text>
                      <Text style={styles.chatCardTime}>{last?.time ?? '--:--'}</Text>
                    </View>
                    <Text style={styles.chatCardMsg} numberOfLines={1}>
                      {last?.text ?? 'Start a conversation'}
                    </Text>
                  </View>
                  {!!item.unread && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{item.unread}</Text>
                    </View>
                  )}
                </Pressable>
              );
            }}
          />
        </View>
      )}

      <Modal visible={newChatOpen} transparent animationType="fade" onRequestClose={() => setNewChatOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Start new chat</Text>
              <Pressable onPress={() => setNewChatOpen(false)}>
                <MaterialCommunityIcons name="close" size={20} color="#334155" />
              </Pressable>
            </View>
            <View style={styles.searchWrap}>
              <MaterialCommunityIcons name="magnify" size={18} color="#94a3b8" />
              <TextInput
                value={contactSearch}
                onChangeText={setContactSearch}
                placeholder="Search contact"
                placeholderTextColor="#94a3b8"
                style={styles.searchInput}
              />
            </View>
            <FlatList
              data={filteredContacts}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={styles.emptyText}>No available contacts.</Text>}
              renderItem={({ item }) => (
                <Pressable style={styles.contactRow} onPress={() => startNewChat(item)}>
                  <View style={styles.avatarSm}>
                    <Text style={styles.avatarText}>{item.name.slice(0, 1)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.contactName}>{item.name}</Text>
                    <Text style={styles.contactStatus}>{item.status}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={18} color="#64748b" />
                </Pressable>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.pageBg },
  listScreen: { flex: 1, paddingHorizontal: 12, paddingTop: 8 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  listTitle: { fontSize: 26, fontWeight: '800', color: BrandColors.text },
  listSubTitle: { marginTop: 2, fontSize: 12, color: BrandColors.textMuted },
  newBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe4fb',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 12,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, paddingHorizontal: 8, paddingVertical: 10, color: BrandColors.text, fontSize: 14 },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 10,
    marginBottom: 9,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  avatarSm: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#1d4ed8', fontSize: 16, fontWeight: '800' },
  chatBody: { flex: 1 },
  chatTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chatCardName: { fontSize: 15, fontWeight: '700', color: BrandColors.text },
  chatCardTime: { fontSize: 12, color: '#64748b' },
  chatCardMsg: { marginTop: 2, color: BrandColors.textMuted, fontSize: 13 },
  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.primaryMid,
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#dbe4fb',
  },
  backBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  headerMeta: { flex: 1 },
  chatName: { fontSize: 16, fontWeight: '700', color: BrandColors.text },
  chatStatus: { marginTop: 1, fontSize: 12, color: '#16a34a' },
  msgList: { paddingHorizontal: 10, paddingTop: 12, paddingBottom: 8, gap: 8 },
  msgRow: { width: '100%', flexDirection: 'row' },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '84%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  bubbleMe: { backgroundColor: BrandColors.primaryMid, borderBottomRightRadius: 7 },
  bubbleOther: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbe4fb', borderBottomLeftRadius: 7 },
  bubbleText: { fontSize: 14, color: '#334155', lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  msgTime: { marginTop: 4, fontSize: 10 },
  msgTimeMe: { color: '#dbeafe', textAlign: 'right' },
  msgTimeOther: { color: '#64748b' },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#dbe4fb',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    color: BrandColors.text,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.primaryMid,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: 16 },
  modalCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 14,
    padding: 12,
    maxHeight: '72%',
  },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: BrandColors.text },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2ff',
  },
  contactName: { fontSize: 14, fontWeight: '700', color: BrandColors.text },
  contactStatus: { marginTop: 2, fontSize: 12, color: '#64748b' },
  emptyText: { color: '#64748b', textAlign: 'center', paddingVertical: 12 },
});
