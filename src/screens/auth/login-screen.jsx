import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedBlock } from '@/components/ui/animated-block';
import { KeyboardAwareScrollView } from '@/components/ui/keyboard-aware-scroll-view';
import { AuthBrandBlock } from '@/components/auth/auth-brand-block';
import { AuthPrimaryButton } from '@/components/auth/auth-primary-button';
import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { WaveDivider } from '@/components/wave-divider';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';

const HEADER_RATIO = 0.36;

function AuthInput({ label, icon, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoComplete, trailing }) {
  const { colors } = useTheme();

  return (
    <View className="mb-5">
      <Text className="mb-2.5 text-sm font-semibold" style={{ color: colors.textMuted }}>
        {label}
      </Text>
      <View
        className="flex-row items-center rounded-2xl border px-4 py-3"
        style={{ borderColor: colors.inputBorder, backgroundColor: colors.inputBg }}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.textMuted} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.inputPlaceholder}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoComplete={autoComplete}
          className="ml-3 flex-1 text-base"
          style={{ color: colors.text, paddingVertical: Platform.OS === 'android' ? 2 : 4 }}
        />
        {trailing}
      </View>
    </View>
  );
}

export default function LoginScreen() {
  const { user, signIn, hydrated } = useAuth();
  const { colors, isDark } = useTheme();
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

  const headerColors = isDark
    ? [colors.splashTop, '#0F172A', '#1E293B']
    : [colors.splashTop, colors.splashMid, colors.splashBottom];

  return (
    <View className="flex-1 bg-card">
      <StatusBar style="light" />
      <View className="w-full overflow-hidden" style={{ height: headerHeight }}>
        <LinearGradient
          colors={headerColors}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          className="flex-1">
          <View
            className="flex-1 items-center justify-center px-6 pb-2"
            style={{ paddingTop: insets.top + 20 }}>
            <AuthBrandBlock compact lightOnDark slogan="Turning Clicks into Clients" />
          </View>
          <WaveDivider fill={colors.card} />
        </LinearGradient>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 28,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 24),
        }}
        bottomOffset={24}
        extraKeyboardSpace={Platform.OS === 'ios' ? 24 : 48}
        className="flex-1 bg-card">
        <View className="w-full max-w-[420px] self-center">
          <AnimatedBlock delay={0}>
          <Text className="mb-5 text-center text-[24px] font-bold tracking-[0.2px]" style={{ color: colors.text }}>
            Sign In
          </Text>
          </AnimatedBlock>

          {error ? (
            <AnimatedBlock delay={40}>
            <View className="mb-4 rounded-2xl border border-danger-border bg-danger-bg p-3">
              <ScrollView className="max-h-[120px]" nestedScrollEnabled keyboardShouldPersistTaps="handled">
                <Text className="text-[13px] font-semibold leading-[18px] text-danger-text">{error}</Text>
              </ScrollView>
            </View>
            </AnimatedBlock>
          ) : null}

          <AnimatedBlock delay={70}>
          <AuthInput
            label="E-mail Address"
            icon="email-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your mail"
            keyboardType="email-address"
            autoComplete="email"
          />

          <AuthInput
            label="Password"
            icon="lock-outline"
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            secureTextEntry={!showPw}
            autoComplete="password"
            trailing={
              <Pressable
                onPress={() => setShowPw((v) => !v)}
                hitSlop={12}
                accessibilityLabel={showPw ? 'Hide password' : 'Show password'}
                className="ml-1 p-1">
                <MaterialCommunityIcons
                  name={showPw ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={colors.textMuted}
                />
              </Pressable>
            }
          />
          </AnimatedBlock>

          <AnimatedBlock delay={120}>
          <Pressable
            className="mb-6 self-end"
            onPress={() =>
              Alert.alert('Forgot password?', 'Use the GDC web app forgot-password page until mobile reset is wired.')
            }>
            <Text className="text-sm font-semibold text-primary-mid">Forgot password?</Text>
          </Pressable>

          <View className="items-center gap-3.5">
            <AuthPrimaryButton label="Login" onPress={onSubmit} loading={loading} disabled={loading} />
            <AuthPrimaryButton label="Back" onPress={() => router.back()} variant="outline" disabled={loading} />
          </View>
          </AnimatedBlock>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}
