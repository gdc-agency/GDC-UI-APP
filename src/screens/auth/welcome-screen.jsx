import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedBlock } from '@/components/ui/animated-block';
import { AuthBrandBlock } from '@/components/auth/auth-brand-block';
import { AuthPrimaryButton } from '@/components/auth/auth-primary-button';
import { AuthSceneBackground } from '@/components/auth/auth-scene-background';
import { BRAND_TAGLINE } from '@/data/constants/brand';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';

export default function WelcomeScreen() {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const router = useRouter();
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  if (user) {
    return <Redirect href="/dashboard" />;
  }

  return (
    <AuthSceneBackground className="flex-1">
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SafeAreaView className="flex-1 px-7" edges={['top', 'bottom']}>
        {booting ? (
          <View className="flex-1 items-center justify-center">
            <AuthBrandBlock showDivider slogan="Turning Clicks into Clients" />
          </View>
        ) : (
          <>
            <AnimatedBlock delay={0} className="flex-1 items-center justify-center pt-2">
              <Text
                className="mb-6 text-[26px] font-medium tracking-[0.3px]"
                style={{ color: isDark ? '#E2E8F0' : '#334155' }}>
                Welcome to
              </Text>
              <AuthBrandBlock slogan={null} />
              <Text
                className="mt-5 max-w-[320px] px-2 text-center text-sm font-medium leading-[22px]"
                style={{ color: isDark ? '#94A3B8' : '#64748B' }}>
                {BRAND_TAGLINE}
              </Text>
            </AnimatedBlock>

            <AnimatedBlock delay={120} className="items-center pb-4">
              <AuthPrimaryButton label="Log in" onPress={() => router.push('/login')} />
            </AnimatedBlock>
          </>
        )}
      </SafeAreaView>
    </AuthSceneBackground>
  );
}
