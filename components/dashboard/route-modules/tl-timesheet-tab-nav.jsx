import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import React from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';

import { TlColors, tlStyles as tls } from './timesheet-tl-styles';

const TL_SUB_TABS = [
  {
    tabId: 'my-attendance',
    label: 'My attendance',
    short: 'Attendance',
    icon: 'account-clock-outline',
  },
  {
    tabId: 'team-overview',
    label: 'Team overview',
    short: 'Overview',
    icon: 'account-group-outline',
  },
  {
    tabId: 'team-records',
    label: 'Team records',
    short: 'Records',
    icon: 'clipboard-text-clock-outline',
  },
];

/** Equal-width segmented tabs — no horizontal scroll on narrow screens. */
export function TlTimesheetTabNav({ slug, router, tlTimesheetTab, setTlTimesheetTab }) {
  const { width } = useWindowDimensions();
  const useShortLabel = width < 400;
  const showIcon = width >= 360;

  return (
    <View style={tls.subTabsCard}>
      <View style={tls.subTabsTrack}>
        {TL_SUB_TABS.map((tab) => {
          const active = tlTimesheetTab === tab.tabId;
          const label = useShortLabel ? tab.short : tab.label;
          return (
            <Pressable
              key={tab.tabId}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.label}
              onPress={() => {
                if (slug !== 'timesheet') {
                  router.push('/dashboard/(tabs)/route/timesheet');
                }
                setTlTimesheetTab(tab.tabId);
              }}
              style={[tls.subTabBtn, active && tls.subTabBtnActive]}
            >
              {showIcon ? (
                <MaterialCommunityIcons
                  name={tab.icon}
                  size={17}
                  color={active ? TlColors.indigo : TlColors.slate}
                />
              ) : null}
              <Text
                style={[tls.subTabText, active && tls.subTabTextActive]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
