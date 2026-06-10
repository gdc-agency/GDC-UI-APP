import * as SplashScreen from 'expo-splash-screen';
import { Redirect, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedBlock } from '@/components/ui/animated-block';
import { AuthBrandBlock } from '@/components/auth/auth-brand-block';
import { AuthPrimaryButton } from '@/components/auth/auth-primary-button';
import { AuthSceneBackground } from '@/components/auth/auth-scene-background';
import { SplashBrandScreen } from '@/components/splash/splash-brand-screen';
import { BRAND_TAGLINE } from '@/data/constants/brand';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import { useFirstLaunchSplash } from '@/hooks/use-first-launch-splash';

export default function WelcomeScreen() {
  const { user, hydrated } = useAuth();
  const { isDark } = useTheme();
  const router = useRouter();
  const { introDone, showLoader, splashReady } = useFirstLaunchSplash(hydrated);

  useEffect(() => {
    if (splashReady) {
      void SplashScreen.hideAsync();
    }
  }, [splashReady]);

  if (!introDone) {
    return <SplashBrandScreen loading={showLoader} statusBarStyle={isDark ? 'light' : 'dark'} />;
  }

  if (user) {
    return <Redirect href="/dashboard" />;
  }

  return (
    <AuthSceneBackground className="flex-1">
      <SafeAreaView className="flex-1 px-7" edges={['top', 'bottom']}>
        <AnimatedBlock delay={0} className="flex-1 items-center justify-center pt-2">
          <Text
            className="mb-6 text-[26px] font-medium tracking-[0.3px]"
            style={{ color: isDark ? '#E2E8F0' : '#334155' }}>
            Welcome to
          </Text>
          <AuthBrandBlock showAcronym slogan={null} />
          <Text
            className="mt-5 max-w-[320px] px-2 text-center text-sm font-medium leading-[22px]"
            style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
            {BRAND_TAGLINE}
          </Text>
        </AnimatedBlock>

        <AnimatedBlock delay={120} className="items-center pb-4">
          <AuthPrimaryButton label="Log in" onPress={() => router.push('/login')} />
        </AnimatedBlock>
      </SafeAreaView>
    </AuthSceneBackground>
  );
}
