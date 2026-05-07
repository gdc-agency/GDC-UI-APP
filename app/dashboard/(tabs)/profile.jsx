import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardTopbar } from '@/components/dashboard/topbar';
import { BRAND_COMPANY_NAME, BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isWide = width >= 760;
  const firstName = user?.name?.split(' ')?.[0] ?? 'Faisal';
  const gdcId = `GDC-${String(user?.id ?? '11840499')}-40`;
  const profileFields = [
    { key: 'email', label: 'EMAIL', value: user?.email ?? 'Not provided', half: true },
    { key: 'department', label: 'DEPARTMENT', value: 'Web Development', half: true },
    { key: 'phone', label: 'PHONE NUMBER', value: '03062672226', half: true },
    { key: 'cnic', label: 'CNIC', value: '35202-0000000-0', half: true },
    { key: 'address', label: 'ADDRESS', value: 'Goheer Town, Bahawalpur', full: true, multiline: true },
  ];
  const profileFieldsWide = [
    { key: 'email', label: 'EMAIL', value: user?.email ?? 'Not provided', half: true },
    { key: 'phone', label: 'PHONE NUMBER', value: '03062672226', half: true },
    { key: 'department', label: 'DEPARTMENT', value: 'Web Development', half: true },
    { key: 'cnic', label: 'CNIC', value: '35202-0000000-0', half: true },
    { key: 'address', label: 'ADDRESS', value: 'Goheer Town, Bahawalpur', full: true, multiline: true },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <DashboardTopbar />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.hero}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{firstName.slice(0, 1).toUpperCase()}</Text>
              </View>
              <TouchableOpacity style={styles.cameraBtn} activeOpacity={0.9}>
                <MaterialCommunityIcons name="camera-outline" size={15} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.title}>{user?.name ?? BRAND_COMPANY_NAME}</Text>
            <Text style={styles.gdcId}>{gdcId}</Text>
          </View>

          <View style={[styles.formGrid, isWide && styles.formGridWide]}>
            {(isWide ? profileFieldsWide : profileFields).map((field) => (
              <View key={field.key} style={[styles.fieldWrap, isWide && field.half && styles.fieldHalf, field.full && styles.fieldFull]}>
                <Text style={styles.label}>{field.label}</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    value={field.value}
                    editable={false}
                    multiline={field.multiline}
                    style={[styles.input, field.multiline && styles.multilineInput]}
                    placeholderTextColor="#94a3b8"
                  />
                  {field.rightIcon ? <MaterialCommunityIcons name={field.rightIcon} size={20} color="#475569" /> : null}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

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
  },
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
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  input: {
    fontSize: 16,
    color: BrandColors.text,
    fontWeight: '500',
    paddingVertical: 2,
    flex: 1,
  },
  multilineInput: {
    minHeight: 76,
    textAlignVertical: 'top',
    paddingTop: 2,
    fontSize: 16,
  },
});
