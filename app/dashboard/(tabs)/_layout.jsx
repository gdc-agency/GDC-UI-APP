import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { BrandColors } from '@/constants/brand';

export default function DashboardTabsLayout() {
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        tabBarActiveTintColor: '#ffffff',
        tabBarInactiveTintColor: 'rgba(191,219,254,0.95)',
        tabBarHideOnKeyboard: true,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconOuter, focused && styles.tabIconOuterActive]}>
              <MaterialCommunityIcons name="home-variant" size={focused ? 24 : 22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconOuter, focused && styles.tabIconOuterActive]}>
              <MaterialCommunityIcons
                name={focused ? 'chat' : 'chat-outline'}
                size={focused ? 24 : 22}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconOuter, focused && styles.tabIconOuterActive]}>
              <MaterialCommunityIcons name={focused ? 'bell' : 'bell-outline'} size={focused ? 24 : 22} color={color} />
            </View>
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
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconOuter, focused && styles.tabIconOuterActive]}>
              <MaterialCommunityIcons
                name={focused ? 'account-circle' : 'account-circle-outline'}
                size={focused ? 24 : 22}
                color={color}
              />
            </View>
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
    height: 82,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 0,
    borderWidth: 1,
    backgroundColor: BrandColors.splashTop,
    borderColor: 'rgba(96,165,250,0.2)',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    shadowColor: '#0b2c6a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
  },
  tabIconOuter: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(147,197,253,0.12)',
  },
  tabIconOuterActive: {
    backgroundColor: BrandColors.primaryLight,
    shadowColor: BrandColors.primaryLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 9,
  },
});
