import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs, usePathname } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlobalChatNotice } from '@/components/chat/global-chat-notice';
import { HapticTab } from '@/components/haptic-tab';
import { FloatingParticles } from '@/components/ui/floating-particles';
import { ChatChromeProvider, useChatChrome } from '@/context/chat-chrome-context';
import { useTheme } from '@/context/theme-context';
import { useGdcNotificationRealtime } from '@/hooks/useGdcNotificationRealtime';
import { formatTabBadgeCount } from '@/utils/compute-total-chat-unread';
import { subscribeChatUnreadTotal } from '@/utils/chat-unread-bus';

/** Content row above home indicator; total bar height = this + insets.bottom */
const TAB_BAR_BASE_HEIGHT = 70;
/** Match `DashboardTopbar`: marginTop 8 + row 68 + marginBottom 10 */
const TOPBAR_BLOCK = 86;

function skeletonCardCountForPath(pathname) {
  if (!pathname) return 3;
  const p = pathname.toLowerCase();
  if (p.includes('messages')) return 4;
  if (p.includes('notifications')) return 4;
  if (p.includes('profile')) return 2;
  if (p.includes('route')) return 5;
  if (p.match(/\(tabs\)\/?$/)) return 4;
  return 3;
}

function RouteSkeletonOverlay({ shimmerX, overlayStyle, cardCount, styles }) {
  return (
    <View style={[styles.skeletonOverlay, overlayStyle]} pointerEvents="auto">
      {Array.from({ length: cardCount }, (_, item) => (
        <View key={item} style={[styles.skeletonCard, item < cardCount - 1 ? styles.skeletonCardSpacing : null]}>
          <View style={styles.skeletonRowTop}>
            <View style={[styles.skeletonLine, styles.skeletonLineWide]} />
            <View style={styles.skeletonChip} />
          </View>
          <View style={[styles.skeletonLine, styles.skeletonLineMid]} />
          <View style={[styles.skeletonLine, styles.skeletonLineShort]} />
          <View style={[styles.skeletonLine, styles.skeletonLineFull]} />

          <Animated.View style={[styles.skeletonShimmer, { transform: [{ translateX: shimmerX }] }]} />
        </View>
      ))}
    </View>
  );
}

