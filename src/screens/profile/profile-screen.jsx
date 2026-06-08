import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedBlock } from '@/components/ui/animated-block';
import { DashboardTopbar } from '@/components/dashboard/topbar';
import { PressableScale } from '@/theme/animations/PressableScale';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { SkeletonGroup, SkeletonProfileForm } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import { updateProfile } from '@/data/api';
import { cn } from '@/theme/cn';

function empty(s) {
  return String(s ?? '').trim();
}

function ProfileInfoRow({
  icon,
  iconColor,
  iconBg,
  label,
  value,
  placeholder,
  fieldKey,
  focusedField = null,
  onFieldFocus,
  inputRef,
  onChangeText,
  editable = true,
  keyboardType,
  multiline,
}) {
  const { colors } = useTheme();
  const showCaret = Boolean(fieldKey && focusedField === fieldKey);
  const displayValue = String(value ?? '').trim();

  return (
    <View className="flex-row items-center gap-3 px-3.5 py-3.5">
      <View className="h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[21px]" style={{ backgroundColor: iconBg }}>
        <MaterialCommunityIcons name={icon} size={20} color={iconColor} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="mb-0.5 text-xs font-semibold text-text-secondary">{label}</Text>
        <TextInput
          ref={inputRef}
          value={displayValue}
          onChangeText={onChangeText}
          editable={editable}
          caretHidden={!showCaret}
          onFocus={fieldKey && onFieldFocus ? () => onFieldFocus(fieldKey) : undefined}
          className={cn(
            'm-0 min-h-[22px] p-0 text-[15px] font-bold text-text',
            !editable && displayValue && 'text-text-muted',
            multiline && 'min-h-[44px] leading-5',
          )}
          placeholder={placeholder}
          placeholderTextColor={colors.inputPlaceholder}
          keyboardType={keyboardType}
          autoCapitalize={label === 'Email' ? 'none' : 'sentences'}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, token, refreshProfile, mergeFromServerUserRow } = useAuth();
  const { colors } = useTheme();

  const userRef = React.useRef(user);
  userRef.current = user;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [cnic, setCnic] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const [focusedField, setFocusedField] = useState(/** @type {string | null} */ (null));
  const nameInputRef = React.useRef(/** @type {TextInput | null} */ (null));
  const phoneInputRef = React.useRef(/** @type {TextInput | null} */ (null));
  const cnicInputRef = React.useRef(/** @type {TextInput | null} */ (null));
  const addressInputRef = React.useRef(/** @type {TextInput | null} */ (null));
  const insets = useSafeAreaInsets();
  const sheetTranslate = React.useRef(new Animated.Value(320)).current;
  const sheetBackdrop = React.useRef(new Animated.Value(0)).current;

  const closePhotoSheet = React.useCallback(
    (afterClose) => {
      Animated.parallel([
        Animated.timing(sheetBackdrop, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslate, {
          toValue: 320,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (!finished) return;
        setPhotoSheetOpen(false);
        afterClose?.();
      });
    },
    [sheetBackdrop, sheetTranslate],
  );

  React.useEffect(() => {
    if (!photoSheetOpen) return;
    sheetTranslate.setValue(320);
    sheetBackdrop.setValue(0);
    let raf = requestAnimationFrame(() => {
      raf = 0;
      Animated.parallel([
        Animated.timing(sheetBackdrop, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslate, {
          toValue: 0,
          useNativeDriver: true,
          damping: 28,
          stiffness: 280,
          mass: 0.85,
        }),
      ]).start();
    });
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [photoSheetOpen, sheetBackdrop, sheetTranslate]);

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      (async () => {
        setLoading(true);
        try {
          const r = await refreshProfile();
          if (cancelled) return;
          if (!r.ok) {
            const u = userRef.current;
            setName(empty(u?.name));
            setEmail(empty(u?.email));
            setPhone(empty(u?.phone));
            setDepartment(empty(u?.department));
            setCnic(empty(u?.cnic));
            setAddress(empty(u?.address));
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [refreshProfile]),
  );

  React.useEffect(() => {
    setName(empty(user?.name));
    setEmail(empty(user?.email));
    setPhone(empty(user?.phone));
    setDepartment(empty(user?.department));
    setCnic(empty(user?.cnic));
    setAddress(empty(user?.address));
  }, [user]);

  const displayName = name || user?.name || 'User';
  const firstName = displayName.split(' ')?.[0] ?? 'U';
  const gdcLabel = user?.gdc_id ? String(user.gdc_id) : `GDC-${String(user?.id ?? '')}`;
  const roleLabel = user?.role ? String(user.role) : '';
  const departmentLabel = department || user?.department || '';

  const dismissFieldEditing = React.useCallback(() => {
    setFocusedField(null);
    Keyboard.dismiss();
    nameInputRef.current?.blur();
    phoneInputRef.current?.blur();
    cnicInputRef.current?.blur();
    addressInputRef.current?.blur();
  }, []);

  const fieldPayload = () => ({
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    department: department.trim(),
    cnic: cnic.trim(),
    address: address.trim(),
  });

  async function submitProfile(asset) {
    if (!token) {
      Alert.alert('Error', 'Not signed in');
      return;
    }
    dismissFieldEditing();
    setSaving(true);
    try {
      const res = await updateProfile(
        token,
        fieldPayload(),
        asset
          ? {
              uri: asset.uri,
              name: asset.fileName ?? undefined,
              type: asset.mimeType ?? undefined,
            }
          : undefined,
      );
      const serverUser = res && typeof res === 'object' && res.user && typeof res.user === 'object' ? res.user : null;
      if (serverUser) {
        mergeFromServerUserRow(serverUser);
      }
      await refreshProfile();
      Alert.alert('Saved', asset ? 'Profile photo updated.' : 'Profile updated successfully.');
    } catch (e) {
      Alert.alert('Update failed', e?.message ?? 'Could not save profile');
    } finally {
      setSaving(false);
      dismissFieldEditing();
    }
  }

  async function pickFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to change your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    await submitProfile(result.assets[0]);
  }

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow camera access to take a profile picture.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    await submitProfile(result.assets[0]);
  }

  function onChangePhoto() {
    setPhotoSheetOpen(true);
  }

  function sheetPickCamera() {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    closePhotoSheet(() => void pickFromCamera());
  }

  function sheetPickLibrary() {
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    closePhotoSheet(() => void pickFromLibrary());
  }

  function sheetCancel() {
    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }
    closePhotoSheet();
  }

  function onSave() {
    void submitProfile(undefined);
  }

  return (
    <SafeAreaView className="flex-1 bg-page" edges={['top']}>
      <DashboardTopbar />

      <ScrollView
        contentContainerClassName="pb-[124px]"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        onScrollBeginDrag={dismissFieldEditing}>
        {loading ? (
          <View className="px-4 pt-2">
            <SkeletonGroup speedMs={1700} delayMs={180}>
              <SkeletonProfileForm />
            </SkeletonGroup>
          </View>
        ) : (
          <>
            <AnimatedBlock delay={0}>
            <LinearGradient
              colors={[colors.primaryMid, colors.primaryLight, '#5eb8ff']}
              locations={[0, 0.55, 1]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              className="mx-4 mt-1 flex-row items-center gap-[18px] overflow-hidden rounded-[18px] p-4 elevation-[6]"
              style={{
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.22,
                shadowRadius: 16,
              }}>
              <View className="mr-1 shrink-0">
                <View className="relative">
                  <View className="h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-[36px] border-[3px] border-card bg-surface-muted">
                    <ProfileAvatar
                      uri={user?.avatar}
                      name={user?.name || firstName}
                      size={72}
                      textStyle={{ fontSize: 28, fontWeight: '800', color: colors.textMuted }}
                    />
                  </View>
                  <Pressable
                    className="absolute -bottom-0.5 -right-0.5 h-[26px] w-[26px] items-center justify-center rounded-[13px] border-2 border-card bg-card"
                    onPress={onChangePhoto}
                    disabled={saving || !token}>
                    <MaterialCommunityIcons name="camera" size={14} color={colors.primaryMid} />
                  </Pressable>
                </View>
              </View>

              <View className="min-w-0 flex-1 gap-1.5 pr-1">
                <Text
                  className="text-[17px] font-extrabold leading-5 text-white"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}>
                  {displayName}
                </Text>
                <View className="max-w-full flex-row items-center gap-1.5 self-start rounded-[20px] bg-white/20 px-2.5 py-[5px]">
                  <MaterialCommunityIcons name="shield-check" size={14} color="#fff" />
                  <Text className="shrink text-xs font-bold text-white" numberOfLines={1} ellipsizeMode="tail">
                    {gdcLabel}
                  </Text>
                </View>
                {roleLabel ? (
                  <View className="flex-row items-center gap-1.5">
                    <MaterialCommunityIcons name="briefcase-outline" size={14} color="rgba(255,255,255,0.95)" />
                    <Text className="flex-1 text-[13px] font-semibold text-white/95" numberOfLines={1} ellipsizeMode="tail">
                      {roleLabel}
                    </Text>
                  </View>
                ) : null}
                {departmentLabel ? (
                  <View className="flex-row items-center gap-1.5">
                    <MaterialCommunityIcons name="office-building-outline" size={14} color="rgba(255,255,255,0.95)" />
                    <Text className="flex-1 text-[13px] font-semibold text-white/95" numberOfLines={1} ellipsizeMode="tail">
                      {departmentLabel}
                    </Text>
                  </View>
                ) : null}
              </View>
            </LinearGradient>
            </AnimatedBlock>

            <AnimatedBlock delay={80}>
            <View
              className="mx-4 mt-4 rounded-[18px] border border-border-light bg-card py-1 elevation-[3]"
              style={{
                shadowColor: colors.text,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.06,
                shadowRadius: 14,
              }}>
              <ProfileInfoRow
                icon="account-outline"
                iconColor="#2563eb"
                iconBg="#dbeafe"
                label="Full Name"
                placeholder="Enter your full name"
                fieldKey="name"
                focusedField={focusedField}
                onFieldFocus={setFocusedField}
                inputRef={nameInputRef}
                value={name}
                onChangeText={setName}
              />
              <View className="ml-[68px] h-px bg-border" />
              <ProfileInfoRow
                icon="email-outline"
                iconColor="#2563eb"
                iconBg="#dbeafe"
                label="Email"
                value={email}
                placeholder="No email on file"
                editable={false}
              />
              <View className="ml-[68px] h-px bg-border" />
              <ProfileInfoRow
                icon="phone-outline"
                iconColor="#16a34a"
                iconBg="#dcfce7"
                label="Phone"
                placeholder="Enter your phone number"
                fieldKey="phone"
                focusedField={focusedField}
                onFieldFocus={setFocusedField}
                inputRef={phoneInputRef}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
              <View className="ml-[68px] h-px bg-border" />
              <ProfileInfoRow
                icon="briefcase-outline"
                iconColor="#ea580c"
                iconBg="#ffedd5"
                label="Department"
                value={departmentLabel}
                placeholder="No department added"
                editable={false}
              />
              <View className="ml-[68px] h-px bg-border" />
              <ProfileInfoRow
                icon="card-account-details-outline"
                iconColor="#7c3aed"
                iconBg="#ede9fe"
                label="CNIC"
                placeholder="Enter your CNIC"
                fieldKey="cnic"
                focusedField={focusedField}
                onFieldFocus={setFocusedField}
                inputRef={cnicInputRef}
                value={cnic}
                onChangeText={setCnic}
              />
              <View className="ml-[68px] h-px bg-border" />
              <ProfileInfoRow
                icon="map-marker-outline"
                iconColor="#db2777"
                iconBg="#fce7f3"
                label="Address"
                placeholder="Enter your address"
                fieldKey="address"
                focusedField={focusedField}
                onFieldFocus={setFocusedField}
                inputRef={addressInputRef}
                value={address}
                onChangeText={setAddress}
                multiline
              />
            </View>
            </AnimatedBlock>

            <AnimatedBlock delay={140}>
            <PressableScale
              className="mx-4 mt-5 items-center justify-center rounded-[14px] bg-primary-mid px-[18px] py-3.5"
              onPress={onSave}
              disabled={saving || loading}>
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View className="flex-row items-center gap-2.5">
                  <View className="h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                    <MaterialCommunityIcons name="content-save" size={18} color="#fff" />
                  </View>
                  <Text className="text-base font-extrabold text-white">Save changes</Text>
                </View>
              )}
            </PressableScale>
            </AnimatedBlock>
          </>
        )}
      </ScrollView>

      <Modal
        visible={photoSheetOpen}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => closePhotoSheet()}>
        <View className="flex-1 justify-end" pointerEvents="box-none">
          <Animated.View
            pointerEvents="none"
            className="absolute inset-0"
            style={{ backgroundColor: colors.modalBackdrop, opacity: sheetBackdrop }}
          />
          <Pressable style={StyleSheet.absoluteFill} onPress={() => closePhotoSheet()} accessibilityLabel="Dismiss" />
          <Animated.View
            className="rounded-t-[22px] px-[22px] pt-2 elevation-[16]"
            style={{
              backgroundColor: colors.modalSheetBg,
              paddingBottom: Math.max(insets.bottom, 20),
              transform: [{ translateY: sheetTranslate }],
              shadowColor: colors.text,
              shadowOffset: { width: 0, height: -8 },
              shadowOpacity: 0.12,
              shadowRadius: 24,
            }}>
            <View className="items-center py-2.5" accessibilityRole="adjustable">
              <View className="h-1 w-10 rounded-sm bg-border-strong" />
            </View>
            <Text className="text-xl font-extrabold tracking-tight text-text">Profile Photo</Text>
            <Text className="mb-2 mt-1.5 text-sm font-medium text-text-muted">Choose a source</Text>
            <View className="mt-3 gap-1">
              {Platform.OS !== 'web' ? (
                <Pressable
                  className="flex-row items-center gap-4 rounded-[14px] px-1 py-4"
                  style={({ pressed }) => (pressed ? { backgroundColor: colors.surfaceMuted } : undefined)}
                  onPress={sheetPickCamera}
                  accessibilityRole="button"
                  accessibilityLabel="Open camera">
                  <View className="h-11 w-11 items-center justify-center rounded-xl bg-info-bg">
                    <MaterialCommunityIcons name="camera-outline" size={22} color={colors.primaryMid} />
                  </View>
                  <Text className="text-base font-bold text-text">Camera</Text>
                </Pressable>
              ) : null}
              <Pressable
                className="flex-row items-center gap-4 rounded-[14px] px-1 py-4"
                style={({ pressed }) => (pressed ? { backgroundColor: colors.surfaceMuted } : undefined)}
                onPress={sheetPickLibrary}
                accessibilityRole="button"
                accessibilityLabel="Open photo library">
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-info-bg">
                  <MaterialCommunityIcons name="image-multiple-outline" size={22} color={colors.primaryMid} />
                </View>
                <Text className="text-base font-bold text-text">Photo Library</Text>
              </Pressable>
              <Pressable
                className="mb-0.5 mt-1 flex-row items-center gap-4 rounded-[14px] border-t border-border-strong px-1 pb-0.5 pt-[18px]"
                style={({ pressed }) => (pressed ? { backgroundColor: colors.surfaceMuted } : undefined)}
                onPress={sheetCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel">
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-danger-bg">
                  <MaterialCommunityIcons name="close" size={22} color="#dc2626" />
                </View>
                <Text className="text-base font-bold text-danger-text">Cancel</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
