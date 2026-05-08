import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';

const HOME_TAB_BAR_STYLE = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  height: 82,
  borderTopLeftRadius: 26,
  borderTopRightRadius: 26,
  backgroundColor: BrandColors.splashTop,
  borderTopWidth: 0,
  borderWidth: 1,
  borderColor: 'rgba(96,165,250,0.2)',
  paddingHorizontal: 14,
  paddingTop: 12,
  paddingBottom: 14,
  shadowColor: '#0b2c6a',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.35,
  shadowRadius: 10,
  elevation: 12,
};

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
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

const normalizeTime = (timeValue) => {
  if (!timeValue) return currentTime();
  if (typeof timeValue !== 'string') return String(timeValue);
  if (timeValue.toLowerCase().includes('am') || timeValue.toLowerCase().includes('pm')) return timeValue;
  const match = timeValue.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return timeValue;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
};

const getFileMeta = (fileName = '') => {
  const ext = fileName.split('.').pop()?.toUpperCase() || 'FILE';
  return { ext };
};

export default function MessagesScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const [threads, setThreads] = useState(INITIAL_THREADS);
  const [selectedId, setSelectedId] = useState(null);
  const [listSearch, setListSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const [attachOpen, setAttachOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupPrivacy, setGroupPrivacy] = useState('private');
  const [groupAdmin, setGroupAdmin] = useState('');
  const [groupMembers, setGroupMembers] = useState([]);

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

  const appendOutgoingMessage = (message) => {
    setThreads((prev) =>
      prev.map((thread) => (thread.id === selectedId ? { ...thread, messages: [...thread.messages, message] } : thread))
    );

    setTimeout(() => {
      setThreads((prev) =>
        prev.map((thread) =>
          thread.id === selectedId
            ? {
                ...thread,
                messages: thread.messages.map((msg) => (msg.id === message.id ? { ...msg, status: 'seen' } : msg)),
              }
            : thread
        )
      );
    }, 900);
  };

  const sendMessage = () => {
    const text = draft.trim();
    if (!text || !selectedId) return;
    const next = { id: String(Date.now()), me: true, text, time: currentTime(), status: 'sent' };
    appendOutgoingMessage(next);
    setDraft('');
  };

  const pickAndSendAttachment = async (mode) => {
    if (!selectedId) {
      setAttachOpen(false);
      return;
    }
    setAttachOpen(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: mode === 'image' ? 'image/*' : '*/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;
      const next = {
        id: String(Date.now()),
        me: true,
        type: mode,
        text: mode === 'image' ? 'Photo' : 'Document',
        fileName: asset.name,
        uri: asset.uri,
        time: currentTime(),
        status: 'sent',
      };
      appendOutgoingMessage(next);
    } catch (_error) {
      // keep silent for now to avoid interrupting chat flow
    }
  };

  const startNewChat = (contact) => {
    const newId = `thread-${contact.id}`;
    setThreads((prev) => [{ id: newId, name: contact.name, status: contact.status, unread: 0, messages: [] }, ...prev]);
    setNewChatOpen(false);
    setContactSearch('');
    setSelectedId(newId);
  };

  const toggleGroupMember = (memberId) => {
    setGroupMembers((prev) => (prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]));
  };

  const createGroup = () => {
    const name = groupName.trim();
    if (!name) return;
    const selectedContacts = CONTACTS.filter((c) => groupMembers.includes(c.id));
    const adminName = CONTACTS.find((c) => c.id === groupAdmin)?.name ?? 'Group Admin';
    const newId = `group-${Date.now()}`;
    setThreads((prev) => [
      {
        id: newId,
        name,
        status: `${selectedContacts.length} members, ${groupPrivacy}`,
        unread: 0,
        messages: [
          {
            id: `sys-${Date.now()}`,
            me: false,
            text: `${adminName} created this group.`,
            time: currentTime(),
          },
        ],
      },
      ...prev,
    ]);
    setGroupOpen(false);
    setNewChatOpen(false);
    setGroupName('');
    setGroupPrivacy('private');
    setGroupAdmin('');
    setGroupMembers([]);
  };

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: selected ? { display: 'none' } : HOME_TAB_BAR_STYLE,
    });
  }, [navigation, selected]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {selected ? (
        <KeyboardAvoidingView
          style={styles.safe}
          behavior={Platform.select({ ios: 'padding', android: 'padding' })}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}>
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
            style={styles.messagesList}
            contentContainerStyle={[styles.msgList, { paddingBottom: 16 }]}
            ListEmptyComponent={<Text style={styles.emptyText}>No messages yet. Start chatting.</Text>}
            renderItem={({ item }) => (
              <View style={[styles.msgRow, item.me ? styles.msgRowMe : styles.msgRowOther]}>
                <Pressable
                  style={[
                    styles.bubble,
                    item.me ? styles.bubbleMe : styles.bubbleOther,
                    (item.type === 'image' || item.type === 'file') && styles.bubbleAttachment,
                    item.type === 'image' && styles.imageBubble,
                  ]}
                  onPress={() => {
                    if (item.type === 'image' || item.type === 'file') setPreviewItem(item);
                  }}>
                  {item.type === 'image' && item.uri ? (
                    <View style={styles.imageFrame}>
                      <Image source={{ uri: item.uri }} style={styles.attachmentImage} contentFit="cover" />
                      <View style={styles.imageTimeBadge}>
                        <Text style={styles.imageTimeText}>{normalizeTime(item.time)}</Text>
                      </View>
                    </View>
                  ) : null}
                  {item.type === 'file' ? (
                    <View style={styles.fileCard}>
                      <View style={styles.filePreviewArea} />
                      <View style={styles.fileInfoRow}>
                        <View style={styles.fileExtBadge}>
                          <Text style={styles.fileExtText}>{getFileMeta(item.fileName).ext}</Text>
                        </View>
                        <View style={styles.fileTextWrap}>
                          <Text numberOfLines={1} style={[styles.fileName, item.me && styles.fileNameMe]}>
                            {item.fileName ?? 'Document'}
                          </Text>
                          <Text style={[styles.fileMetaText, item.me && styles.fileMetaTextMe]}>
                            1 file · {getFileMeta(item.fileName).ext}
                          </Text>
                        </View>
                        <View style={styles.fileTimeWrap}>
                          <Text style={[styles.fileTimeText, item.me && styles.fileTimeTextMe]}>{normalizeTime(item.time)}</Text>
                          {item.me ? (
                            <MaterialCommunityIcons
                              name={item.status === 'seen' ? 'check-all' : 'check'}
                              size={14}
                              color={item.status === 'seen' ? '#34B7F1' : '#64748b'}
                            />
                          ) : null}
                        </View>
                      </View>
                      <View style={styles.fileActionsRow}>
                        <Pressable
                          style={styles.fileActionBtn}
                          onPress={() => {
                            if (item.uri) Linking.openURL(item.uri);
                          }}>
                          <Text style={styles.fileActionText}>Open</Text>
                        </Pressable>
                        <Pressable style={styles.fileActionBtn}>
                          <Text style={styles.fileActionText}>Save as...</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                  {item.type !== 'file' && item.type !== 'image' ? (
                    <Text style={[styles.bubbleText, item.me && styles.bubbleTextMe]}>{item.text}</Text>
                  ) : null}
                  <View style={[styles.msgMetaRow, item.me && styles.msgMetaRowMe, (item.type === 'image' || item.type === 'file') && styles.msgMetaHidden]}>
                    <Text style={[styles.msgTime, item.me ? styles.msgTimeMe : styles.msgTimeOther]}>{normalizeTime(item.time)}</Text>
                    {item.me ? (
                      <MaterialCommunityIcons
                        name={item.status === 'seen' ? 'check-all' : 'check'}
                        size={14}
                        color={item.status === 'seen' ? '#34B7F1' : '#9ca3af'}
                      />
                    ) : null}
                  </View>
                </Pressable>
              </View>
            )}
          />

          <View
            style={[
              styles.composer,
              {
                paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 8) : 8,
                marginBottom: 0,
              },
            ]}>
            <View style={styles.inputWrap}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={sendMessage}
                placeholder="Write a message..."
                placeholderTextColor="#94a3b8"
                style={styles.input}
                returnKeyType="send"
              />
              <Pressable style={styles.inputIconBtn} onPress={() => setAttachOpen(true)}>
                <MaterialCommunityIcons name="paperclip" size={20} color="#64748b" />
              </Pressable>
            </View>
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
              <MaterialCommunityIcons name="message-plus-outline" size={19} color={BrandColors.primaryMid} />
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
                      <Text numberOfLines={1} style={styles.chatCardName}>
                        {item.name}
                      </Text>
                      <Text style={styles.chatCardTime}>{normalizeTime(last?.time)}</Text>
                    </View>
                    <Text style={styles.chatCardMsg} numberOfLines={1}>
                      {last?.type === 'image'
                        ? 'Photo'
                        : last?.type === 'file'
                          ? `Document: ${last.fileName ?? ''}`
                          : last?.text ?? 'Start a conversation'}
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
            <Pressable style={styles.groupCreateEntry} onPress={() => setGroupOpen(true)}>
              <MaterialCommunityIcons name="account-group-outline" size={18} color={BrandColors.primaryMid} />
              <Text style={styles.groupCreateEntryText}>Create New Group</Text>
            </Pressable>
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

      <Modal visible={groupOpen} transparent animationType="fade" onRequestClose={() => setGroupOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>Create New Group</Text>
              <Pressable onPress={() => setGroupOpen(false)}>
                <MaterialCommunityIcons name="close" size={20} color="#334155" />
              </Pressable>
            </View>

            <View style={styles.groupDpRow}>
              <View style={styles.groupDpCircle}>
                <MaterialCommunityIcons name="account-group" size={22} color={BrandColors.primaryMid} />
              </View>
              <Pressable style={styles.groupDpBtn}>
                <MaterialCommunityIcons name="camera-outline" size={16} color={BrandColors.primaryMid} />
                <Text style={styles.groupDpBtnText}>Add Group DP</Text>
              </Pressable>
            </View>

            <View style={styles.searchWrap}>
              <MaterialCommunityIcons name="account-multiple-outline" size={18} color="#94a3b8" />
              <TextInput
                value={groupName}
                onChangeText={setGroupName}
                placeholder="Group name"
                placeholderTextColor="#94a3b8"
                style={styles.searchInput}
              />
            </View>

            <Text style={styles.groupSectionLabel}>Privacy</Text>
            <View style={styles.privacyRow}>
              <Pressable style={[styles.privacyChip, groupPrivacy === 'private' && styles.privacyChipActive]} onPress={() => setGroupPrivacy('private')}>
                <Text style={[styles.privacyChipText, groupPrivacy === 'private' && styles.privacyChipTextActive]}>Private</Text>
              </Pressable>
              <Pressable style={[styles.privacyChip, groupPrivacy === 'public' && styles.privacyChipActive]} onPress={() => setGroupPrivacy('public')}>
                <Text style={[styles.privacyChipText, groupPrivacy === 'public' && styles.privacyChipTextActive]}>Public</Text>
              </Pressable>
            </View>

            <Text style={styles.groupSectionLabel}>Group Admin</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.adminRow}>
              {CONTACTS.map((contact) => (
                <Pressable
                  key={contact.id}
                  style={[styles.adminChip, groupAdmin === contact.id && styles.adminChipActive]}
                  onPress={() => setGroupAdmin(contact.id)}>
                  <Text style={[styles.adminChipText, groupAdmin === contact.id && styles.adminChipTextActive]}>{contact.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.groupSectionLabel}>Members</Text>
            <ScrollView style={styles.membersBox} showsVerticalScrollIndicator={false}>
              {CONTACTS.map((contact) => (
                <Pressable key={contact.id} style={styles.memberRow} onPress={() => toggleGroupMember(contact.id)}>
                  <Text style={styles.memberName}>{contact.name}</Text>
                  <View style={[styles.memberCheck, groupMembers.includes(contact.id) && styles.memberCheckActive]}>
                    {groupMembers.includes(contact.id) ? <MaterialCommunityIcons name="check" size={12} color="#fff" /> : null}
                  </View>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable style={styles.createGroupBtn} onPress={createGroup}>
              <Text style={styles.createGroupBtnText}>Create Group</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={attachOpen} transparent animationType="fade" onRequestClose={() => setAttachOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAttachOpen(false)}>
          <View style={styles.attachCard}>
            <Pressable style={styles.attachOption} onPress={() => pickAndSendAttachment('file')}>
              <MaterialCommunityIcons name="folder-upload-outline" size={18} color={BrandColors.primaryMid} />
              <Text style={styles.attachOptionText}>Upload File</Text>
            </Pressable>
            <Pressable style={styles.attachOption} onPress={() => pickAndSendAttachment('image')}>
              <MaterialCommunityIcons name="image-outline" size={18} color={BrandColors.primaryMid} />
              <Text style={styles.attachOptionText}>Upload Image</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={!!previewItem} transparent animationType="fade" onRequestClose={() => setPreviewItem(null)}>
        <View style={styles.previewOverlay}>
          <View style={styles.previewCard}>
            <View style={styles.previewHead}>
              <Text style={styles.previewTitle}>{previewItem?.type === 'image' ? 'Image Preview' : 'Document Preview'}</Text>
              <Pressable onPress={() => setPreviewItem(null)}>
                <MaterialCommunityIcons name="close" size={20} color="#e2e8f0" />
              </Pressable>
            </View>
            {previewItem?.type === 'image' && previewItem?.uri ? (
              <Image source={{ uri: previewItem.uri }} style={styles.previewImage} contentFit="contain" />
            ) : (
              <View style={styles.previewDocCard}>
                <MaterialCommunityIcons name="file-document-outline" size={28} color="#93c5fd" />
                <Text style={styles.previewDocName}>{previewItem?.fileName ?? 'Document'}</Text>
                <Pressable style={styles.previewOpenBtn} onPress={() => previewItem?.uri && Linking.openURL(previewItem.uri)}>
                  <Text style={styles.previewOpenBtnText}>Open File</Text>
                </Pressable>
              </View>
            )}
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
  chatTop: { flexDirection: 'row', alignItems: 'center' },
  chatCardName: { flex: 1, fontSize: 15, fontWeight: '700', color: BrandColors.text, marginRight: 8 },
  chatCardTime: { fontSize: 12, color: '#64748b', minWidth: 54, textAlign: 'right' },
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
  messagesList: { flex: 1 },
  msgList: { paddingHorizontal: 10, paddingTop: 12, paddingBottom: 8, gap: 8 },
  msgRow: { width: '100%', flexDirection: 'row' },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowOther: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '84%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  bubbleMe: { backgroundColor: BrandColors.primaryMid, borderBottomRightRadius: 7 },
  bubbleOther: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbe4fb', borderBottomLeftRadius: 7 },
  bubbleAttachment: { borderWidth: 0, paddingHorizontal: 0, paddingVertical: 0, backgroundColor: 'transparent' },
  imageBubble: { borderRadius: 10, overflow: 'hidden' },
  bubbleText: { fontSize: 14, color: '#334155', lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  attachmentImage: {
    width: 216,
    height: 198,
    borderRadius: 10,
  },
  imageFrame: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  imageTimeBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    backgroundColor: 'rgba(11,77,166,0.85)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  imageTimeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  fileCard: {
    width: 260,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  filePreviewArea: {
    height: 44,
    backgroundColor: '#eaf2ff',
  },
  fileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
  },
  fileExtBadge: {
    width: 30,
    height: 30,
    borderRadius: 7,
    backgroundColor: BrandColors.primaryMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileExtText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  fileTextWrap: { flex: 1, minWidth: 0 },
  fileName: { color: BrandColors.primaryMid, fontSize: 13, fontWeight: '700' },
  fileNameMe: { color: BrandColors.primaryMid },
  fileMetaText: { marginTop: 1, color: '#64748b', fontSize: 12 },
  fileMetaTextMe: { color: '#64748b' },
  fileTimeWrap: { marginLeft: 8, minWidth: 76, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  fileTimeText: { textAlign: 'right', color: '#475569', fontSize: 11, fontWeight: '700' },
  fileTimeTextMe: { color: '#475569' },
  fileActionsRow: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
  },
  fileActionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  fileActionText: { color: BrandColors.primaryMid, fontSize: 14, fontWeight: '700' },
  msgMetaRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 3 },
  msgMetaRowMe: { alignSelf: 'flex-end' },
  msgMetaHidden: { display: 'none' },
  msgTime: { fontSize: 10 },
  msgTimeMe: { color: '#dbeafe', textAlign: 'right' },
  msgTimeOther: { color: '#64748b' },
  composer: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 8, borderTopWidth: 1, borderTopColor: '#dbe4fb', backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    color: BrandColors.text,
    fontSize: 15,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 10,
  },
  inputWrap: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  attachCard: {
    marginTop: 'auto',
    marginBottom: 110,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 14,
    paddingVertical: 4,
  },
  attachOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  attachOptionText: {
    color: BrandColors.text,
    fontSize: 14,
    fontWeight: '600',
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
  previewOverlay: { flex: 1, backgroundColor: 'rgba(6,42,102,0.82)', justifyContent: 'center', padding: 16 },
  previewCard: {
    backgroundColor: BrandColors.splashTop,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.35)',
    borderRadius: 14,
    padding: 12,
  },
  previewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  previewTitle: { color: '#e2e8f0', fontSize: 15, fontWeight: '700' },
  previewImage: { width: '100%', height: 320, borderRadius: 10, backgroundColor: '#0b3a82' },
  previewDocCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.35)',
    backgroundColor: '#0b3a82',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 14,
    gap: 8,
  },
  previewDocName: { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },
  previewOpenBtn: {
    marginTop: 4,
    backgroundColor: BrandColors.primaryLight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  previewOpenBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
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
  groupCreateEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#f8fbff',
  },
  groupCreateEntryText: { color: BrandColors.primaryMid, fontSize: 14, fontWeight: '700' },
  groupDpRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  groupDpCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#eaf2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupDpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  groupDpBtnText: { color: BrandColors.primaryMid, fontSize: 13, fontWeight: '700' },
  groupSectionLabel: { fontSize: 12, color: '#64748b', fontWeight: '800', marginBottom: 6, marginTop: 4 },
  privacyRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  privacyChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dbe4fb',
    backgroundColor: '#fff',
  },
  privacyChipActive: { backgroundColor: '#eaf2ff', borderColor: '#bfdbfe' },
  privacyChipText: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  privacyChipTextActive: { color: BrandColors.primaryMid },
  adminRow: { gap: 8, paddingBottom: 6 },
  adminChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dbe4fb',
    backgroundColor: '#fff',
  },
  adminChipActive: { borderColor: '#bfdbfe', backgroundColor: '#eaf2ff' },
  adminChipText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  adminChipTextActive: { color: BrandColors.primaryMid },
  membersBox: {
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2ff',
  },
  memberName: { fontSize: 13, color: BrandColors.text, fontWeight: '600' },
  memberCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberCheckActive: { backgroundColor: BrandColors.primaryMid, borderColor: BrandColors.primaryMid },
  createGroupBtn: {
    borderRadius: 10,
    backgroundColor: BrandColors.primaryMid,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  createGroupBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
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
