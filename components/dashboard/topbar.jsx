import React from 'react';
import { Image } from 'expo-image';
import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { BlurView } from 'expo-blur';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';

import { BRAND_COMPANY_NAME, BRAND_LOGO_SOURCE, BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import { isAdminRole, isHrRole } from '@/utils/roles';

const DRAWER_WIDTH = 304;

export function DashboardTopbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [open, setOpen] = React.useState(false);
  const drawerAnim = React.useRef(new Animated.Value(DRAWER_WIDTH + 18)).current;
  const backdropAnim = React.useRef(new Animated.Value(0)).current;
  const adminRoutes = [
    { id: 'admin', label: 'Admin Control' },
    { id: 'daily-updates', label: 'Daily Updates' },
    { id: 'team-data', label: 'Teams Management' },
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
    { id: 'team-data', label: 'Teams Management' },
    { id: 'team-tl', label: 'Team assign to TL' },
  ];
  const routes = isAdminRole(user?.role) ? adminRoutes : isHrRole(user?.role) ? [...nonAdminRoutes, ...hrExtraRoutes] : nonAdminRoutes;
  const routeIconMap = {
    'daily-updates': 'text-box-outline',
    'team-data': 'account-group-outline',
    'project-manager': 'calendar-month-outline',
    timesheet: 'clock-outline',
    availability: 'calendar-clock-outline',
    'my-requests': 'clipboard-text-outline',
    'request-management': 'account-group-outline',
    'team-tl': 'account-cog-outline',
    admin: 'shield-check-outline',
  };

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
          <Image source={BRAND_LOGO_SOURCE} style={styles.logo} contentFit="contain" />
          <View>
            <Text style={styles.name}>{BRAND_COMPANY_NAME}</Text>
          </View>
        </View>

        <Pressable style={styles.routeBtn} onPress={openDrawer}>
          <MaterialCommunityIcons name="menu" size={20} color={BrandColors.primaryMid} />
        </Pressable>
      </View>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => closeDrawer()}>
        <View style={styles.overlay}>
          <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]} />
          <Pressable style={StyleSheet.absoluteFill} onPress={() => closeDrawer()} />

          <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
            <BlurView intensity={22} tint="light" style={StyleSheet.absoluteFillObject} />
            <View style={styles.drawerChromeOverlay} pointerEvents="none" />

            <View style={styles.drawerHeader}>
              <View style={styles.drawerBrand}>
                <Image source={BRAND_LOGO_SOURCE} style={styles.drawerLogo} contentFit="contain" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.drawerBrandText}>{BRAND_COMPANY_NAME}</Text>
                  <Text style={styles.drawerUserMeta} numberOfLines={1}>
                    {user?.name ? user.name : 'Signed in'}{user?.email ? ` • ${user.email}` : ''}
                  </Text>
                </View>
              </View>
              <Pressable style={styles.closeBtn} onPress={() => closeDrawer()}>
                <MaterialCommunityIcons name="close" size={20} color={BrandColors.textMuted} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.drawerList} showsVerticalScrollIndicator={false}>
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
                          color={isActive ? '#fff' : BrandColors.primaryMid}
                        />
                      </View>
                      <View>
                        <Text style={[styles.routeItemText, isActive && styles.routeItemTextActive]}>{r.label}</Text>
                      </View>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={18} color={isActive ? BrandColors.primary : '#94a3b8'} />
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              style={styles.logoutBtn}
              onPress={() => {
                closeDrawer(() => {
                  signOut();
                  router.replace('/');
                });
              }}>
              <MaterialCommunityIcons name="logout" size={18} color="#b91c1c" />
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    zIndex: 20,
    marginHorizontal: 18,
    marginTop: 8,
    marginBottom: 10,
  },
  row: {
    height: 68,
    borderRadius: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe4fb',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  brandWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 38, height: 38 },
  routeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 16, fontWeight: '800', color: BrandColors.text },
  overlay: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.42)' },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: DRAWER_WIDTH,
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderLeftWidth: 1,
    borderLeftColor: '#dbe4fb',
    paddingTop: 18,
    paddingHorizontal: 12,
    paddingBottom: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: -6, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 14,
  },
  drawerChromeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#bfdbfe',
  },
  drawerBrand: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 8 },
  drawerLogo: { width: 34, height: 34 },
  drawerBrandText: { fontSize: 17, fontWeight: '800', color: BrandColors.text },
  drawerUserMeta: { marginTop: 2, fontSize: 11, color: BrandColors.textMuted, fontWeight: '600' },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  drawerList: { paddingBottom: 10 },
  routeItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#e5edff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  routeItemActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d7ff',
  },
  routeLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  routeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeIconWrapActive: {
    backgroundColor: BrandColors.primary,
  },
  routeItemText: { fontSize: 13, color: BrandColors.text, fontWeight: '700' },
  routeItemTextActive: { color: BrandColors.primary },
  logoutBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  logoutText: { color: '#b91c1c', fontSize: 14, fontWeight: '700' },
});
