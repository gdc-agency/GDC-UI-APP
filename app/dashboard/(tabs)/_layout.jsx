import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { BrandColors } from '@/constants/brand';

function TabPillIcon({ icon, label, color, focused }) {
  if (focused) {
    return (
      <View style={styles.tabActivePill}>
        <MaterialCommunityIcons name={icon} size={20} color={color} />
        <Text style={styles.tabActiveText}>{label}</Text>
      </View>
    );
  }
  return (
    <View style={styles.tabIconOuter}>
      <MaterialCommunityIcons name={icon} size={22} color={color} />
    </View>
  );
}

export default function DashboardTabsLayout() {
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: 'rgba(191,219,254,0.9)',
        tabBarHideOnKeyboard: true,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <TabPillIcon icon="home-variant" label="Home" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, focused }) => (
            <TabPillIcon icon={focused ? 'message-text' : 'message-text-outline'} label="Chat" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, focused }) => <TabPillIcon icon={focused ? 'bell' : 'bell-outline'} label="Alerts" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="route/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabPillIcon icon={focused ? 'account-circle' : 'account-circle-outline'} label="Profile" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 68,
    borderTopWidth: 0,
    borderWidth: 1.2,
    borderColor: 'rgba(147,197,253,0.35)',
    backgroundColor: '#0b3f8a',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 10,
    paddingTop: 7,
    paddingBottom: 7,
    shadowColor: '#03122f',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.34,
    shadowRadius: 12,
    elevation: 12,
  },
  tabBarItem: { paddingVertical: 0, alignItems: 'center', justifyContent: 'center' },
  tabIconOuter: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  tabActivePill: {
    minWidth: 108,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  tabActiveText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
