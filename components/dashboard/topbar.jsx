import React, { useMemo } from 'react';
import { Image } from 'expo-image';
import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { BlurView } from 'expo-blur';
import { Animated, Easing, Modal, Platform, Pressable, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemeToggleRow } from '@/components/ui/theme-toggle';
import { BRAND_COMPANY_NAME, BRAND_NAV_LOGO_SOURCE } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';
import { isAdminRole, isHrRole } from '@/utils/roles';

const DRAWER_WIDTH = 304;

/** Retired route — do not show in drawer (use team-tl instead). */
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

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          zIndex: 20,
          marginHorizontal: 18,
          marginTop: 8,
          marginBottom: 10,
        },
        row: {
          height: 68,
          borderRadius: 18,
          backgroundColor: colors.topbarBg,
          borderWidth: 1,
          borderColor: colors.topbarBorder,
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          shadowColor: colors.text,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 3,
        },
        brandWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
        logo: { width: 38, height: 38, backgroundColor: 'transparent' },
        routeBtn: {
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: colors.infoBg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        name: { fontSize: 16, fontWeight: '800', color: colors.text },
        overlay: { flex: 1 },
        backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.drawerOverlay },
        drawer: {
          position: 'absolute',
          top: 0,
          bottom: 0,
          right: 0,
          width: DRAWER_WIDTH,
          backgroundColor: colors.drawerBg,
          borderLeftWidth: 1,
          borderLeftColor: colors.drawerBorder,
          paddingHorizontal: 12,
          shadowColor: colors.text,
          shadowOffset: { width: -6, height: 0 },
          shadowOpacity: 0.12,
          shadowRadius: 20,
          elevation: 14,
        },
        drawerScroll: { flex: 1 },
        drawerChromeOverlay: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: isDark ? 'rgba(15,23,42,0.18)' : 'rgba(255,255,255,0.18)',
        },
        drawerHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.infoBorder,
        },
        drawerBrand: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 },
        drawerLogo: { width: 34, height: 34, backgroundColor: 'transparent' },
        drawerBrandText: { fontSize: 17, fontWeight: '800', color: colors.text },
        drawerUserMeta: { marginTop: 2, fontSize: 11, color: colors.textMuted, fontWeight: '600' },
        closeBtn: {
          width: 34,
          height: 34,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.surfaceMuted,
        },
        drawerList: { paddingBottom: 10 },
        routeItem: {
          paddingHorizontal: 12,
          paddingVertical: 12,
          borderWidth: 1,
          borderColor: colors.borderLight,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: 14,
          marginBottom: 8,
          backgroundColor: colors.drawerItemBg,
        },
        routeItemActive: {
          backgroundColor: colors.drawerItemActiveBg,
          borderColor: colors.chipActiveBorder,
        },
        routeLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
        routeIconWrap: {
          width: 34,
          height: 34,
          borderRadius: 10,
          backgroundColor: colors.infoBg,
          alignItems: 'center',
          justifyContent: 'center',
        },
        routeIconWrapActive: {
          backgroundColor: colors.primary,
        },
        routeItemText: { fontSize: 13, color: colors.text, fontWeight: '700' },
        routeItemTextActive: { color: colors.primary },
        themeToggleWrap: { marginTop: 8, marginBottom: 4 },
        logoutBtn: {
          marginTop: 8,
          borderWidth: 1,
          borderColor: colors.dangerBorder,
          backgroundColor: colors.dangerBg,
          borderRadius: 12,
          paddingVertical: 12,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
        },
        logoutText: { color: colors.dangerText, fontSize: 14, fontWeight: '700' },
      }),
    [colors, isDark],
  );

  const openDrawer = React.useCallback(() => {
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

  const closeDrawer = React.useCallback(
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
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <View style={styles.brandWrap}>
          <Image source={BRAND_NAV_LOGO_SOURCE} style={styles.logo} contentFit="contain" />
          <View>
            <Text style={styles.name}>{BRAND_COMPANY_NAME}</Text>
          </View>
        </View>

        <Pressable style={styles.routeBtn} onPress={openDrawer}>
          <MaterialCommunityIcons name="menu" size={20} color={colors.primaryMid} />
        </Pressable>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => closeDrawer()}>
        <View style={styles.overlay}>
          <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
          <Pressable style={StyleSheet.absoluteFill} onPress={() => closeDrawer()} />

          <Animated.View
            style={[
              styles.drawer,
              {
                transform: [{ translateX: drawerAnim }],
                paddingTop: drawerTopInset + 10,
                paddingBottom: drawerBottomInset + 8,
              },
            ]}>
            <BlurView intensity={22} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFillObject} />
            <View style={styles.drawerChromeOverlay} pointerEvents="none" />

            <View style={styles.drawerHeader}>
              <View style={styles.drawerBrand}>
                <Image source={BRAND_NAV_LOGO_SOURCE} style={styles.drawerLogo} contentFit="contain" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.drawerBrandText}>{BRAND_COMPANY_NAME}</Text>
                  <Text style={styles.drawerUserMeta} numberOfLines={1}>
                    {user?.name ? user.name : 'Signed in'}
                    {user?.role ? ` • ${user.role}` : ''}
                  </Text>
                </View>
              </View>
              <Pressable style={styles.closeBtn} onPress={() => closeDrawer()}>
                <MaterialCommunityIcons name="close" size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.drawerScroll}
              contentContainerStyle={styles.drawerList}
              showsVerticalScrollIndicator={false}>
              {routes.map((r) => {
                const isActive = pathname?.startsWith(`/dashboard/route/${r.id}`);
                return (
                  <Pressable
                    key={r.id}
                    style={[styles.routeItem, isActive && styles.routeItemActive]}
                    onPress={() => {
                      closeDrawer(() => {
                        if (!isActive) router.push(`/dashboard/route/${r.id}`);
                      });
                    }}>
                    <View style={styles.routeLeft}>
                      <View style={[styles.routeIconWrap, isActive && styles.routeIconWrapActive]}>
                        <MaterialCommunityIcons
                          name={routeIconMap[r.id] ?? 'chevron-right'}
                          size={17}
                          color={isActive ? '#fff' : colors.primaryMid}
                        />
                      </View>
                      <View>
                        <Text style={[styles.routeItemText, isActive && styles.routeItemTextActive]}>{r.label}</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.themeToggleWrap}>
              <ThemeToggleRow compact />
            </View>
            <Pressable
              style={styles.logoutBtn}
              onPress={() => {
                closeDrawer(() => {
                  signOut();
                  router.replace('/');
                });
              }}>
              <MaterialCommunityIcons name="logout" size={18} color={colors.dangerText} />
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}
