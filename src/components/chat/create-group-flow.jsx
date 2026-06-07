import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { SkeletonGroup, SkeletonListRow } from '@/components/ui/skeleton';
import { useTheme } from '@/context/theme-context';
import { createGroupIdempotencyKey } from '@/utils/group-create-guard';
import { cn } from '@/theme/cn';
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

function roleBadgeLabel(role) {
  const r = String(role || '').toLowerCase().replace(/\s+/g, '_');
  if (r === 'admin') return 'AD';
  if (r === 'hr') return 'HR';
  if (r === 'team_leader' || r === 'teamleader') return 'TL';
  return '';
}

const MemberRow = memo(
  function MemberRow({ item, selected, onToggle, colors }) {
    const line = item.displayName || item.name;
    const ringColor = colors.modalSheetBg || colors.card;
    return (
      <Pressable className="h-16 flex-row items-center justify-between px-1 py-2" onPress={() => onToggle(String(item.id))}>
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          <View className="relative h-11 w-11 shrink-0">
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} className="h-11 w-11 rounded-full" contentFit="cover" />
            ) : (
              <View
                className="h-11 w-11 items-center justify-center rounded-full"
                style={{ backgroundColor: colors.chipActiveBg }}>
                <Text className="text-base font-extrabold" style={{ color: colors.primaryMid }}>
                  {String(line).slice(0, 1)}
                </Text>
              </View>
            )}
            <View
              className="absolute -bottom-px -right-px h-[13px] w-[13px] rounded-[7px] border-2"
              style={{
                borderColor: ringColor,
                backgroundColor: item.online ? '#22c55e' : colors.textSecondary,
              }}
            />
          </View>
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text className="shrink text-[15px] font-bold" style={{ color: colors.text }} numberOfLines={1}>
                {line}
              </Text>
              {item.roleLabel ? (
                <Text
                  className="rounded px-[5px] py-0.5 text-[9px] font-extrabold"
                  style={{ backgroundColor: colors.chipActiveBg, color: colors.primaryMid }}>
                  {roleBadgeLabel(item.roleLabel)}
                </Text>
              ) : null}
            </View>
            <Text className="mt-0.5 text-xs" style={{ color: colors.textMuted }}>
              {item.online ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
        <View
          className="h-6 w-6 items-center justify-center rounded-full border-2"
          style={{
            borderColor: selected ? colors.primaryMid : colors.borderStrong,
            backgroundColor: selected ? colors.primaryMid : 'transparent',
          }}>
          {selected ? <MaterialCommunityIcons name="check" size={14} color="#fff" /> : null}
        </View>
      </Pressable>
    );
  },
  (a, b) => a.selected === b.selected && String(a.item.id) === String(b.item.id),
);

const Chip = memo(function Chip({ label, onRemove, colors }) {
  return (
    <Pressable
      className="mr-2 max-w-[150px] flex-row items-center gap-1 rounded-[20px] px-3 py-1.5"
      style={{ backgroundColor: colors.chipActiveBg }}
      onPress={onRemove}>
      <Text className="shrink text-[13px] font-semibold" style={{ color: colors.primaryMid }} numberOfLines={1}>
        {label}
      </Text>
      <MaterialCommunityIcons name="close-circle" size={16} color={colors.textMuted} />
    </Pressable>
  );
});

const StepDots = memo(function StepDots({ step, colors }) {
  return (
    <View className="mt-1.5 flex-row gap-1.5">
      {[1, 2, 3].map((n) => (
        <View
          key={n}
          className="h-[7px] rounded-full"
          style={{
            width: step >= n ? 18 : 7,
            backgroundColor: step >= n ? colors.primaryMid : colors.borderStrong,
          }}
        />
      ))}
    </View>
  );
});

const SettingToggle = memo(function SettingToggle({ label, sub, value, onValueChange, disabled, colors }) {
  return (
    <View className="flex-row items-center py-2.5" style={{ borderBottomWidth: 1, borderBottomColor: colors.borderStrong }}>
      <View className="flex-1">
        <Text className="text-[15px] font-semibold" style={{ color: colors.text }}>{label}</Text>
        <Text className="mt-0.5 text-xs" style={{ color: colors.textMuted }}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.borderStrong, true: colors.primaryMid }}
        thumbColor="#ffffff"
      />
    </View>
  );
});

/**
 * WhatsApp-style 3-step create group with keyboard-safe sheet layout.
 */
