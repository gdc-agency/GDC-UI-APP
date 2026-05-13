import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { DashboardTopbar } from '@/components/dashboard/topbar';
import { BRAND_COMPANY_NAME, BrandColors } from '@/constants/brand';
import { SkeletonGroup, SkeletonProfileForm } from '@/components/ui/skeleton';
import { useAuth } from '@/context/auth-context';
import { updateProfile } from '@/services/api';

function empty(s) {
  return String(s ?? '').trim();
}

export default function ProfileScreen() {
  const { user, token, refreshProfile, mergeFromServerUserRow } = useAuth();
  const { width } = useWindowDimensions();
  const isWide = width >= 760;

  /** Latest session user for focus effect (avoid deps on `user` → infinite re-fetch / stuck loading). */
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

  const firstName = (name || user?.name || 'U').split(' ')?.[0] ?? 'U';
  const gdcLabel = user?.gdc_id ? String(user.gdc_id) : `GDC-${String(user?.id ?? '')}`;

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

  const fields = (
    <>
      <View style={[styles.fieldWrap, isWide && styles.fieldHalf]}>
        <Text style={styles.label}>FULL NAME</Text>
        <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Name" placeholderTextColor="#94a3b8" />
      </View>
      <View style={[styles.fieldWrap, isWide && styles.fieldHalf]}>
        <Text style={styles.label}>EMAIL</Text>
        <TextInput
          value={email}
          editable={false}
          style={[styles.input, styles.inputLocked, Platform.OS === 'web' ? { cursor: 'not-allowed' } : undefined]}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="Email"
          placeholderTextColor="#94a3b8"
        />
      </View>
      <View style={[styles.fieldWrap, isWide && styles.fieldHalf]}>
        <Text style={styles.label}>PHONE</Text>
        <TextInput value={phone} onChangeText={setPhone} style={styles.input} keyboardType="phone-pad" placeholderTextColor="#94a3b8" />
      </View>
      <View style={[styles.fieldWrap, isWide && styles.fieldHalf]}>
        <Text style={styles.label}>DEPARTMENT</Text>
        <TextInput
          value={department}
          editable={false}
          style={[styles.input, styles.inputLocked, Platform.OS === 'web' ? { cursor: 'not-allowed' } : undefined]}
          placeholderTextColor="#94a3b8"
        />
      </View>
      <View style={[styles.fieldWrap, isWide && styles.fieldHalf]}>
        <Text style={styles.label}>CNIC</Text>
        <TextInput value={cnic} onChangeText={setCnic} style={styles.input} placeholderTextColor="#94a3b8" />
      </View>
      <View style={[styles.fieldWrap, styles.fieldFull]}>
        <Text style={styles.label}>ADDRESS</Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          style={[styles.input, styles.multilineInput]}
          multiline
          placeholderTextColor="#94a3b8"
        />
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <DashboardTopbar />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {loading ? (
            <SkeletonGroup speedMs={1700} delayMs={180}>
              <SkeletonProfileForm />
            </SkeletonGroup>
          ) : (
            <>
              <View style={styles.hero}>
                <View style={styles.avatarWrap}>
                  <View style={styles.avatarCircle}>
                    {user?.avatar ? (
                      <Image
                        key={user.avatar}
                        source={{ uri: user.avatar }}
                        style={styles.avatarImg}
                        contentFit="cover"
                        cachePolicy="none"
                      />
                    ) : (
                      <Text style={styles.avatarText}>{firstName.slice(0, 1).toUpperCase()}</Text>
                    )}
                  </View>
                  <TouchableOpacity style={styles.cameraBtn} activeOpacity={0.9} onPress={onChangePhoto} disabled={saving || !token}>
                    <MaterialCommunityIcons name="camera-outline" size={15} color="#fff" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.title}>{user?.name ?? BRAND_COMPANY_NAME}</Text>
                <View style={Platform.OS === 'web' ? { cursor: 'not-allowed' } : undefined}>
                  <Text style={styles.gdcId}>{gdcLabel}</Text>
                </View>
              </View>

              <View style={[styles.formGrid, isWide && styles.formGridWide]}>{fields}</View>
            </>
          )}

          <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={saving || loading} activeOpacity={0.9}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={photoSheetOpen}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => closePhotoSheet()}>
        <View style={styles.photoSheetRoot} pointerEvents="box-none">
          <Animated.View
            pointerEvents="none"
            style={[styles.photoSheetBackdrop, { opacity: sheetBackdrop }]}
          />
          <Pressable style={StyleSheet.absoluteFill} onPress={() => closePhotoSheet()} accessibilityLabel="Dismiss" />
          <Animated.View
            style={[
              styles.photoSheetPanel,
              {
                paddingBottom: Math.max(insets.bottom, 20),
                transform: [{ translateY: sheetTranslate }],
              },
            ]}>
            <View style={styles.photoSheetHandleWrap} accessibilityRole="adjustable">
              <View style={styles.photoSheetHandle} />
            </View>
            <Text style={styles.photoSheetTitle}>Profile Photo</Text>
            <Text style={styles.photoSheetSubtitle}>Choose a source</Text>
            <View style={styles.photoSheetOptions}>
              {Platform.OS !== 'web' ? (
                <Pressable
                  style={({ pressed }) => [styles.photoSheetRow, pressed && styles.photoSheetRowPressed]}
                  onPress={sheetPickCamera}
                  accessibilityRole="button"
                  accessibilityLabel="Open camera">
                  <View style={styles.photoSheetIconCircle}>
                    <MaterialCommunityIcons name="camera-outline" size={22} color={BrandColors.primaryMid} />
                  </View>
                  <Text style={styles.photoSheetRowLabel}>Camera</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={({ pressed }) => [styles.photoSheetRow, pressed && styles.photoSheetRowPressed]}
                onPress={sheetPickLibrary}
                accessibilityRole="button"
                accessibilityLabel="Open photo library">
                <View style={styles.photoSheetIconCircle}>
                  <MaterialCommunityIcons name="image-multiple-outline" size={22} color={BrandColors.primaryMid} />
                </View>
                <Text style={styles.photoSheetRowLabel}>Photo Library</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.photoSheetRow, styles.photoSheetRowLast, pressed && styles.photoSheetRowPressed]}
                onPress={sheetCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel">
                <View style={[styles.photoSheetIconCircle, styles.photoSheetIconCircleDanger]}>
                  <MaterialCommunityIcons name="close" size={22} color="#dc2626" />
                </View>
                <Text style={styles.photoSheetRowLabelDanger}>Cancel</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BrandColors.pageBg },
  scroll: { paddingHorizontal: 18, paddingBottom: 124 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#dbe4fb',
    padding: 18,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
    elevation: 4,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  avatarCircle: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b1729',
    borderWidth: 3,
    borderColor: '#dbeafe',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarText: { color: '#e2e8f0', fontSize: 40, fontWeight: '800' },
  cameraBtn: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.primaryMid,
    borderWidth: 2,
    borderColor: '#fff',
  },
  title: { fontSize: 24, fontWeight: '800', color: BrandColors.text },
  gdcId: { fontSize: 13, color: BrandColors.primaryMid, marginTop: 4, textAlign: 'center', fontWeight: '700' },
  formGrid: {
    gap: 12,
  },
  formGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  fieldWrap: {
    borderWidth: 1,
    borderColor: '#dbe4fb',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#f8fbff',
  },
  fieldHalf: {
    width: '48.5%',
  },
  fieldFull: {
    width: '100%',
  },
  label: { fontSize: 12, color: '#64748b', fontWeight: '800', letterSpacing: 0.8, marginBottom: 6 },
  input: {
    fontSize: 16,
    color: BrandColors.text,
    fontWeight: '500',
    paddingVertical: 2,
    minHeight: 28,
  },
  inputLocked: {
    backgroundColor: 'transparent',
    color: '#64748b',
    opacity: 0.95,
  },
  multilineInput: {
    minHeight: 76,
    textAlignVertical: 'top',
    paddingTop: 2,
  },
  saveBtn: {
    marginTop: 20,
    backgroundColor: BrandColors.primaryMid,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  photoSheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  photoSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.52)',
  },
  photoSheetPanel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 22,
    paddingTop: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 16,
  },
  photoSheetHandleWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  photoSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
  },
  photoSheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: BrandColors.text,
    letterSpacing: -0.3,
  },
  photoSheetSubtitle: {
    marginTop: 6,
    marginBottom: 8,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  photoSheetOptions: {
    marginTop: 12,
    gap: 4,
  },
  photoSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderRadius: 14,
    gap: 16,
  },
  photoSheetRowLast: {
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
    paddingTop: 18,
    marginBottom: 2,
  },
  photoSheetRowPressed: {
    backgroundColor: '#f1f5f9',
  },
  photoSheetIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoSheetIconCircleDanger: {
    backgroundColor: '#fef2f2',
  },
  photoSheetRowLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: BrandColors.text,
  },
  photoSheetRowLabelDanger: {
    fontSize: 16,
    fontWeight: '700',
    color: '#dc2626',
  },
});
