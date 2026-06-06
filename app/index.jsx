import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BRAND_COMPANY_NAME,
  BRAND_TAGLINE,
  BRAND_LOGO_SOURCE,
  BRAND_LOGO_FRAME,
} from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';

export default function WelcomeScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [booting, setBooting] = useState(true);
  const progress = useRef(new Animated.Value(0)).current;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        gradient: {
          flex: 1,
        },
        safe: {
          flex: 1,
          paddingHorizontal: 28,
        },
        loaderSafe: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 28,
        },
        loaderCard: {
          width: BRAND_LOGO_FRAME.width,
          height: BRAND_LOGO_FRAME.height,
          borderRadius: BRAND_LOGO_FRAME.borderRadius,
          backgroundColor: BRAND_LOGO_FRAME.backgroundColor,
          alignItems: 'center',
          justifyContent: 'center',
          padding: BRAND_LOGO_FRAME.padding,
          overflow: 'hidden',
        },
        loaderLogo: {
          width: BRAND_LOGO_FRAME.width - BRAND_LOGO_FRAME.padding * 2,
          height: BRAND_LOGO_FRAME.height - BRAND_LOGO_FRAME.padding * 2,
        },
        loaderTitle: {
          marginTop: 18,
          fontSize: 30,
          fontWeight: '800',
          color: '#fff',
          textAlign: 'center',
          letterSpacing: 0.4,
        },
        loaderTagline: {
          marginTop: 6,
          fontSize: 14,
          fontWeight: '600',
          color: 'rgba(255,255,255,0.92)',
          textAlign: 'center',
        },
        progressTrack: {
          marginTop: 24,
          width: 240,
          height: 7,
          borderRadius: 999,
          backgroundColor: 'rgba(255,255,255,0.24)',
          overflow: 'hidden',
        },
        progressFill: {
          width: 112,
          height: 7,
          borderRadius: 999,
          backgroundColor: '#eaf3ff',
        },
        hero: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: 12,
        },
        welcomeTo: {
          fontSize: 26,
          fontWeight: '500',
          color: 'rgba(255,255,255,0.95)',
          marginBottom: 28,
          letterSpacing: 0.3,
        },
        logoWrap: {
          marginBottom: 20,
          width: BRAND_LOGO_FRAME.width,
          height: BRAND_LOGO_FRAME.height,
          borderRadius: BRAND_LOGO_FRAME.borderRadius,
          backgroundColor: BRAND_LOGO_FRAME.backgroundColor,
          alignItems: 'center',
          justifyContent: 'center',
          padding: BRAND_LOGO_FRAME.padding,
          overflow: 'hidden',
        },
        logoImg: {
          width: BRAND_LOGO_FRAME.width - BRAND_LOGO_FRAME.padding * 2,
          height: BRAND_LOGO_FRAME.height - BRAND_LOGO_FRAME.padding * 2,
        },
        heroCompany: {
          marginTop: 4,
          fontSize: 24,
          fontWeight: '800',
          color: '#FFFFFF',
          textAlign: 'center',
        },
        heroTagline: {
          marginTop: 6,
          fontSize: 14,
          fontWeight: '600',
          color: 'rgba(255,255,255,0.9)',
          textAlign: 'center',
          lineHeight: 20,
          maxWidth: 320,
          paddingHorizontal: 8,
        },
        footer: {
          paddingBottom: 20,
          alignItems: 'center',
        },
        loginBtn: {
          width: '100%',
          maxWidth: 340,
          backgroundColor: colors.card,
          borderRadius: 999,
          paddingVertical: 16,
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 6,
        },
        loginBtnText: {
          color: colors.primaryMid,
          fontSize: 17,
          fontWeight: '700',
          letterSpacing: 0.4,
        },
        footerMeta: {
          marginTop: 20,
          fontSize: 10,
          fontWeight: '600',
          color: 'rgba(255,255,255,0.55)',
          letterSpacing: 2,
        },
      }),
    [colors],
  );

  useEffect(() => {
    const anim = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );
    anim.start();
    const timer = setTimeout(() => setBooting(false), 1600);

    return () => {
      clearTimeout(timer);
      anim.stop();
    };
  }, [progress]);

  if (user) {
    return <Redirect href="/dashboard" />;
  }

  if (booting) {
    const translateX = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [-130, 130],
    });

    return (
      <LinearGradient
        colors={[colors.splashTop, colors.splashMid, colors.splashBottom]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.loaderSafe} edges={['top', 'bottom']}>
          <View style={styles.loaderCard}>
            <Image
              source={BRAND_LOGO_SOURCE}
              style={styles.loaderLogo}
              contentFit="contain"
              contentPosition="center"
            />
          </View>
          <Text style={styles.loaderTitle}>{BRAND_COMPANY_NAME}</Text>
          <Text style={styles.loaderTagline}>Turning Clicks into Clients</Text>

          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { transform: [{ translateX }] }]} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[colors.splashTop, colors.splashMid, colors.splashBottom]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.gradient}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.hero}>
          <Text style={styles.welcomeTo}>Welcome to</Text>

          <View style={styles.logoWrap}>
            <Image
              source={BRAND_LOGO_SOURCE}
              style={styles.logoImg}
              contentFit="contain"
              contentPosition="center"
              accessibilityLabel={`${BRAND_COMPANY_NAME} logo`}
            />
          </View>

          <Text style={styles.heroCompany}>{BRAND_COMPANY_NAME}</Text>
          <Text style={styles.heroTagline}>{BRAND_TAGLINE}</Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.loginBtn}
            activeOpacity={0.92}
            onPress={() => router.push('/login')}
            accessibilityRole="button"
            accessibilityLabel="Log in">
            <Text style={styles.loginBtnText}>Log in</Text>
          </TouchableOpacity>
          <Text style={styles.footerMeta}>GLOBAL DIGITAL CARE</Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
