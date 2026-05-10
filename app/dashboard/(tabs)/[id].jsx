import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';

export default function ModuleDetailScreen() {
  const { id } = useLocalSearchParams();
  const slug = Array.isArray(id) ? id[0] : id;

  if (!slug) return <Redirect href="/dashboard/(tabs)" />;
  return <Redirect href={`/dashboard/(tabs)/route/${slug}`} />;
}
