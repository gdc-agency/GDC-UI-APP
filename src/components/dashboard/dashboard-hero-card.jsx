import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { ProfileAvatar } from '@/components/ui/profile-avatar';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { useTheme } from '@/context/theme-context';

const heroChipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.05,
  },
});

function HeroChip({ icon, children }) {
  return (
    <View style={heroChipStyles.chip}>
      <MaterialCommunityIcons name={icon} size={16} color="#FFFFFF" />
      <Text style={heroChipStyles.chipText} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

const HERO_AVATAR_SIZE = 92;
const HERO_AVATAR_RADIUS = 20;

function HeroWaves() {
  return (
    <Svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
      <Path d="M-20,40 C80,120 180,30 320,20" stroke="rgba(147,197,253,0.35)" strokeWidth={2} fill="none" />
      <Path d="M40,90 C140,10 240,80 360,30" stroke="rgba(251,191,36,0.28)" strokeWidth={1.8} fill="none" />
      <Circle cx={28} cy={36} r={3} fill="rgba(191,219,254,0.45)" />
      <Circle cx={300} cy={72} r={2.5} fill="rgba(254,215,170,0.4)" />
    </Svg>
  );
}

export function DashboardHeroCard({ user, gdcLabel, nowText, roleCode }) {
  const { colors, isDark } = useTheme();
  const gradientColors = isDark
    ? [colors.primaryMid, '#1e3a8a', '#0f172a']
    : ['#2563eb', '#1d4ed8', '#1e40af'];

  return (
    <LinearGradient
      colors={gradientColors}
      locations={[0, 0.55, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="overflow-hidden rounded-[20px] px-5 py-5"
      style={{
        minHeight: 168,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.22,
        shadowRadius: 14,
        elevation: 6,
      }}>
      <HeroWaves />
      <View className="flex-row items-center gap-4">
        <View
          className="shrink-0 overflow-hidden border-[3px] border-white/90"
          style={{
            width: HERO_AVATAR_SIZE,
            height: HERO_AVATAR_SIZE,
            borderRadius: HERO_AVATAR_RADIUS,
          }}>
          <ProfileAvatar
            uri={user?.avatar}
            name={user?.name || roleCode(user?.role)}
            size={HERO_AVATAR_SIZE}
            style={{ borderRadius: HERO_AVATAR_RADIUS }}
            fallbackBg="rgba(255,255,255,0.18)"
            fallbackTextColor="#ffffff"
            textStyle={{ fontSize: 20, fontWeight: '800' }}
          />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-[23px] font-extrabold leading-[28px] text-white" numberOfLines={1}>
            {user?.name ?? 'User'}
          </Text>
          <View className="mt-2.5 gap-2">
            <HeroChip icon="shield-account-outline">Role: {user?.role ?? 'Member'}</HeroChip>
            <HeroChip icon="card-account-details-outline">GDC_ID: {gdcLabel}</HeroChip>
            <HeroChip icon="clock-outline">{nowText}</HeroChip>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}
