import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WaveDivider } from '@/components/wave-divider';
import { BRAND_COMPANY_NAME, BRAND_SHORT_NAME, BRAND_LOGO_SOURCE, BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';

const HEADER_RATIO = 0.4;

export default function LoginScreen() {
  const { user, signIn } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerHeight = Math.round(Dimensions.get('window').height * HEADER_RATIO);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
            <Text style={styles.headerBrand}>{BRAND_SHORT_NAME}</Text>
            <Text style={styles.headerSub}>{BRAND_COMPANY_NAME}</Text>
          </View>
          <WaveDivider fill="#FFFFFF" />
        </LinearGradient>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: 10, paddingBottom: insets.bottom + 6 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}>
          <View style={styles.formStack}>
            <View style={styles.formBody}>
              <Text style={styles.formTitle}>Sign in to your account</Text>
              <View style={styles.demoCard}>
                <Text style={styles.demoTitle}>Demo credentials</Text>
                <Text style={styles.demoLine}>Admin: admin@gdc.com / Admin@123</Text>
                <Text style={styles.demoLine}>Team Leader: teamleader@gdc.com / TL@123</Text>
                <Text style={styles.demoLine}>HR: hr@gdc.com / HR@123</Text>
                <Text style={styles.demoLine}>Employee: employee@gdc.com / Emp@123</Text>
              </View>

              {error ? (
                <View style={styles.alert}>
                  <Text style={styles.alertText}>{error}</Text>
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
        </ScrollView>
      </KeyboardAvoidingView>
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
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoImg: {
    width: 128,
    height: 128,
  },
  headerBrand: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSub: {
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
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  formStack: {
    width: '100%',
    minHeight: '92%',
    justifyContent: 'space-evenly',
    gap: 20,
  },
  formBody: {
    width: '100%',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
    marginBottom: 28,
  },
  demoCard: {
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  demoTitle: { fontSize: 12, fontWeight: '800', color: '#1e3a8a', marginBottom: 4 },
  demoLine: { fontSize: 11, color: '#334155', lineHeight: 16 },
  alert: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  alertText: { color: '#b91c1c', fontSize: 14, fontWeight: '600' },
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
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  primaryPill: {
    flex: 1,
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
    flex: 1,
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
