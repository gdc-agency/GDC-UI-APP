import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { SkeletonGroup, SkeletonListRow } from '@/components/ui/skeleton';
import { BrandColors } from '@/constants/brand';
import { createGroupIdempotencyKey } from '@/utils/group-create-guard';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SHEET_SLIDE = 560;
const MEMBER_ROW_H = 64;
const PAGE_SIZE = 36;
const FOOTER_H = 64;

function roleBadgeLabel(role) {
  const r = String(role || '').toLowerCase().replace(/\s+/g, '_');
  if (r === 'admin') return 'AD';
  if (r === 'hr') return 'HR';
  if (r === 'team_leader' || r === 'teamleader') return 'TL';
  return '';
}

const MemberRow = memo(
  function MemberRow({ item, selected, onToggle }) {
    const line = item.displayName || item.name;
    return (
      <Pressable style={styles.memberRow} onPress={() => onToggle(String(item.id))}>
        <View style={styles.memberIdentity}>
          <View style={styles.avatarWrap}>
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={styles.avatarImg} contentFit="cover" />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarLetter}>{String(line).slice(0, 1)}</Text>
              </View>
            )}
            <View style={[styles.presenceDot, item.online && styles.presenceDotOn]} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.nameRow}>
              <Text style={styles.memberName} numberOfLines={1}>
                {line}
              </Text>
              {item.roleLabel ? <Text style={styles.roleBadge}>{roleBadgeLabel(item.roleLabel)}</Text> : null}
            </View>
            <Text style={styles.memberSub}>{item.online ? 'Online' : 'Offline'}</Text>
          </View>
        </View>
        <View style={[styles.check, selected && styles.checkOn]}>
          {selected ? <MaterialCommunityIcons name="check" size={14} color="#fff" /> : null}
        </View>
      </Pressable>
    );
  },
  (a, b) => a.selected === b.selected && String(a.item.id) === String(b.item.id),
);

const Chip = memo(function Chip({ label, onRemove }) {
  return (
    <Pressable style={styles.chip} onPress={onRemove}>
      <Text style={styles.chipText} numberOfLines={1}>
        {label}
      </Text>
      <MaterialCommunityIcons name="close-circle" size={16} color="#64748b" />
    </Pressable>
  );
});

const StepDots = memo(function StepDots({ step }) {
  return (
    <View style={styles.stepDots}>
      {[1, 2, 3].map((n) => (
        <View key={n} style={[styles.stepDot, step >= n && styles.stepDotActive]} />
      ))}
    </View>
  );
});

