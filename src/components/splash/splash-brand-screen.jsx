import React from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AuthBrandBlock } from '@/components/auth/auth-brand-block';
import { AuthSceneBackground } from '@/components/auth/auth-scene-background';
import { BRAND_SLOGAN } from '@/data/constants/brand';

import { SplashLoadingRing } from './splash-loading-ring';

/**
 * Branded splash — corner waves, GDC logo, title, tagline.
 * @param {{ loading?: boolean; statusBarStyle?: 'light' | 'dark' | 'auto' }} props
 */
export function SplashBrandScreen({ loading = false, statusBarStyle = 'dark' }) {
  return (
    <AuthSceneBackground className="flex-1" fullBleedWaves>
      <StatusBar style={statusBarStyle} />
      <View className="flex-1 items-center justify-center px-8">
        <AuthBrandBlock showAcronym slogan={BRAND_SLOGAN} />
        {loading ? <SplashLoadingRing /> : null}
      </View>
    </AuthSceneBackground>
  );
}
