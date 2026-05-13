import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
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
import { getApiBaseUrl, isLoopbackApiOnNativeDevice, isLoopbackApiOnWebDev } from '@/constants/api-config';
import { BRAND_COMPANY_NAME, BRAND_LOGO_SOURCE, BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';

const HEADER_RATIO = 0.39;

export default function LoginScreen() {
  const { user, signIn, hydrated } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerHeight = Math.round(Dimensions.get('window').height * HEADER_RATIO);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!hydrated) {
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={BrandColors.primaryMid} />
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
      <StatusBar style="dark" />
      <View style={[styles.headerBlock, { height: headerHeight }]}>
        <LinearGradient
          colors={[BrandColors.splashTop, BrandColors.splashMid, BrandColors.splashBottom]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.headerGradient}>
          <View style={[styles.headerInner, { paddingTop: insets.top + 24 }]}>
            <View style={styles.headerLogoWrap}>
              <Image source={BRAND_LOGO_SOURCE} style={styles.headerLogoImg} contentFit="contain" />
            </View>
            <Text style={styles.headerSub}>{BRAND_COMPANY_NAME}</Text>
            <Text style={styles.headerTagline}>Turning Clicks into Clients</Text>
          </View>
          <WaveDivider fill="#FFFFFF" />
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
            <Text style={styles.formTitle}>Sign in with email</Text>

            <Text style={styles.apiHint} numberOfLines={2}>
              API: {getApiBaseUrl()}
            </Text>
            {(isLoopbackApiOnNativeDevice() || isLoopbackApiOnWebDev()) ? (
              <View style={styles.apiWarn}>
                <Text style={styles.apiWarnText}>
                  {isLoopbackApiOnNativeDevice()
                    ? 'On a real phone use your PC Wi‑Fi IP (not localhost, not 10.0.2.2). Set app.json expo.extra.apiBaseUrl to http://YOUR_IP:3000 or EXPO_PUBLIC_API_BASE_URL, same Wi‑Fi, then restart Expo.'
                    : 'Production web needs a public or LAN API URL in app config — not localhost.'}
                </Text>
              </View>
            ) : null}

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
                placeholderTextColor="#94a3b8"
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
                  placeholderTextColor="#94a3b8"
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    width: 126,
    height: 126,
    borderRadius: 63,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(147,197,253,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  headerLogoImg: {
    width: 103,
    height: 103,
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
    backgroundColor: '#FFFFFF',
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
    color: '#334155',
    letterSpacing: 0.2,
    textAlign: 'center',
    marginBottom: 8,
  },
  apiHint: {
    fontSize: 11,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  apiWarn: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  apiWarnText: {
    color: '#9a3412',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    textAlign: 'center',
  },
  alert: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
    maxHeight: 160,
  },
  alertScroll: {
    maxHeight: 140,
  },
  alertText: { color: '#b91c1c', fontSize: 13, fontWeight: '600', lineHeight: 18 },
  field: { marginBottom: 26 },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    color: BrandColors.text,
    paddingVertical: 12,
    paddingRight: 56,
    borderBottomWidth: 2,
    borderBottomColor: BrandColors.inputUnderline,
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
    color: BrandColors.primaryMid,
  },
  forgot: {
    alignSelf: 'flex-end',
    marginBottom: 10,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.primaryMid,
  },
  btnRow: {
    flexDirection: 'column',
    gap: 14,
    alignItems: 'center',
    width: '100%',
  },
  primaryPill: {
    width: '100%',
    backgroundColor: BrandColors.primaryMid,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    minHeight: 52,
  },
  secondaryPillText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '700',
  },
});
