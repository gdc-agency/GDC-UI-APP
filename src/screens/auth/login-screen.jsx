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
} from '@/data/constants/brand';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import { cn } from '@/theme/cn';

const HEADER_RATIO = 0.39;

const logoFrameStyle = {
  width: BRAND_LOGO_FRAME.width,
  height: BRAND_LOGO_FRAME.height,
  borderRadius: BRAND_LOGO_FRAME.borderRadius,
  backgroundColor: BRAND_LOGO_FRAME.backgroundColor,
  padding: BRAND_LOGO_FRAME.padding,
};

const logoImgStyle = {
  width: BRAND_LOGO_FRAME.width - BRAND_LOGO_FRAME.padding * 2,
  height: BRAND_LOGO_FRAME.height - BRAND_LOGO_FRAME.padding * 2,
};

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

  if (!hydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-card">
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
    <View className="flex-1 bg-card">
      <StatusBar style={colors.statusBarStyle === 'light' ? 'light' : 'dark'} />
      <View className="w-full overflow-hidden" style={{ height: headerHeight }}>
        <LinearGradient
          colors={[colors.splashTop, colors.splashMid, colors.splashBottom]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          className="flex-1">
          <View
            className="flex-1 items-center justify-center px-6 pb-2"
            style={{ paddingTop: insets.top + 24 }}>
            <View className="mb-2.5 items-center justify-center overflow-hidden" style={logoFrameStyle}>
              <Image
                source={BRAND_LOGO_SOURCE}
                style={logoImgStyle}
                contentFit="contain"
                contentPosition="center"
              />
            </View>
            <Text className="mt-0.5 text-center text-[23px] font-extrabold text-white">
              {BRAND_COMPANY_NAME}
            </Text>
            <Text className="mt-1 text-center text-[13px] font-semibold text-white/90">
              Turning Clicks into Clients
            </Text>
          </View>
          <WaveDivider fill={colors.card} />
        </LinearGradient>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'flex-start',
          paddingHorizontal: 28,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 20),
        }}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={24}
        extraHeight={Platform.OS === 'ios' ? 24 : 60}
        showsVerticalScrollIndicator={false}
        className="flex-1 bg-card">
        <View className="w-full max-w-[420px] min-h-full justify-start gap-3.5 self-center">
          <View className="mt-0.5 w-full">
            <Text className="mb-2 text-center text-[22px] font-bold tracking-[0.2px] text-text">
              Sign In
            </Text>

            {error ? (
              <View className="mb-4 max-h-40 rounded-card border border-danger-border bg-danger-bg p-3">
                <ScrollView className="max-h-[140px]" nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  <Text className="text-[13px] font-semibold leading-[18px] text-danger-text">{error}</Text>
                </ScrollView>
              </View>
            ) : null}

            <View className="mb-[26px]">
              <Text className="mb-3 text-sm font-medium text-text-muted">E-mail Address</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your mail"
                placeholderTextColor={colors.inputPlaceholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                className="border-b-2 border-input-underline bg-input-bg py-3 pr-14 text-base text-text"
              />
            </View>

            <View className="mb-[26px]">
              <Text className="mb-3 text-sm font-medium text-text-muted">Password</Text>
              <View>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.inputPlaceholder}
                  secureTextEntry={!showPw}
                  autoComplete="password"
                  className="border-b-2 border-input-underline bg-input-bg py-3 pr-14 text-base text-text"
                />
                <TouchableOpacity
                  className="absolute bottom-2.5 right-0 px-1 py-1"
                  onPress={() => setShowPw((v) => !v)}
                  hitSlop={12}
                  accessibilityLabel={showPw ? 'Hide password' : 'Show password'}>
                  <Text className="text-sm font-semibold text-primary-mid">{showPw ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              className="mb-2.5 self-end"
              onPress={() =>
                Alert.alert('Forgot password?', 'Use the GDC web app forgot-password page until mobile reset is wired.')
              }>
              <Text className="text-sm font-semibold text-primary-mid">Forgot password?</Text>
            </TouchableOpacity>
          </View>

          <View className="w-full flex-col items-center gap-3.5">
            <TouchableOpacity
              className={cn(
                'min-h-[52px] w-full items-center justify-center rounded-full bg-primary-mid py-4',
                loading && 'opacity-75',
              )}
              onPress={onSubmit}
              disabled={loading}
              activeOpacity={0.9}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-bold text-white">Login</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              className="min-h-[52px] w-full items-center justify-center rounded-full border border-border-strong bg-card py-4"
              onPress={() => router.back()}
              disabled={loading}
              activeOpacity={0.88}>
              <Text className="text-base font-bold text-text-secondary">Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
