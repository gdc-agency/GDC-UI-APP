import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { TlTimesheetTabNav } from './tl-timesheet-tab-nav';
import { timesheetNavTabsForRole } from '@/utils/timesheet-tabs-config';

/**
 * Website-style underline tabs (not Admin segmented Attendance/Clock/Manual header).
 */
export function TimesheetRoleNav({ user, slug, router, styles, tlTimesheetTab, setTlTimesheetTab }) {
  const tabs = timesheetNavTabsForRole(user?.role);
  if (tabs.length <= 1) return null;

  const isTl = user?.role === 'Team Leader';

  if (isTl) {
    return (
      <TlTimesheetTabNav
        slug={slug}
        router={router}
        tlTimesheetTab={tlTimesheetTab}
        setTlTimesheetTab={setTlTimesheetTab}
      />
    );
  }

  return (
    <View style={[styles.panel, styles.tlTimesheetPanel]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tlTimesheetTabs}
        style={styles.tlTimesheetTabsScroll}>
        {tabs.map((tab) => {
          const active = slug === tab.slug;
          return (
            <Pressable
              key={`${tab.slug}-${tab.tabId || tab.label}`}
              onPress={() => {
                if (slug !== tab.slug) {
                  router.push(`/dashboard/(tabs)/route/${tab.slug}`);
                }
              }}
              style={[styles.tlTimesheetTabBtn, active && styles.tlTimesheetTabBtnActive]}>
              <Text numberOfLines={1} style={[styles.tlTimesheetTabText, active && styles.tlTimesheetTabTextActive]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