export function CreateGroupFlow({ visible, onClose, contacts, contactsLoading = false, onCreate }) {
  const { colors } = useTheme();
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
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.55,
      exif: false,
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
    } catch {
      /* parent shows Alert */
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
      <MemberRow item={item} selected={selectedSet.has(String(item.id))} onToggle={toggle} colors={colors} />
    ),
    [colors, selectedSet, toggle],
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

  const stepTitle = step === 1 ? 'Add members' : step === 2 ? 'Group details' : 'Group settings';

  const keyboardOpen = keyboardHeight > 0;
  const androidFooterLift =
    Platform.OS === 'android' && keyboardOpen ? Math.max(0, keyboardHeight - insets.bottom) : 0;

  const inputStyle = (fieldKey) => ({
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: focusedField === fieldKey ? 2 : 1,
    borderColor: focusedField === fieldKey ? colors.primaryMid : colors.borderStrong,
    backgroundColor: focusedField === fieldKey ? colors.card : colors.inputBg,
    paddingHorizontal: 14,
    paddingVertical: fieldKey === 'description' ? 12 : 12,
    fontSize: 16,
    color: colors.text,
    ...(fieldKey === 'description' ? { minHeight: 88, textAlignVertical: 'top' } : {}),
  });

  const renderFooter = () => {
    if (step === 1) {
      return (
        <Pressable
          className={cn('items-center rounded-[14px] py-3.5', selectedSet.size === 0 && 'opacity-45')}
          style={{ backgroundColor: colors.primaryMid }}
          disabled={selectedSet.size === 0 || submitting}
          onPress={() => {
            Keyboard.dismiss();
            setStep(2);
          }}>
          <Text className="text-base font-extrabold text-white">Next · {selectedSet.size} selected</Text>
        </Pressable>
      );
    }
    if (step === 2) {
      return (
        <Pressable
          className={cn('items-center rounded-[14px] py-3.5', !name.trim() && 'opacity-45')}
          style={{ backgroundColor: colors.primaryMid }}
          disabled={!name.trim() || submitting}
          onPress={() => {
            Keyboard.dismiss();
            setStep(3);
          }}>
          <Text className="text-base font-extrabold text-white">Next: Settings</Text>
        </Pressable>
      );
    }
    return (
      <Pressable
        className={cn('items-center rounded-[14px] py-3.5', (!name.trim() || submitting) && 'opacity-45')}
        style={{ backgroundColor: colors.primaryMid }}
        disabled={!name.trim() || submitting}
        onPress={() => void submit()}>
        {submitting ? (
          <View className="flex-row items-center gap-2.5">
            <ActivityIndicator color="#fff" size="small" />
            <Text className="text-base font-extrabold text-white">Creating…</Text>
          </View>
        ) : (
          <Text className="text-base font-extrabold text-white">Create group</Text>
        )}
      </Pressable>
    );
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={closeAnimated}>
      <View className="flex-1 justify-end">
        <Pressable style={StyleSheet.absoluteFill} onPress={closeAnimated} disabled={submitting}>
          <Animated.View
            pointerEvents="none"
            className="absolute inset-0"
            style={{ backgroundColor: colors.modalBackdrop, opacity: backdropOpacity }}
          />
        </Pressable>

        <Animated.View
          className="overflow-hidden rounded-t-[22px] px-5"
          style={{
            backgroundColor: colors.modalSheetBg,
            height: sheetHeight,
            paddingBottom: 0,
            transform: [{ translateY: sheetY }],
          }}>
          <View
            className="my-2.5 h-1 w-10 self-center rounded-full"
            style={{ backgroundColor: colors.borderStrong }}
          />
          <View className="mb-2 flex-row items-center justify-between">
            {step > 1 ? (
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  setStep((s) => Math.max(1, s - 1));
                }}
                hitSlop={10}
                disabled={submitting}>
                <MaterialCommunityIcons name="arrow-left" size={22} color={colors.text} />
              </Pressable>
            ) : (
              <View className="w-[22px]" />
            )}
            <View className="flex-1 items-center">
              <Text className="text-[17px] font-extrabold" style={{ color: colors.text }}>
                {stepTitle}
              </Text>
              <StepDots step={step} colors={colors} />
            </View>
            <Pressable onPress={closeAnimated} hitSlop={10} disabled={submitting}>
              <MaterialCommunityIcons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <KeyboardAvoidingView
            className="min-h-0 flex-1"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            enabled={Platform.OS === 'ios' || step !== 2}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom + 8 : 0}>
            <View className="min-h-0 flex-1">
              {step === 1 ? (
                <>
                  <View
                    className="mb-2.5 flex-row items-center rounded-[14px] border px-3"
                    style={{ backgroundColor: colors.surfaceMuted, borderColor: colors.borderLight }}>
                    <MaterialCommunityIcons name="magnify" size={18} color={colors.textSecondary} />
                    <TextInput
                      value={search}
                      onChangeText={(t) => {
                        setSearch(t);
                        setListLimit(PAGE_SIZE);
                      }}
                      placeholder="Search people"
                      placeholderTextColor={colors.inputPlaceholder}
                      className="flex-1 px-2 py-2.5 text-[15px]"
                      style={{ color: colors.text }}
                      returnKeyType="search"
                    />
                  </View>
                  {selectedSet.size > 0 ? (
                    <FlatList
                      horizontal
                      data={selectedContacts}
                      keyExtractor={keyExtractor}
                      showsHorizontalScrollIndicator={false}
                      className="mb-2 max-h-11"
                      keyboardShouldPersistTaps="handled"
                      renderItem={({ item }) => (
                        <Chip
                          label={String(item.displayName || item.name)}
                          onRemove={() => toggle(String(item.id))}
                          colors={colors}
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
                      className="min-h-[120px] flex-1"
                      contentContainerClassName="pb-2 px-1"
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
                          <ActivityIndicator className="my-3" color={colors.primaryMid} />
                        ) : null
                      }
                    />
                  )}
                </>
              ) : null}

              {step === 2 ? (
                <View className="flex-1 pt-1">
                  <Pressable
                    className="mb-4 h-[96px] w-[96px] items-center justify-center self-center overflow-hidden rounded-full border-2 border-dashed"
                    style={{ borderColor: colors.primaryMid, backgroundColor: colors.surfaceMuted }}
                    onPress={pickAvatar}
                    disabled={submitting}>
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} className="h-full w-full" contentFit="cover" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="camera-plus-outline" size={32} color={colors.primaryMid} />
                        <Text className="mt-1 text-[11px] font-bold" style={{ color: colors.textMuted }}>
                          Add photo
                        </Text>
                      </>
                    )}
                  </Pressable>
                  <View>
                    <Text className="mb-1.5 text-[13px] font-bold" style={{ color: colors.textMuted }}>
                      Group name
                    </Text>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="Enter group name"
                      placeholderTextColor={colors.inputPlaceholder}
                      style={inputStyle('name')}
                      editable={!submitting}
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField((f) => (f === 'name' ? null : f))}
                      returnKeyType="next"
                    />
                  </View>
                  <View>
                    <Text className="mb-1.5 text-[13px] font-bold" style={{ color: colors.textMuted }}>
                      Description (optional)
                    </Text>
                    <TextInput
                      value={description}
                      onChangeText={(t) => setDescription(t.slice(0, 200))}
                      placeholder="What's this group about?"
                      placeholderTextColor={colors.inputPlaceholder}
                      style={inputStyle('description')}
                      multiline
                      scrollEnabled={false}
                      editable={!submitting}
                      onFocus={() => setFocusedField('description')}
                      onBlur={() => setFocusedField((f) => (f === 'description' ? null : f))}
                      blurOnSubmit
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              ) : null}

              {step === 3 ? (
                <ScrollView
                  className="flex-1"
                  contentContainerClassName="flex-grow pb-5 pt-1"
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  showsVerticalScrollIndicator={false}>
                  <Text className="mb-3 text-center text-[13px]" style={{ color: colors.textMuted }}>
                    {selectedSet.size} members · {name.trim()}
                  </Text>
                  <Text className="mb-1.5 text-[13px] font-bold" style={{ color: colors.textMuted }}>
                    Privacy
                  </Text>
                  <View className="mb-2.5 gap-2">
                    {[
                      ['public', 'Public', 'Anyone in your org can find this group'],
                      ['private', 'Private', 'Only invited members can join'],
                      ['restricted', 'Restricted', 'Only admins can post and invite'],
                    ].map(([key, title, sub]) => {
                      const active = privacy === key;
                      return (
                      <Pressable
                        key={key}
                        className="flex-row items-center gap-2.5 rounded-[14px] border p-3"
                        style={{
                          backgroundColor: active ? colors.chipActiveBg : colors.surfaceMuted,
                          borderColor: active ? colors.chipActiveBorder : colors.borderStrong,
                        }}
                        onPress={() => setPrivacy(key)}
                        disabled={submitting}>
                        <View className="flex-1">
                          <Text className="text-sm font-bold" style={{ color: colors.text }}>{title}</Text>
                          <Text className="mt-0.5 text-xs" style={{ color: colors.textMuted }}>{sub}</Text>
                        </View>
                        <View
                          className="h-[22px] w-[22px] items-center justify-center rounded-full border-2"
                          style={{ borderColor: active ? colors.primaryMid : colors.borderStrong }}>
                          {active ? (
                            <View
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: colors.primaryMid }}
                            />
                          ) : null}
                        </View>
                      </Pressable>
                    );})}
                  </View>
                  <SettingToggle
                    label="Members can add others"
                    sub="When off, only admins can invite"
                    value={allowMembersToAdd}
                    onValueChange={setAllowMembersToAdd}
                    disabled={submitting || privacy === 'restricted'}
                    colors={colors}
                  />
                  <SettingToggle
                    label="Members can edit group info"
                    sub="Name and photo (admins always can)"
                    value={allowMembersToEditInfo}
                    onValueChange={setAllowMembersToEditInfo}
                    disabled={submitting}
                    colors={colors}
                  />
                  <SettingToggle
                    label="Mute notifications"
                    sub="You won't get alerts for this group"
                    value={muteNotifications}
                    onValueChange={setMuteNotifications}
                    disabled={submitting}
                    colors={colors}
                  />
                  <SettingToggle
                    label="Disappearing messages"
                    sub="Coming soon — saved locally for now"
                    value={disappearingMessages}
                    onValueChange={setDisappearingMessages}
                    disabled={submitting}
                    colors={colors}
                  />
                </ScrollView>
              ) : null}
            </View>

            <View
              className="min-h-16 justify-center pt-2"
              style={{
                backgroundColor: colors.modalSheetBg,
                borderTopWidth: 1,
                borderTopColor: colors.borderStrong,
                paddingBottom: Math.max(insets.bottom, 10),
                marginBottom: androidFooterLift,
              }}>
              {renderFooter()}
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}
