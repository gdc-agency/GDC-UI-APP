import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BRAND_COMPANY_NAME,
  BRAND_SHORT_NAME,
  BRAND_TAGLINE,
  BRAND_LOGO_SOURCE,
  BrandColors,
} from '@/constants/brand';
import { useAuth } from '@/context/auth-context';

export default function WelcomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [booting, setBooting] = useState(true);
  const progress = useRef(new Animated.Value(0)).current;

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
        colors={[BrandColors.splashTop, BrandColors.splashMid, BrandColors.splashBottom]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}>
        <StatusBar style="light" />
        <SafeAreaView style={styles.loaderSafe} edges={['top', 'bottom']}>
          <View style={styles.loaderCard}>
            <Image source={BRAND_LOGO_SOURCE} style={styles.loaderLogo} contentFit="contain" />
          </View>
          <Text style={styles.loaderTitle}>{BRAND_COMPANY_NAME}</Text>
          <Text style={styles.loaderSub}>Loading CRM workspace...</Text>

          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { transform: [{ translateX }] }]} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[BrandColors.splashTop, BrandColors.splashMid, BrandColors.splashBottom]}
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
              accessibilityLabel={`${BRAND_COMPANY_NAME} logo`}
            />
          </View>

          <Text style={styles.brandShort}>{BRAND_SHORT_NAME}</Text>
          <Text style={styles.companyFull}>{BRAND_COMPANY_NAME}</Text>
          <Text style={styles.tagline}>{BRAND_TAGLINE}</Text>
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

const styles = StyleSheet.create({
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
    width: 168,
    height: 168,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 10,
  },
  loaderLogo: {
    width: 120,
    height: 120,
  },
  loaderTitle: {
    marginTop: 22,
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  loaderSub: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.88)',
  },
  progressTrack: {
    marginTop: 28,
    width: 260,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    width: 130,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
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
    marginBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImg: {
    width: 180,
    height: 180,
  },
  brandShort: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  companyFull: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
  },
  tagline: {
    marginTop: 20,
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
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
    backgroundColor: '#FFFFFF',
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
    color: BrandColors.primaryMid,
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
});
