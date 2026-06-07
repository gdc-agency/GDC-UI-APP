import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BRAND_COMPANY_NAME,
  BRAND_TAGLINE,
  BRAND_LOGO_SOURCE,
  BRAND_LOGO_FRAME,
} from '@/data/constants/brand';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';

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

const loginBtnShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.15,
  shadowRadius: 10,
  elevation: 6,
};

export default function WelcomeScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
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
        colors={[colors.splashTop, colors.splashMid, colors.splashBottom]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        className="flex-1">
        <StatusBar style="light" />
        <SafeAreaView className="flex-1 items-center justify-center px-7" edges={['top', 'bottom']}>
          <View className="items-center justify-center overflow-hidden" style={logoFrameStyle}>
            <Image
              source={BRAND_LOGO_SOURCE}
              style={logoImgStyle}
              contentFit="contain"
              contentPosition="center"
            />
          </View>
          <Text className="mt-[18px] text-[30px] font-extrabold text-white text-center tracking-[0.4px]">
            {BRAND_COMPANY_NAME}
          </Text>
          <Text className="mt-1.5 text-center text-sm font-semibold text-white/[0.92]">
            Turning Clicks into Clients
          </Text>

          <View className="mt-6 h-[7px] w-60 overflow-hidden rounded-full bg-white/[0.24]">
            <Animated.View
              className="h-[7px] w-28 rounded-full bg-[#eaf3ff]"
              style={{ transform: [{ translateX }] }}
            />
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
      className="flex-1">
      <StatusBar style="light" />
      <SafeAreaView className="flex-1 px-7" edges={['top', 'bottom']}>
        <View className="flex-1 items-center justify-center pt-3">
          <Text className="mb-7 text-[26px] font-medium text-white/95 tracking-[0.3px]">Welcome to</Text>

          <View className="mb-5 items-center justify-center overflow-hidden" style={logoFrameStyle}>
            <Image
              source={BRAND_LOGO_SOURCE}
              style={logoImgStyle}
              contentFit="contain"
              contentPosition="center"
              accessibilityLabel={`${BRAND_COMPANY_NAME} logo`}
            />
          </View>

          <Text className="mt-1 text-2xl font-extrabold text-white text-center">{BRAND_COMPANY_NAME}</Text>
          <Text className="mt-1.5 max-w-[320px] px-2 text-center text-sm font-semibold leading-5 text-white/90">
            {BRAND_TAGLINE}
          </Text>
        </View>

        <View className="items-center pb-5">
          <TouchableOpacity
            className="w-full max-w-[340px] items-center rounded-full bg-card py-4"
            style={loginBtnShadow}
            activeOpacity={0.92}
            onPress={() => router.push('/login')}
            accessibilityRole="button"
            accessibilityLabel="Log in">
            <Text className="text-[17px] font-bold text-primary-mid tracking-[0.4px]">Log in</Text>
          </TouchableOpacity>
          <Text className="mt-5 text-[10px] font-semibold tracking-[2px] text-white/55">
            GLOBAL DIGITAL CARE
          </Text>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
