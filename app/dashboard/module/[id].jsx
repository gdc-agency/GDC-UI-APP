import { useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardTopbar } from '@/components/dashboard/topbar';
import { BrandColors } from '@/constants/brand';
import { GDC_MODULES } from '@/constants/gdc-modules';

export default function ModuleDetailScreen() {
  const { id } = useLocalSearchParams();
  const slug = Array.isArray(id) ? id[0] : id;

  const mod = useMemo(() => GDC_MODULES.find((m) => m.id === slug), [slug]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <DashboardTopbar />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.headline}>{mod?.label ?? 'Module'}</Text>
          <Text style={styles.desc}>{mod?.description ?? 'This section is coming soon.'}</Text>

          <View style={styles.placeholder}>
            <Text style={styles.placeholderTitle}>Frontend Ready</Text>
            <Text style={styles.placeholderText}>
              This module screen is prepared for API integration. Connect it to your GDC backend service and dynamic data
              will appear here.
            </Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={styles.infoValue}>Pending API</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Priority</Text>
              <Text style={styles.infoValue}>High</Text>
            </View>
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
  },
  headline: { fontSize: 24, fontWeight: '800', color: BrandColors.text },
  desc: { marginTop: 6, fontSize: 14, color: BrandColors.textMuted, lineHeight: 22, marginBottom: 16 },
  placeholder: {
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    padding: 14,
  },
  placeholderTitle: { fontSize: 14, fontWeight: '800', color: '#1e3a8a' },
  placeholderText: { marginTop: 6, fontSize: 13, color: '#334155', lineHeight: 20 },
  infoGrid: { marginTop: 14, flexDirection: 'row', gap: 10 },
  infoItem: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
  },
  infoLabel: { fontSize: 12, color: '#64748b', fontWeight: '700' },
  infoValue: { marginTop: 5, fontSize: 14, color: '#0f172a', fontWeight: '700' },
});