const SettingToggle = memo(function SettingToggle({ label, sub, value, onValueChange, disabled }) {
  return (
    <View style={styles.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleSub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#e2e8f0', true: BrandColors.primaryMid }}
      />
    </View>
  );
});

/**
 * WhatsApp-style 3-step create group with keyboard-safe sheet layout.
 */
export function CreateGroupFlow({ visible, onClose, contacts, contactsLoading = false, onCreate }) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const submittingRef = useRef(false);
  const idempotencyRef = useRef('');
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(/** @type {Set<string>} */ (new Set()));
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [avatarUri, setAvatarUri] = useState(/** @type {string | null} */ (null));
  const [privacy, setPrivacy] = useState('private');
  const [allowMembersToAdd, setAllowMembersToAdd] = useState(true);
  const [allowMembersToEditInfo, setAllowMembersToEditInfo] = useState(false);
  const [muteNotifications, setMuteNotifications] = useState(false);
  const [disappearingMessages, setDisappearingMessages] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [listLimit, setListLimit] = useState(PAGE_SIZE);
  const [focusedField, setFocusedField] = useState(/** @type {string | null} */ (null));
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const sheetHeight = useMemo(
    () => Math.min(Math.round(windowHeight * 0.92), windowHeight - insets.top - 16),
    [windowHeight, insets.top],
  );

  const resetForm = useCallback(() => {
    setStep(1);
    setSearch('');
    setSelected(new Set());
    setName('');
    setDescription('');
    setAvatarUri(null);
    setPrivacy('private');
    setAllowMembersToAdd(true);
    setAllowMembersToEditInfo(false);
    setMuteNotifications(false);
    setDisappearingMessages(false);
    setSubmitting(false);
    setListLimit(PAGE_SIZE);
    setFocusedField(null);
    setKeyboardHeight(0);
    submittingRef.current = false;
    idempotencyRef.current = '';
  }, []);

  useEffect(() => {
    if (!visible) {
      resetForm();
      return undefined;
    }
    idempotencyRef.current = createGroupIdempotencyKey();
    progress.setValue(0);
    Animated.spring(progress, { toValue: 1, useNativeDriver: true, stiffness: 340, damping: 32 }).start();
    return undefined;
  }, [progress, visible, resetForm]);

  useEffect(() => {
    if (!visible) return undefined;
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvt, (e) => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const onHide = Keyboard.addListener(hideEvt, () => {
      setKeyboardHeight(0);
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, [visible]);

  const closeAnimated = useCallback(() => {
    if (submittingRef.current || submitting) return;
    Keyboard.dismiss();
    Animated.timing(progress, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
      if (finished) onClose();
    });
  }, [onClose, progress, submitting]);

  const selectedSet = selected;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = Array.isArray(contacts) ? contacts : [];
    if (!q) return list;
    return list.filter((c) => {
      const n = String(c.displayName || c.name || '').toLowerCase();
      const r = String(c.roleLabel || '').toLowerCase();
      return n.includes(q) || r.includes(q);
    });
  }, [contacts, search]);

  const visibleMembers = useMemo(() => filtered.slice(0, listLimit), [filtered, listLimit]);

  const selectedContacts = useMemo(() => {
    const list = Array.isArray(contacts) ? contacts : [];
    return list.filter((c) => selectedSet.has(String(c.id)));
  }, [contacts, selectedSet]);

  const toggle = useCallback((id) => {
    const sid = String(id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  }, []);

  const pickAvatar = useCallback(async () => {
    if (submittingRef.current) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (!res.canceled && res.assets?.[0]?.uri) setAvatarUri(res.assets[0].uri);
  }, []);

  const submit = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed || selectedSet.size === 0 || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    Keyboard.dismiss();
    try {
      await onCreate({
        name: trimmed,
        description: description.trim(),
        memberIds: [...selectedSet],
        avatarUri,
        privacy,
        allowMembersToAdd,
        allowMembersToEditInfo,
        muteNotifications,
        disappearingMessages,
        idempotencyKey: idempotencyRef.current || createGroupIdempotencyKey(),
      });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [
    allowMembersToAdd,
    allowMembersToEditInfo,
    avatarUri,
    description,
    disappearingMessages,
    muteNotifications,
    name,
    onCreate,
    privacy,
    selectedSet,
  ]);

  const renderMember = useCallback(
    ({ item }) => (
      <MemberRow item={item} selected={selectedSet.has(String(item.id))} onToggle={toggle} />
    ),
    [selectedSet, toggle],
  );

  const keyExtractor = useCallback((item) => String(item.id), []);

  const getItemLayout = useCallback(
    (_data, index) => ({ length: MEMBER_ROW_H, offset: MEMBER_ROW_H * index, index }),
    [],
  );

  const loadMore = useCallback(() => {
    if (listLimit < filtered.length) setListLimit((n) => Math.min(n + PAGE_SIZE, filtered.length));
  }, [filtered.length, listLimit]);

  const sheetY = progress.interpolate({ inputRange: [0, 1], outputRange: [SHEET_SLIDE, 0] });
  const backdropOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  const stepTitle =
    step === 1 ? 'Add members' : step === 2 ? 'Group details' : 'Group settings';

  const keyboardOpen = keyboardHeight > 0;
  const androidFooterLift =
    Platform.OS === 'android' && keyboardOpen ? Math.max(0, keyboardHeight - insets.bottom) : 0;

  const inputStyle = (fieldKey) => [
    styles.fieldInput,
    fieldKey === 'description' && styles.fieldMulti,
    focusedField === fieldKey && styles.fieldInputFocused,
  ];

  const renderFooter = () => {
    if (step === 1) {
      return (
        <Pressable
          style={[styles.primaryBtn, selectedSet.size === 0 && styles.primaryBtnDisabled]}
          disabled={selectedSet.size === 0 || submitting}
          onPress={() => {
            Keyboard.dismiss();
            setStep(2);
          }}>
          <Text style={styles.primaryBtnText}>Next · {selectedSet.size} selected</Text>
        </Pressable>
      );
    }
    if (step === 2) {
      return (
        <Pressable
          style={[styles.primaryBtn, !name.trim() && styles.primaryBtnDisabled]}
          disabled={!name.trim() || submitting}
          onPress={() => {
            Keyboard.dismiss();
            setStep(3);
          }}>
          <Text style={styles.primaryBtnText}>Next: Settings</Text>
        </Pressable>
      );
    }
    return (
      <Pressable
        style={[styles.primaryBtn, (!name.trim() || submitting) && styles.primaryBtnDisabled]}
        disabled={!name.trim() || submitting}
        onPress={() => void submit()}>
        {submitting ? (
          <View style={styles.btnLoading}>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.primaryBtnText}>Creating…</Text>
          </View>
        ) : (
          <Text style={styles.primaryBtnText}>Create group</Text>
        )}
      </Pressable>
    );
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={closeAnimated}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeAnimated} disabled={submitting}>
          <Animated.View pointerEvents="none" style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </Pressable>

        <Animated.View
          style={[
            styles.sheet,
            { height: sheetHeight, paddingBottom: 0, transform: [{ translateY: sheetY }] },
          ]}>
          <View style={styles.grabber} />
          <View style={styles.headRow}>
            {step > 1 ? (
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  setStep((s) => Math.max(1, s - 1));
                }}
                hitSlop={10}
                disabled={submitting}>
                <MaterialCommunityIcons name="arrow-left" size={22} color={BrandColors.text} />
              </Pressable>
            ) : (
              <View style={{ width: 22 }} />
            )}
            <View style={styles.headCenter}>
              <Text style={styles.title}>{stepTitle}</Text>
              <StepDots step={step} />
            </View>
            <Pressable onPress={closeAnimated} hitSlop={10} disabled={submitting}>
              <MaterialCommunityIcons name="close" size={22} color="#64748b" />
            </Pressable>
          </View>

          <KeyboardAvoidingView
            style={styles.kav}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            enabled={Platform.OS === 'ios' || step !== 2}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom + 8 : 0}>
            <View style={styles.body}>
              {step === 1 ? (
                <>
                  <View style={styles.searchWrap}>
                    <MaterialCommunityIcons name="magnify" size={18} color="#94a3b8" />
                    <TextInput
                      value={search}
                      onChangeText={(t) => {
                        setSearch(t);
                        setListLimit(PAGE_SIZE);
                      }}
                      placeholder="Search people"
                      placeholderTextColor="#94a3b8"
                      style={styles.searchInput}
                      returnKeyType="search"
                    />
                  </View>
                  {selectedSet.size > 0 ? (
                    <FlatList
                      horizontal
                      data={selectedContacts}
                      keyExtractor={keyExtractor}
                      showsHorizontalScrollIndicator={false}
                      style={styles.chipsScroll}
                      keyboardShouldPersistTaps="handled"
                      renderItem={({ item }) => (
                        <Chip
                          label={String(item.displayName || item.name)}
                          onRemove={() => toggle(String(item.id))}
                        />
                      )}
                    />
                  ) : null}
                  {contactsLoading ? (
                    <SkeletonGroup>
                      <SkeletonListRow />
                      <SkeletonListRow />
                      <SkeletonListRow />
                    </SkeletonGroup>
                  ) : (
                    <FlatList
                      data={visibleMembers}
                      keyExtractor={keyExtractor}
                      style={styles.listFlex}
                      contentContainerStyle={{ paddingBottom: 8 }}
                      initialNumToRender={12}
                      maxToRenderPerBatch={10}
                      windowSize={7}
                      removeClippedSubviews={Platform.OS === 'android'}
                      getItemLayout={getItemLayout}
                      keyboardShouldPersistTaps="handled"
                      keyboardDismissMode="on-drag"
                      onEndReached={loadMore}
                      onEndReachedThreshold={0.35}
                      renderItem={renderMember}
                      ListFooterComponent={
                        listLimit < filtered.length ? (
                          <ActivityIndicator style={{ marginVertical: 12 }} color={BrandColors.primaryMid} />
                        ) : null
                      }
                    />
                  )}
                </>
              ) : null}

              {step === 2 ? (
                <View style={styles.detailsBody}>
                  <Pressable style={styles.avatarPick} onPress={pickAvatar} disabled={submitting}>
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} style={styles.avatarPickImg} contentFit="cover" />
                    ) : (
                      <MaterialCommunityIcons name="camera-plus-outline" size={32} color={BrandColors.primaryMid} />
                    )}
                  </Pressable>
                  <View>
                    <Text style={styles.fieldLabel}>Group name</Text>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="Enter group name"
                      placeholderTextColor="#94a3b8"
                      style={inputStyle('name')}
                      editable={!submitting}
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField((f) => (f === 'name' ? null : f))}
                      returnKeyType="next"
                    />
                  </View>
                  <View>
                    <Text style={styles.fieldLabel}>Description (optional)</Text>
                    <TextInput
                      value={description}
                      onChangeText={(t) => setDescription(t.slice(0, 200))}
                      placeholder="What's this group about?"
                      placeholderTextColor="#94a3b8"
                      style={inputStyle('description')}
                      multiline
                      scrollEnabled={false}
                      editable={!submitting}
                      onFocus={() => setFocusedField('description')}
                      onBlur={() => setFocusedField((f) => (f === 'description' ? null : f))}
                      blurOnSubmit
                    />
                  </View>
                </View>
              ) : null}

              {step === 3 ? (
                <ScrollView
                  style={styles.scrollFlex}
                  contentContainerStyle={styles.scrollContent}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  showsVerticalScrollIndicator={false}>
                  <Text style={styles.settingsHint}>
                    {selectedSet.size} members · {name.trim()}
                  </Text>
                  <Text style={styles.fieldLabel}>Privacy</Text>
                  <View style={styles.privacyStack}>
                    {[
                      ['public', 'Public', 'Anyone in your org can find this group'],
                      ['private', 'Private', 'Only invited members can join'],
                      ['restricted', 'Restricted', 'Only admins can post and invite'],
                    ].map(([key, title, sub]) => (
                      <Pressable
                        key={key}
                        style={[styles.privacyRow, privacy === key && styles.privacyRowActive]}
                        onPress={() => setPrivacy(key)}
                        disabled={submitting}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.privacyTitle}>{title}</Text>
                          <Text style={styles.privacySub}>{sub}</Text>
                        </View>
                        <View style={[styles.radio, privacy === key && styles.radioOn]}>
                          {privacy === key ? <View style={styles.radioDot} /> : null}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                  <SettingToggle
                    label="Members can add others"
                    sub="When off, only admins can invite"
                    value={allowMembersToAdd}
                    onValueChange={setAllowMembersToAdd}
                    disabled={submitting || privacy === 'restricted'}
                  />
                  <SettingToggle
                    label="Members can edit group info"
                    sub="Name and photo (admins always can)"
                    value={allowMembersToEditInfo}
                    onValueChange={setAllowMembersToEditInfo}
                    disabled={submitting}
                  />
                  <SettingToggle
                    label="Mute notifications"
                    sub="You won't get alerts for this group"
                    value={muteNotifications}
                    onValueChange={setMuteNotifications}
                    disabled={submitting}
                  />
                  <SettingToggle
                    label="Disappearing messages"
                    sub="Coming soon — saved locally for now"
                    value={disappearingMessages}
                    onValueChange={setDisappearingMessages}
                    disabled={submitting}
                  />
                </ScrollView>
              ) : null}
            </View>

            <View
              style={[
                styles.footer,
                {
                  paddingBottom: Math.max(insets.bottom, 10),
                  marginBottom: androidFooterLift,
                },
              ]}>
              {renderFooter()}
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.52)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    marginVertical: 10,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '800', color: BrandColors.text },
  stepDots: { flexDirection: 'row', gap: 6, marginTop: 6 },
  stepDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#e2e8f0' },
  stepDotActive: { backgroundColor: BrandColors.primaryMid, width: 18 },
  kav: { flex: 1, minHeight: 0 },
  body: { flex: 1, minHeight: 0 },
  scrollFlex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingTop: 4, paddingBottom: 20 },
  detailsBody: { flex: 1, paddingTop: 4 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5fb',
    borderRadius: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 15, color: BrandColors.text },
  chipsScroll: { marginBottom: 8, maxHeight: 44 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eff6ff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    maxWidth: 150,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: BrandColors.primaryMid, flexShrink: 1 },
  listFlex: { flex: 1, minHeight: 120 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: MEMBER_ROW_H,
    paddingVertical: 8,
  },
  memberIdentity: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { fontSize: 16, fontWeight: '800', color: BrandColors.primaryMid },
  presenceDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#94a3b8',
    borderWidth: 2,
    borderColor: '#fff',
  },
  presenceDotOn: { backgroundColor: '#22c55e' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  memberName: { fontSize: 15, fontWeight: '700', color: BrandColors.text, flexShrink: 1 },
  roleBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: BrandColors.primaryMid,
    backgroundColor: '#eff6ff',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  memberSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: BrandColors.primaryMid, borderColor: BrandColors.primaryMid },
  footer: {
    paddingTop: 8,
    paddingHorizontal: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e9edef',
    backgroundColor: '#fff',
    minHeight: FOOTER_H,
    justifyContent: 'center',
  },
  primaryBtn: {
    backgroundColor: BrandColors.primaryMid,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  btnLoading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarPick: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#f1f5fb',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  avatarPickImg: { width: '100%', height: '100%' },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 6 },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: BrandColors.text,
    marginBottom: 14,
    backgroundColor: '#fafbff',
  },
  fieldInputFocused: {
    borderColor: BrandColors.primaryMid,
    borderWidth: 2,
    backgroundColor: '#fff',
  },
  fieldMulti: { minHeight: 88, textAlignVertical: 'top', paddingTop: 12 },
  settingsHint: { textAlign: 'center', color: '#64748b', fontSize: 13, marginBottom: 12 },
  privacyStack: { gap: 8, marginBottom: 10 },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  privacyRowActive: {
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  privacyTitle: { fontSize: 14, fontWeight: '700', color: BrandColors.text },
  privacySub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: BrandColors.primaryMid },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: BrandColors.primaryMid },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: BrandColors.text },
  toggleSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
});
