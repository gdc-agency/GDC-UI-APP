import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import React from 'react';
import { ActivityIndicator, Pressable, Switch, Text, TextInput, View } from 'react-native';

import { useTheme } from '@/context/theme-context';
import {
  AUTO_CHECKOUT_HOURS_OPTIONS,
  CLOCK_IN_CUTOFF_OPTIONS,
  DEFAULT_WORK_WEEK_DAYS,
  formatBreakDurationLabel,
  GRACE_BEFORE_START_OPTIONS,
  LATE_MARK_OPTIONS,
  MINIMUM_WORKING_HOURS_OPTIONS,
  TIMEZONE_OPTIONS,
  WEEKDAY_OPTIONS,
  timezoneLabel,
  weekdayLongLabel,
} from '@/utils/time-control';

function ChipRow({ options, value, onChange, suffix = '' }) {
  const { moduleStyles } = useTheme();
  const styles = moduleStyles.routeDetail;
  return (
    <View style={styles.tcChipRow}>
      {options.map((opt) => {
        const key = typeof opt === 'object' ? opt.value : opt;
        const label = typeof opt === 'object' ? opt.label : `${opt}${suffix}`;
        const active = value === key;
        return (
          <Pressable
            key={String(key)}
            onPress={() => onChange(key)}
            style={[styles.tcChip, active && styles.tcChipActive]}>
            <Text style={[styles.tcChipText, active && styles.tcChipTextActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function FieldLabel({ children, hint }) {
  const { moduleStyles } = useTheme();
  const styles = moduleStyles.routeDetail;
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={styles.tcFieldLabel}>{children}</Text>
      {hint ? <Text style={styles.tcFieldHint}>{hint}</Text> : null}
    </View>
  );
}

export function TimeControlPanel({ ctx }) {
  const { colors, isDark } = useTheme();
  const styles = ctx.styles;

  const {
    shiftDate,
    setShiftDate,
    shiftStart,
    setShiftStart,
    shiftEnd,
    setShiftEnd,
    openShiftDatePicker,
    openShiftTimePicker,
    openShiftBreakStartPicker,
    handleSaveShiftTiming,
    shiftSaveLoading = false,
    shiftLoading = false,
    shiftTimezone,
    setShiftTimezone,
    shiftWorkWeekDays = DEFAULT_WORK_WEEK_DAYS,
    toggleShiftWorkWeekDay,
    shiftBreakStart,
    setShiftBreakStart,
    shiftBreakDuration,
    setShiftBreakDuration,
    shiftLateAfter,
    setShiftLateAfter,
    shiftClockInCutoff,
    setShiftClockInCutoff,
    shiftGraceBefore,
    setShiftGraceBefore,
    shiftMinHours,
    setShiftMinHours,
    shiftAutoCheckout,
    setShiftAutoCheckout,
    shiftHolidays = [],
    shiftHolidayDraft,
    setShiftHolidayDraft,
    openHolidayDatePicker,
    addShiftHoliday,
    removeShiftHoliday,
    shiftEnabled,
    toggleShiftEnabled,
    liveShiftNotifications,
    setLiveShiftNotifications,
    shiftLastUpdatedAt,
    shiftLastUpdatedBy,
    timezoneMenuOpen,
    setTimezoneMenuOpen,
  } = ctx;

  const holidayList = Array.isArray(shiftHolidays) ? shiftHolidays : [];

  return (
    <View style={[styles.panel, styles.adminTabContentPanel]}>
      <Text style={styles.panelTitle}>Time Control</Text>
      <Text style={styles.panelSub}>Company office shift, holidays, and attendance policy (no geo-fencing).</Text>

      {shiftLoading ? (
        <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primaryMid} />
      ) : null}

      <View style={styles.tcSummaryRow}>
        <View style={[styles.tcSummaryCard, { backgroundColor: isDark ? '#431407' : '#fff7ed' }]}>
          <MaterialCommunityIcons name="calendar-clock" size={18} color="#f97316" />
          <Text style={styles.tcSummaryLabel}>Shift</Text>
          <Text style={styles.tcSummaryValue}>
            {shiftStart || '—'} – {shiftEnd || '—'}
          </Text>
        </View>
        <View style={[styles.tcSummaryCard, { backgroundColor: isDark ? '#1e3a8a' : '#eff6ff' }]}>
          <MaterialCommunityIcons name="earth" size={18} color="#2563eb" />
          <Text style={styles.tcSummaryLabel}>Timezone</Text>
          <Text style={styles.tcSummaryValue} numberOfLines={2}>
            {timezoneLabel(shiftTimezone)}
          </Text>
        </View>
        <View style={[styles.tcSummaryCard, { backgroundColor: isDark ? '#14532d' : '#dcfce7' }]}>
          <MaterialCommunityIcons name="check-circle-outline" size={18} color="#16a34a" />
          <Text style={styles.tcSummaryLabel}>Last updated</Text>
          <Text style={styles.tcSummaryValue} numberOfLines={2}>
            {shiftLastUpdatedAt
              ? new Date(shiftLastUpdatedAt).toLocaleString()
              : 'Not saved yet'}
          </Text>
          {shiftLastUpdatedBy ? (
            <Text style={styles.tcFieldHint}>by {shiftLastUpdatedBy}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.tcSection}>
        <Text style={styles.tcSectionTitle}>Schedule</Text>
        <FieldLabel>Effective date</FieldLabel>
        <View style={styles.timeInputWrap}>
          <TextInput
            value={shiftDate}
            onChangeText={setShiftDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.inputPlaceholder}
            style={styles.timeInput}
          />
          <Pressable onPress={openShiftDatePicker}>
            <MaterialCommunityIcons name="calendar-blank-outline" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>

        <FieldLabel hint="Used for late / absent calculations">Timezone</FieldLabel>
        <Pressable style={styles.timeInputWrap} onPress={() => setTimezoneMenuOpen?.(!timezoneMenuOpen)}>
          <Text style={[styles.timeInput, { paddingVertical: 0 }]} numberOfLines={1}>
            {timezoneLabel(shiftTimezone)}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={16} color={colors.textSecondary} />
        </Pressable>
        {timezoneMenuOpen ? (
          <View style={styles.tcDropdown}>
            {TIMEZONE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={styles.tcDropdownItem}
                onPress={() => {
                  setShiftTimezone?.(opt.value);
                  setTimezoneMenuOpen?.(false);
                }}>
                <Text style={styles.tcDropdownText}>
                  {opt.offset} · {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <FieldLabel>Working days</FieldLabel>
        <View style={styles.tcChipRow}>
          {WEEKDAY_OPTIONS.map((d) => {
            const active = (shiftWorkWeekDays || []).includes(d.value);
            return (
              <Pressable
                key={d.value}
                onPress={() => toggleShiftWorkWeekDay?.(d.value)}
                style={[styles.tcChip, active && styles.tcChipActive]}>
                <Text style={[styles.tcChipText, active && styles.tcChipTextActive]}>{d.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.tcSection}>
        <Text style={styles.tcSectionTitle}>Hours</Text>
        <View style={styles.timeFormRow}>
          <View style={styles.timeFieldHalf}>
            <FieldLabel>Office start</FieldLabel>
            <View style={styles.timeInputWrap}>
              <TextInput
                value={shiftStart}
                onChangeText={setShiftStart}
                placeholder="09:00 AM"
                placeholderTextColor={colors.inputPlaceholder}
                style={styles.timeInput}
              />
              <Pressable onPress={() => openShiftTimePicker('start')}>
                <MaterialCommunityIcons name="clock-outline" size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>
          <View style={styles.timeFieldHalf}>
            <FieldLabel>Office end</FieldLabel>
            <View style={styles.timeInputWrap}>
              <TextInput
                value={shiftEnd}
                onChangeText={setShiftEnd}
                placeholder="06:00 PM"
                placeholderTextColor={colors.inputPlaceholder}
                style={styles.timeInput}
              />
              <Pressable onPress={() => openShiftTimePicker('end')}>
                <MaterialCommunityIcons name="clock-time-eight-outline" size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.timeFormRow}>
          <View style={styles.timeFieldHalf}>
            <FieldLabel>Break start</FieldLabel>
            <View style={styles.timeInputWrap}>
              <TextInput
                value={shiftBreakStart}
                onChangeText={setShiftBreakStart}
                placeholder="Optional"
                placeholderTextColor={colors.inputPlaceholder}
                style={styles.timeInput}
              />
              <Pressable onPress={openShiftBreakStartPicker}>
                <MaterialCommunityIcons name="coffee-outline" size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>
          <View style={styles.timeFieldHalf}>
            <FieldLabel hint={formatBreakDurationLabel(shiftBreakDuration)}>Break length (HH:MM)</FieldLabel>
            <View style={styles.timeInputWrap}>
              <TextInput
                value={shiftBreakDuration}
                onChangeText={setShiftBreakDuration}
                placeholder="01:00"
                placeholderTextColor={colors.inputPlaceholder}
                style={styles.timeInput}
              />
            </View>
          </View>
        </View>

        <FieldLabel>Late mark after (minutes)</FieldLabel>
        <ChipRow options={LATE_MARK_OPTIONS} value={shiftLateAfter} onChange={setShiftLateAfter} suffix="m" />

        <FieldLabel>Clock-in cutoff (minutes)</FieldLabel>
        <ChipRow
          options={CLOCK_IN_CUTOFF_OPTIONS}
          value={shiftClockInCutoff}
          onChange={setShiftClockInCutoff}
          suffix="m"
        />

        <FieldLabel>Grace before start</FieldLabel>
        <ChipRow
          options={GRACE_BEFORE_START_OPTIONS}
          value={shiftGraceBefore}
          onChange={setShiftGraceBefore}
          suffix="m"
        />

        <FieldLabel>Minimum working hours</FieldLabel>
        <ChipRow
          options={MINIMUM_WORKING_HOURS_OPTIONS}
          value={shiftMinHours}
          onChange={setShiftMinHours}
          suffix="h"
        />

        <FieldLabel>Auto checkout after</FieldLabel>
        <ChipRow
          options={AUTO_CHECKOUT_HOURS_OPTIONS}
          value={shiftAutoCheckout}
          onChange={setShiftAutoCheckout}
          suffix="h"
        />
      </View>

      <View style={styles.tcSection}>
        <Text style={styles.tcSectionTitle}>Holidays</Text>
        <View style={styles.timeFormRow}>
          <View style={{ flex: 1 }}>
            <View style={styles.timeInputWrap}>
              <TextInput
                value={shiftHolidayDraft}
                onChangeText={setShiftHolidayDraft}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.inputPlaceholder}
                style={styles.timeInput}
              />
              <Pressable onPress={openHolidayDatePicker}>
                <MaterialCommunityIcons name="calendar-plus" size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
          </View>
          <Pressable style={styles.tcAddHolidayBtn} onPress={addShiftHoliday}>
            <MaterialCommunityIcons name="plus" size={18} color="#fff" />
            <Text style={styles.tcAddHolidayText}>Add</Text>
          </Pressable>
        </View>
        {holidayList.length === 0 ? (
          <Text style={styles.tcFieldHint}>No holidays configured.</Text>
        ) : (
          holidayList.map((iso) => (
            <View key={iso} style={styles.tcHolidayRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.adminMemberName}>{iso}</Text>
                <Text style={styles.adminMemberMeta}>{weekdayLongLabel(iso)}</Text>
              </View>
              <Pressable onPress={() => removeShiftHoliday?.(iso)} hitSlop={8}>
                <MaterialCommunityIcons name="trash-can-outline" size={18} color="#ef4444" />
              </Pressable>
            </View>
          ))
        )}
      </View>

      <View style={styles.tcSection}>
        <Text style={styles.tcSectionTitle}>Policies</Text>
        <View style={styles.tcToggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.adminMemberName}>Shift status</Text>
            <Text style={styles.tcFieldHint}>
              {shiftEnabled ? 'Enabled — employees can clock in' : 'Disabled — shift inactive'}
            </Text>
          </View>
          <Switch
            value={Boolean(shiftEnabled)}
            onValueChange={(v) => toggleShiftEnabled?.(v)}
            trackColor={{ false: '#cbd5e1', true: '#86efac' }}
            thumbColor={shiftEnabled ? '#16a34a' : '#f8fafc'}
          />
        </View>
        <View style={styles.tcToggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.adminMemberName}>Live shift notifications</Text>
            <Text style={styles.tcFieldHint}>Notify when shift status or timing changes</Text>
          </View>
          <Switch
            value={Boolean(liveShiftNotifications)}
            onValueChange={(v) => setLiveShiftNotifications?.(v)}
            trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
            thumbColor={liveShiftNotifications ? '#2563eb' : '#f8fafc'}
          />
        </View>
      </View>

      <View style={styles.timeSaveRow}>
        <Pressable
          style={[styles.timeSaveBtn, shiftSaveLoading && styles.adminPrimaryBtnDisabled]}
          onPress={handleSaveShiftTiming}
          disabled={shiftSaveLoading}>
          {shiftSaveLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <MaterialCommunityIcons name="content-save-outline" size={20} color="#ffffff" />
          )}
          <Text style={styles.timeSaveText}>{shiftSaveLoading ? 'Saving…' : 'Save shift timing'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
