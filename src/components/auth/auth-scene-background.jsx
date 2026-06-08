import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { FloatingParticles } from '@/components/ui/floating-particles';
import { BRAND_ORANGE } from '@/data/constants/brand';
import { useTheme } from '@/context/theme-context';

function LightCornerWaves() {
  return (
    <>
      <Svg width={220} height={180} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
        <Path
          d="M-20,30 C60,120 140,40 220,10"
          stroke="#93C5FD"
          strokeWidth={2.5}
          fill="none"
          opacity={0.55}
        />
        <Path
          d="M-10,70 C70,150 150,80 230,40"
          stroke="#FDBA74"
          strokeWidth={2}
          fill="none"
          opacity={0.45}
        />
        <Circle cx={28} cy={42} r={3} fill="#BFDBFE" opacity={0.7} />
        <Circle cx={52} cy={68} r={2} fill="#FED7AA" opacity={0.65} />
      </Svg>
      <Svg width={220} height={180} style={{ position: 'absolute', bottom: 0, right: 0 }} pointerEvents="none">
        <Path
          d="M0,150 C80,60 160,130 240,40"
          stroke="#93C5FD"
          strokeWidth={2.5}
          fill="none"
          opacity={0.5}
        />
        <Path
          d="M20,170 C100,90 170,150 250,70"
          stroke="#FDBA74"
          strokeWidth={2}
          fill="none"
          opacity={0.4}
        />
        <Circle cx={170} cy={120} r={3} fill="#BFDBFE" opacity={0.65} />
        <Circle cx={195} cy={95} r={2} fill="#FED7AA" opacity={0.6} />
      </Svg>
    </>
  );
}

function DarkCornerWaves() {
  return (
    <>
      <Svg width={240} height={200} style={{ position: 'absolute', top: 0, left: 0 }} pointerEvents="none">
        <Path
          d="M-20,20 C70,110 150,30 240,0"
          stroke="#3B82F6"
          strokeWidth={2}
          fill="none"
          opacity={0.35}
        />
        <Path
          d="M0,60 C80,140 160,70 250,30"
          stroke={BRAND_ORANGE}
          strokeWidth={1.5}
          fill="none"
          opacity={0.3}
        />
      </Svg>
      <Svg width={240} height={200} style={{ position: 'absolute', bottom: 0, right: 0 }} pointerEvents="none">
        <Path
          d="M0,160 C90,70 170,140 260,50"
          stroke="#3B82F6"
          strokeWidth={2}
          fill="none"
          opacity={0.32}
        />
        <Path
          d="M20,180 C100,100 180,160 270,80"
          stroke={BRAND_ORANGE}
          strokeWidth={1.5}
          fill="none"
          opacity={0.28}
        />
      </Svg>
    </>
  );
}

/** Decorative auth backdrop — light waves or dark particles. */
export function AuthSceneBackground({ children, className }) {
  const { isDark } = useTheme();

  return (
    <View className={className} style={{ flex: 1, backgroundColor: isDark ? '#070D1A' : '#FFFFFF' }}>
      {isDark ? (
        <>
          <FloatingParticles density={0.85} seed={2048} variant="full" />
          <DarkCornerWaves />
        </>
      ) : (
        <LightCornerWaves />
      )}
      {children}
    </View>
  );
}

/** Gradient divider with center glow dot (splash / brand block). */
export function AuthBrandDivider({ isDark }) {
  return (
    <View className="my-4 w-full max-w-[280px] flex-row items-center self-center">
      <View className="h-px flex-1 overflow-hidden rounded-full">
        <Svg height={2} width="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="authLine" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={isDark ? '#1D4ED8' : '#93C5FD'} stopOpacity={isDark ? 0.2 : 0.35} />
              <Stop offset="0.5" stopColor={isDark ? '#60A5FA' : '#3B82F6'} stopOpacity={isDark ? 0.9 : 0.75} />
              <Stop offset="1" stopColor={BRAND_ORANGE} stopOpacity={isDark ? 0.5 : 0.65} />
            </LinearGradient>
          </Defs>
          <Path d="M0,1 L1000,1" stroke="url(#authLine)" strokeWidth={2} />
        </Svg>
      </View>
      <View
        className="mx-2 h-2 w-2 rounded-full"
        style={{
          backgroundColor: isDark ? '#60A5FA' : BRAND_ORANGE,
          shadowColor: isDark ? '#60A5FA' : BRAND_ORANGE,
          shadowOpacity: 0.8,
          shadowRadius: 6,
          elevation: 4,
        }}
      />
      <View className="h-px flex-1 overflow-hidden rounded-full">
        <Svg height={2} width="100%" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="authLineR" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={BRAND_ORANGE} stopOpacity={isDark ? 0.5 : 0.65} />
              <Stop offset="0.5" stopColor={isDark ? '#60A5FA' : '#3B82F6'} stopOpacity={isDark ? 0.9 : 0.75} />
              <Stop offset="1" stopColor={isDark ? '#1D4ED8' : '#93C5FD'} stopOpacity={isDark ? 0.2 : 0.35} />
            </LinearGradient>
          </Defs>
          <Path d="M0,1 L1000,1" stroke="url(#authLineR)" strokeWidth={2} />
        </Svg>
      </View>
    </View>
  );
}
