import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandColors } from '@/constants/brand';

const DATA = [
  {
    section: 'Today',
    rows: [
      {
        id: 'n1',
        title: 'New course available!',
        body: 'Operations onboarding material is now available for all roles.',
        icon: 'new-box',
      },
      {
        id: 'n2',
        title: 'Congrats on finishing!',
        body: 'You completed this week attendance summary review.',
        icon: 'check-decagram-outline',
      },
      {
        id: 'n3',
        title: 'New material added!',
        body: 'Project manager templates were updated by Admin.',
        icon: 'book-open-page-variant-outline',
      },
    ],
  },
  {
    section: 'Yesterday',
    rows: [
      {
        id: 'n4',
        title: 'Payment successful!',
        body: 'Payroll batch has been processed successfully.',
        icon: 'credit-card-outline',
      },
      {
        id: 'n5',
        title: 'Credit card connected!',
        body: 'Billing profile setup is now complete.',
        icon: 'wallet-outline',
      },
    ],
  },
];

export default function NotificationsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={BrandColors.text} />
        </Pressable>
        <Text style={styles.title}>Notification</Text>
        <View style={styles.backBtn} />
      </View>

      <FlatList
        data={DATA}
        keyExtractor={(item) => item.section}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{item.section}</Text>
              <Text style={styles.markAll}>Mark all as read</Text>
            </View>
            {item.rows.map((n) => (
              <View key={n.id} style={styles.row}>
                <View style={styles.iconWrap}>
                  <MaterialCommunityIcons name={n.icon} size={18} color={BrandColors.primaryMid} />
                </View>
                <View style={styles.body}>
                  <Text style={styles.rowTitle}>{n.title}</Text>
                  <Text style={styles.rowText}>{n.body}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      />
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
  title: { fontSize: 30, fontWeight: '800', color: BrandColors.text },
  list: { paddingVertical: 10, paddingHorizontal: 12 },
  sectionWrap: { marginBottom: 18 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: BrandColors.text },
  markAll: { fontSize: 13, color: BrandColors.primaryMid, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eef2f7' },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#eaf0ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },
  body: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: BrandColors.text },
  rowText: { marginTop: 4, fontSize: 13, lineHeight: 18, color: BrandColors.textMuted },
});
