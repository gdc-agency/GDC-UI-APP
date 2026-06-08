import React, { useCallback } from 'react';
import { Image } from 'expo-image';
import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { BlurView } from 'expo-blur';
import { Animated, Easing, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandTitle } from '@/components/ui/brand-title';
import { ThemeToggleButton } from '@/components/ui/theme-toggle';
import { BRAND_NAV_LOGO_SOURCE } from '@/data/constants/brand';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import { isAdminRole, isHrRole } from '@/utils/roles';
import { cn } from '@/theme/cn';

const DRAWER_WIDTH = 304;

const RETIRED_SIDEBAR_ROUTE_IDS = new Set(['team-data']);

function withoutRetiredRoutes(items) {
  return items.filter((r) => !RETIRED_SIDEBAR_ROUTE_IDS.has(r.id));
}

export function DashboardTopbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const drawerTopInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  );
  const drawerBottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 12 : 0);
  const [open, setOpen] = React.useState(false);
  const drawerAnim = React.useRef(new Animated.Value(DRAWER_WIDTH + 18)).current;
  const backdropAnim = React.useRef(new Animated.Value(0)).current;
  const adminRoutes = [
    { id: 'admin', label: 'Admin Control' },
    { id: 'daily-updates', label: 'Daily Updates' },
    { id: 'project-manager', label: 'Project Manager' },
    { id: 'timesheet', label: 'Timesheet' },
    { id: 'availability', label: 'Availability' },
    { id: 'request-management', label: 'Request Management' },
    { id: 'team-tl', label: 'Team assign to TL' },
  ];
  const nonAdminRoutes = [
    { id: 'daily-updates', label: 'Daily Updates' },
    { id: 'project-manager', label: 'Project Manager' },
    { id: 'timesheet', label: 'Timesheet' },
    { id: 'availability', label: 'Availability' },
    { id: 'my-requests', label: 'My Requests' },
  ];
  const hrExtraRoutes = [
    { id: 'request-management', label: 'Request Management' },
    { id: 'team-tl', label: 'Team assign to TL' },
  ];
  const routes = withoutRetiredRoutes(
    isAdminRole(user?.role)
      ? adminRoutes
      : isHrRole(user?.role)
        ? [...nonAdminRoutes, ...hrExtraRoutes]
        : nonAdminRoutes,
  );
  const routeIconMap = {
    'daily-updates': 'text-box-outline',
    'project-manager': 'calendar-month-outline',
    timesheet: 'clock-outline',
    availability: 'calendar-clock-outline',
    'my-requests': 'clipboard-text-outline',
    'request-management': 'account-group-outline',
    'team-tl': 'account-cog-outline',
    admin: 'shield-check-outline',
  };

  const openDrawer = useCallback(() => {
    setOpen(true);
    drawerAnim.setValue(DRAWER_WIDTH + 18);
    backdropAnim.setValue(0);
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(drawerAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropAnim, drawerAnim]);

  const closeDrawer = useCallback(
    (afterClose) => {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(drawerAnim, {
          toValue: DRAWER_WIDTH + 18,
          duration: 240,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (!finished) return;
        setOpen(false);
        if (typeof afterClose === 'function') afterClose();
      });
    },
    [backdropAnim, drawerAnim],
  );

  return (
    <View className="z-20 mx-[18px] mb-2.5 mt-2">
      <View
        className="h-[68px] flex-row items-center justify-between rounded-[18px] border px-3.5 elevation-[3]"
        style={{
          backgroundColor: colors.topbarBg,
          borderColor: colors.topbarBorder,
          shadowColor: colors.text,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
        }}>
        <View className="flex-row items-center gap-2.5">
          <Image
            source={BRAND_NAV_LOGO_SOURCE}
            style={{ width: 38, height: 38 }}
            contentFit="contain"
            accessibilityLabel="Company logo"
          />
          <View className="shrink">
            <BrandTitle size="md" />
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <ThemeToggleButton />
          <Pressable className="h-9 w-9 items-center justify-center rounded-[10px] bg-info-bg" onPress={openDrawer}>
            <MaterialCommunityIcons name="menu" size={20} color={isDark ? '#FFFFFF' : colors.primaryMid} />
          </Pressable>
        </View>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => closeDrawer()}>
        <View className="flex-1">
          <Animated.View
            className="absolute inset-0"
            style={{ backgroundColor: colors.drawerOverlay, opacity: backdropAnim }}
          />
          <Pressable style={StyleSheet.absoluteFill} onPress={() => closeDrawer()} />

          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 0,
              width: DRAWER_WIDTH,
              backgroundColor: colors.drawerBg,
              borderLeftWidth: 1,
              borderLeftColor: colors.drawerBorder,
              transform: [{ translateX: drawerAnim }],
              paddingTop: drawerTopInset + 10,
              paddingBottom: drawerBottomInset + 8,
              paddingHorizontal: 12,
              shadowColor: colors.text,
              shadowOffset: { width: -6, height: 0 },
              shadowOpacity: 0.12,
              shadowRadius: 20,
              elevation: 14,
            }}>
            <BlurView intensity={22} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject} />
            <View
              className="absolute inset-0"
              style={{ backgroundColor: isDark ? 'rgba(15,23,42,0.18)' : 'rgba(255,255,255,0.18)' }}
              pointerEvents="none"
            />

            <View
              className="mb-2.5 flex-row items-center justify-between border-b pb-2.5"
              style={{ borderBottomColor: colors.infoBorder }}>
              <View className="mr-2 flex-1 flex-row items-center gap-2">
                <Image
                  source={BRAND_NAV_LOGO_SOURCE}
                  style={{ width: 34, height: 34 }}
                  contentFit="contain"
                  accessibilityLabel="Company logo"
                />
                <View className="flex-1 min-w-0">
                  <BrandTitle size="lg" />
                  <Text className="mt-0.5 text-[11px] font-semibold" style={{ color: colors.textMuted }} numberOfLines={1}>
                    {user?.name ? user.name : 'Signed in'}
                    {user?.role ? ` • ${user.role}` : ''}
                  </Text>
                </View>
              </View>
              <Pressable
                className="h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-surface-muted"
                onPress={() => closeDrawer()}>
                <MaterialCommunityIcons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView className="flex-1" contentContainerClassName="pb-2.5" showsVerticalScrollIndicator={false}>
              {routes.map((r) => {
                const isActive = pathname?.startsWith(`/dashboard/route/${r.id}`);
                return (
                  <Pressable
                    key={r.id}
                    className={cn(
                      'mb-2 flex-row items-center justify-between rounded-[14px] border border-border-light px-3 py-3',
                    )}
                    style={{
                      backgroundColor: isActive ? colors.drawerItemActiveBg : colors.drawerItemBg,
                      borderColor: isActive ? colors.chipActiveBorder : colors.borderLight,
                    }}
                    onPress={() => {
                      closeDrawer(() => {
                        if (!isActive) router.push(`/dashboard/route/${r.id}`);
                      });
                    }}>
                    <View className="flex-1 flex-row items-center gap-2.5">
                      <View
                        className="h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-info-bg"
                        style={isActive ? { backgroundColor: colors.primary } : undefined}>
                        <MaterialCommunityIcons
                          name={routeIconMap[r.id] ?? 'chevron-right'}
                          size={17}
                          color={isActive ? '#fff' : colors.primaryMid}
                        />
                      </View>
                      <View>
                        <Text
                          className="text-[13px] font-bold"
                          style={{ color: isActive ? colors.primary : colors.text }}>
                          {r.label}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              className="mt-2 flex-row items-center justify-center gap-2 rounded-xl border border-danger-border bg-danger-bg py-3"
              onPress={() => {
                closeDrawer(() => {
                  signOut();
                  router.replace('/');
                });
              }}>
              <MaterialCommunityIcons name="logout" size={18} color={colors.dangerText} />
              <Text className="text-sm font-bold" style={{ color: colors.dangerText }}>Logout</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}
