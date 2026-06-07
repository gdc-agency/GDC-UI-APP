import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GlobalChatNotice } from '@/components/chat/global-chat-notice';
import { HapticTab } from '@/components/haptic-tab';
import { FloatingParticles } from '@/components/ui/floating-particles';
import { ChatChromeProvider, useChatChrome } from '@/context/chat-chrome-context';
import { useTheme } from '@/context/theme-context';
import { tabTw } from '@/theme/tab-layout-tw';
import { useGdcNotificationRealtime } from '@/hooks/useGdcNotificationRealtime';
import { formatTabBadgeCount } from '@/utils/compute-total-chat-unread';
import { subscribeChatUnreadTotal } from '@/utils/chat-unread-bus';

/** Content row above home indicator; total bar height = this + insets.bottom */
const TAB_BAR_BASE_HEIGHT = 70;

function TabBarBackground() {
  const { colors } = useTheme();
  const { inConversation } = useChatChrome();
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
    <View className={tabTw.tabBarBgRoot} pointerEvents="none">
      <BlurView intensity={26} tint="dark" style={StyleSheet.absoluteFillObject} />

      <LinearGradient
        colors={colors.tabBarGradient}
        locations={[0, 0.45, 1]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <Animated.View className={tabTw.tabBarGlowWash} style={{ opacity: glowOpacity }}>
        <LinearGradient
          colors={['rgba(53,164,255,0.40)', 'rgba(18,96,200,0.16)', 'rgba(255,255,255,0.06)']}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {!inConversation ? (
        <FloatingParticles density={1.3} twinkles rising variant="tabBar" />
      ) : null}
    </View>
  );
}

/** Fixed 44×44 anchor so tab badges stay top-right when the tab becomes active. */
function TabBadge({ value }) {
  if (!value) return null;
  return (
    <View className={tabTw.tabBadge}>
      <Text className={tabTw.tabBadgeText} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function TabPillIcon({ icon, label, color, focused, badge, colors }) {
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

  const activeLabelStyle = {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#FFFFFF',
    textAlign: 'center',
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  };

  if (focused) {
    return (
      <View className={tabTw.tabIconSlot}>
        <View className={tabTw.tabBadgeAnchor}>
          <Animated.View className={tabTw.activeOrbLift} style={{ transform: [{ scale: orbScale }] }}>
            <LinearGradient
              colors={[colors.primaryLight, colors.primaryMid, colors.primary]}
              locations={[0, 0.5, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: 'rgba(255,255,255,0.95)',
              }}>
              <MaterialCommunityIcons name={icon} size={20} color="#ffffff" />
            </LinearGradient>
          </Animated.View>
          <TabBadge value={badge} />
        </View>
        <Text style={activeLabelStyle} numberOfLines={1} ellipsizeMode="tail">
          {label}
        </Text>
      </View>
    );
  }
  return (
    <View className={tabTw.tabIconSlot}>
      <View className={tabTw.tabBadgeAnchor}>
        <View className={tabTw.tabIconOuter}>
          <MaterialCommunityIcons name={icon} size={21} color={color} />
        </View>
        <TabBadge value={badge} />
      </View>
    </View>
  );
}

function DashboardTabsLayoutInner() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabBarTotalHeight = TAB_BAR_BASE_HEIGHT + insets.bottom;
  const { badge: notificationTabBadge } = useGdcNotificationRealtime();
  const [chatTabBadge, setChatTabBadge] = useState(/** @type {string | undefined} */ (undefined));

  const tabBarStyle = useMemo(
    () => ({
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: tabBarTotalHeight,
      paddingBottom: insets.bottom,
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
    }),
    [insets.bottom, tabBarTotalHeight],
  );

  useEffect(() => {
    return subscribeChatUnreadTotal((total) => {
      setChatTabBadge(formatTabBadgeCount(total));
    });
  }, []);

  return (
    <View className={tabTw.container}>
      <GlobalChatNotice />
      <Tabs
        initialRouteName="index"
        screenOptions={{
          lazy: false,
          tabBarActiveTintColor: '#ffffff',
          tabBarInactiveTintColor: colors.tabBarInactive,
          tabBarHideOnKeyboard: true,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarShowLabel: false,
          tabBarBackground: () => <TabBarBackground />,
          tabBarStyle,
          tabBarItemStyle: { flex: 1, paddingVertical: 0, alignItems: 'center', justifyContent: 'center' },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <TabPillIcon icon="home-variant" label="Home" color={color} focused={focused} colors={colors} />
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
              <TabPillIcon icon={focused ? 'account' : 'account-outline'} label="Profile" color={color} focused={focused} colors={colors} />
            ),
          }}
        />
      </Tabs>
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