function TabBarBackground() {
  const { colors } = useTheme();
  const ambientShift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(ambientShift, {
          toValue: 1,
          duration: 9900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ambientShift, {
          toValue: 0,
          duration: 9200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [ambientShift]);

  const glowOpacity = ambientShift.interpolate({
    inputRange: [0, 1],
    outputRange: [0.22, 0.38],
  });

  return (
    <View style={styles.tabBarBgRoot} pointerEvents="none">
      <BlurView intensity={26} tint="dark" style={StyleSheet.absoluteFillObject} />

      <LinearGradient
        colors={colors.tabBarGradient}
        locations={[0, 0.45, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.tabBarGradientFill}
      />

      <Animated.View style={[styles.tabBarGlowWash, { opacity: glowOpacity }]}>
        <LinearGradient
          colors={['rgba(53,164,255,0.40)', 'rgba(18,96,200,0.16)', 'rgba(255,255,255,0.06)']}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
}

/** Fixed 44×44 anchor so tab badges stay top-right when the tab becomes active. */
function TabBadge({ value, styles }) {
  if (!value) return null;
  return (
    <View style={styles.tabBadge}>
      <Text style={styles.tabBadgeText} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function TabPillIcon({ icon, label, color, focused, badge, styles, colors }) {
  const progress = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(progress, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      stiffness: 900,
      damping: 39,
      mass: 1.45,
    }).start();
  }, [focused, progress]);

  const orbScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });
  const textOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  if (focused) {
    return (
      <View style={styles.tabIconSlot}>
        <View style={styles.tabBadgeAnchor}>
          <Animated.View style={[styles.activeOrbLift, { transform: [{ scale: orbScale }] }]}>
            <LinearGradient
              colors={[colors.primaryLight, colors.primaryMid, colors.primary]}
              locations={[0, 0.5, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.activeOrbGradient}>
              <MaterialCommunityIcons name={icon} size={20} color="#ffffff" />
            </LinearGradient>
          </Animated.View>
          <TabBadge value={badge} styles={styles} />
        </View>
        <Animated.Text style={[styles.activeText, { opacity: textOpacity }]} numberOfLines={1} ellipsizeMode="clip">
          {label}
        </Animated.Text>
      </View>
    );
  }
  return (
    <View style={styles.tabIconSlot}>
      <View style={styles.tabBadgeAnchor}>
        <View style={styles.tabIconOuter}>
          <MaterialCommunityIcons name={icon} size={21} color={color} />
        </View>
        <TabBadge value={badge} styles={styles} />
      </View>
    </View>
  );
}

function DashboardTabsLayoutInner() {
  const pathname = usePathname();
  const { inConversation } = useChatChrome();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarTotalHeight = TAB_BAR_BASE_HEIGHT + insets.bottom;
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const { badge: notificationTabBadge } = useGdcNotificationRealtime();
  const [chatTabBadge, setChatTabBadge] = useState(/** @type {string | undefined} */ (undefined));
  const shimmerX = useRef(new Animated.Value(-140)).current;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        globalParticles: {
          zIndex: 999,
          elevation: 999,
          opacity: 0.9,
        },
        skeletonOverlay: {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: colors.pageBg,
          justifyContent: 'flex-start',
          alignItems: 'stretch',
        },
        skeletonCard: {
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.borderStrong,
          backgroundColor: colors.card,
          padding: 14,
        },
        skeletonCardSpacing: {
          marginBottom: 12,
        },
        skeletonRowTop: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        },
        skeletonLine: {
          height: 12,
          borderRadius: 6,
          backgroundColor: colors.skeletonBase,
          marginBottom: 11,
        },
        skeletonLineWide: {
          width: '66%',
          marginBottom: 0,
        },
        skeletonLineMid: {
          width: '60%',
        },
        skeletonLineShort: {
          width: '22%',
        },
        skeletonLineFull: {
          width: '95%',
          marginBottom: 0,
        },
        skeletonChip: {
          width: 32,
          height: 18,
          borderRadius: 6,
          backgroundColor: colors.skeletonBase,
        },
        skeletonShimmer: {
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: 180,
          backgroundColor: colors.skeletonHighlight,
          opacity: 0.82,
        },
        tabBar: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          borderWidth: 0,
          borderTopWidth: 1,
          borderColor: 'rgba(255,255,255,0.2)',
          backgroundColor: 'transparent',
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          paddingHorizontal: 8,
          paddingTop: 10,
          overflow: 'visible',
          zIndex: 100,
          shadowColor: '#020617',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.18,
          shadowRadius: 12,
          elevation: 24,
        },
        tabBarItem: { flex: 1, paddingVertical: 0, alignItems: 'center', justifyContent: 'center' },
        tabIconSlot: {
          width: 76,
          height: 58,
          alignItems: 'center',
          justifyContent: 'flex-end',
        },
        tabBadgeAnchor: {
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
        },
        tabBadge: {
          position: 'absolute',
          top: -4,
          right: -8,
          minWidth: 18,
          height: 18,
          borderRadius: 9,
          paddingHorizontal: 4,
          backgroundColor: '#ef4444',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: colors.primary,
          zIndex: 20,
        },
        tabBadgeText: {
          color: '#ffffff',
          fontSize: 11,
          fontWeight: '700',
          lineHeight: 13,
        },
        tabIconOuter: {
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.14)',
        },
        activeOrbLift: {
          borderRadius: 26,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.45,
          shadowRadius: 12,
          elevation: 14,
        },
        activeOrbGradient: {
          width: 52,
          height: 52,
          borderRadius: 26,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: 'rgba(255,255,255,0.95)',
        },
        activeText: {
          marginTop: 6,
          fontSize: 10,
          lineHeight: 12,
          fontWeight: '800',
          letterSpacing: 0.35,
          color: 'rgba(255,255,255,0.98)',
          textAlign: 'center',
          textTransform: 'uppercase',
        },
      }),
    [colors],
  );

  useEffect(() => {
    return subscribeChatUnreadTotal((total) => {
      setChatTabBadge(formatTabBadgeCount(total));
    });
  }, []);
  const skeletonCardCount = skeletonCardCountForPath(pathname);

  useEffect(() => {
    setIsRouteLoading(true);
    const hideTimer = setTimeout(() => setIsRouteLoading(false), 430);
    return () => clearTimeout(hideTimer);
  }, [pathname]);

  useEffect(() => {
    if (!isRouteLoading) return undefined;

    shimmerX.setValue(-420);
    const loop = Animated.loop(
      Animated.timing(shimmerX, {
        toValue: 420,
        duration: 980,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();

    return () => loop.stop();
  }, [isRouteLoading, shimmerX]);

  return (
    <View style={styles.container}>
      <GlobalChatNotice />
      <Tabs
        initialRouteName="index"
        screenOptions={{
          tabBarActiveTintColor: '#ffffff',
          tabBarInactiveTintColor: colors.tabBarInactive,
          tabBarHideOnKeyboard: true,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarShowLabel: false,
          tabBarBackground: () => <TabBarBackground />,
          tabBarStyle: [
            styles.tabBar,
            {
              height: tabBarTotalHeight,
              paddingBottom: insets.bottom,
            },
          ],
          tabBarItemStyle: styles.tabBarItem,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <TabPillIcon icon="home-variant" label="Home" color={color} focused={focused} styles={styles} colors={colors} />
            ),
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: 'Chat',
            tabBarIcon: ({ color, focused }) => (
              <TabPillIcon
                icon={focused ? 'message-text' : 'message-text-outline'}
                label="Chat"
                color={color}
                focused={focused}
                badge={chatTabBadge}
                styles={styles}
                colors={colors}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: 'Alerts',
            tabBarIcon: ({ color, focused }) => (
              <TabPillIcon
                icon={focused ? 'bell' : 'bell-outline'}
                label="Alerts"
                color={color}
                focused={focused}
                badge={notificationTabBadge}
                styles={styles}
                colors={colors}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="route/[id]"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="[id]"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <TabPillIcon icon={focused ? 'account' : 'account-outline'} label="Profile" color={color} focused={focused} styles={styles} colors={colors} />
            ),
          }}
        />
      </Tabs>

      {!inConversation ? <FloatingParticles density={1} twinkles={false} style={styles.globalParticles} /> : null}

      {isRouteLoading ? (
        <RouteSkeletonOverlay
          shimmerX={shimmerX}
          cardCount={skeletonCardCount}
          styles={styles}
          overlayStyle={{
            bottom: tabBarTotalHeight,
            paddingTop: insets.top + TOPBAR_BLOCK + 4,
            paddingHorizontal: 18,
          }}
        />
      ) : null}
    </View>
  );
}

export default function DashboardTabsLayout() {
  return (
    <ChatChromeProvider>
      <DashboardTabsLayoutInner />
    </ChatChromeProvider>
  );
}

const styles = StyleSheet.create({
  tabBarBgRoot: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },
  tabBarGradientFill: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  tabBarGlowWash: {
    ...StyleSheet.absoluteFillObject,
  },
});
