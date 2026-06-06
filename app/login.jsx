import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WaveDivider } from '@/components/wave-divider';
import {
  BRAND_COMPANY_NAME,
  BRAND_LOGO_FRAME,
  BRAND_LOGO_SOURCE,
} from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';

const HEADER_RATIO = 0.39;

export default function LoginScreen() {
  const { user, signIn, hydrated } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerHeight = Math.round(Dimensions.get('window').height * HEADER_RATIO);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: colors.card,
        },
        headerBlock: {
          width: '100%',
          overflow: 'hidden',
        },
        headerGradient: {
          flex: 1,
        },
        headerInner: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingTop: 8,
          paddingBottom: 8,
        },
        headerLogoWrap: {
          marginBottom: 10,
          width: BRAND_LOGO_FRAME.width,
          height: BRAND_LOGO_FRAME.height,
          borderRadius: BRAND_LOGO_FRAME.borderRadius,
          backgroundColor: BRAND_LOGO_FRAME.backgroundColor,
          alignItems: 'center',
          justifyContent: 'center',
          padding: BRAND_LOGO_FRAME.padding,
          overflow: 'hidden',
        },
        headerLogoImg: {
          width: BRAND_LOGO_FRAME.width - BRAND_LOGO_FRAME.padding * 2,
          height: BRAND_LOGO_FRAME.height - BRAND_LOGO_FRAME.padding * 2,
        },
        headerSub: {
          marginTop: 2,
          fontSize: 23,
          fontWeight: '800',
          color: '#ffffff',
          textAlign: 'center',
        },
        headerTagline: {
          marginTop: 4,
          fontSize: 13,
          fontWeight: '600',
          color: 'rgba(255,255,255,0.9)',
          textAlign: 'center',
        },
        flex: { flex: 1 },
        scrollView: {
          flex: 1,
          backgroundColor: colors.card,
        },
        scroll: {
          flexGrow: 1,
          justifyContent: 'flex-start',
          paddingHorizontal: 28,
        },
        formStack: {
          width: '100%',
          maxWidth: 420,
          alignSelf: 'center',
          minHeight: '100%',
          justifyContent: 'flex-start',
          gap: 14,
        },
        formBody: {
          width: '100%',
          marginTop: 2,
        },
        formTitle: {
          fontSize: 22,
          fontWeight: '700',
          color: colors.text,
          letterSpacing: 0.2,
          textAlign: 'center',
          marginBottom: 8,
        },
        alert: {
          backgroundColor: colors.dangerBg,
          borderRadius: 12,
          padding: 12,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: colors.dangerBorder,
          maxHeight: 160,
        },
        alertScroll: {
          maxHeight: 140,
        },
        alertText: { color: colors.dangerText, fontSize: 13, fontWeight: '600', lineHeight: 18 },
        field: { marginBottom: 26 },
        label: {
          fontSize: 14,
          fontWeight: '500',
          color: colors.textMuted,
          marginBottom: 12,
        },
        input: {
          fontSize: 16,
          color: colors.text,
          backgroundColor: colors.inputBg,
          paddingVertical: 12,
          paddingRight: 56,
          borderBottomWidth: 2,
          borderBottomColor: colors.inputUnderline,
        },
        eye: {
          position: 'absolute',
          right: 0,
          bottom: 10,
          paddingVertical: 4,
          paddingHorizontal: 4,
        },
        eyeText: {
          fontSize: 14,
          fontWeight: '600',
          color: colors.primaryMid,
        },
        forgot: {
          alignSelf: 'flex-end',
          marginBottom: 10,
        },
        forgotText: {
          fontSize: 14,
          fontWeight: '600',
          color: colors.primaryMid,
        },
        btnRow: {
          flexDirection: 'column',
          gap: 14,
          alignItems: 'center',
          width: '100%',
        },
        primaryPill: {
          width: '100%',
          backgroundColor: colors.primaryMid,
          borderRadius: 999,
          paddingVertical: 16,
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 52,
        },
        pillDisabled: { opacity: 0.75 },
        primaryPillText: {
          color: '#FFFFFF',
          fontSize: 16,
          fontWeight: '700',
        },
        secondaryPill: {
          width: '100%',
          backgroundColor: colors.card,
          borderRadius: 999,
          paddingVertical: 16,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: colors.borderStrong,
          minHeight: 52,
        },
        secondaryPillText: {
          color: colors.textSecondary,
          fontSize: 16,
          fontWeight: '700',
        },
      }),
    [colors],
  );

  if (!hydrated) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primaryMid} />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/dashboard" />;
  }

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      const res = await signIn(email, password);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.replace('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <StatusBar style={colors.statusBarStyle === 'light' ? 'light' : 'dark'} />
      <View style={[styles.headerBlock, { height: headerHeight }]}>
        <LinearGradient
          colors={[colors.splashTop, colors.splashMid, colors.splashBottom]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.headerGradient}>
          <View style={[styles.headerInner, { paddingTop: insets.top + 24 }]}>
            <View style={styles.headerLogoWrap}>
              <Image
                source={BRAND_LOGO_SOURCE}
                style={styles.headerLogoImg}
                contentFit="contain"
                contentPosition="center"
              />
            </View>
            <Text style={styles.headerSub}>{BRAND_COMPANY_NAME}</Text>
            <Text style={styles.headerTagline}>Turning Clicks into Clients</Text>
          </View>
          <WaveDivider fill={colors.card} />
        </LinearGradient>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: 8, paddingBottom: Math.max(insets.bottom, 20) }]}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={24}
        extraHeight={Platform.OS === 'ios' ? 24 : 60}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}>
        <View style={styles.formStack}>
          <View style={styles.formBody}>
            <Text style={styles.formTitle}>Sign In</Text>

            {error ? (
              <View style={styles.alert}>
                <ScrollView style={styles.alertScroll} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  <Text style={styles.alertText}>{error}</Text>
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.field}>
              <Text style={styles.label}>E-mail Address</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your mail"
                placeholderTextColor={colors.inputPlaceholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.inputPlaceholder}
                  secureTextEntry={!showPw}
                  autoComplete="password"
                  style={styles.input}
                />
                <TouchableOpacity
                  style={styles.eye}
                  onPress={() => setShowPw((v) => !v)}
                  hitSlop={12}
                  accessibilityLabel={showPw ? 'Hide password' : 'Show password'}>
                  <Text style={styles.eyeText}>{showPw ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.forgot}
              onPress={() =>
                Alert.alert('Forgot password?', 'Use the GDC web app forgot-password page until mobile reset is wired.')
              }>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.primaryPill, loading && styles.pillDisabled]}
              onPress={onSubmit}
              disabled={loading}
              activeOpacity={0.9}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryPillText}>Login</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryPill}
              onPress={() => router.back()}
              disabled={loading}
              activeOpacity={0.88}>
              <Text style={styles.secondaryPillText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
