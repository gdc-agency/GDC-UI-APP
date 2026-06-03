import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  downloadAttendanceReportPdf,
  formatAttendanceDuration,
  promptAttendancePdfExport,
} from '@/utils/attendance-export';

import { ClockRecordCard, formatClockDisplayDate } from './clock-record-card';
import { TsColors, timesheetStyles as ts } from './timesheet-styles';
import { TimesheetUserAvatar } from './timesheet-user-avatar';

const MANUAL_STATUS_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'REJECTED', label: 'Rejected' },
];

function formatDateUs(iso) {
  if (!iso) return '';
  const parts = String(iso).slice(0, 10).split('-');
  if (parts.length !== 3) return iso;
  return `${parts[1]}/${parts[2]}/${parts[0]}`;
}

function isoFromDate(d) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseIsoDate(iso) {
  if (!iso) return new Date();
  const d = new Date(`${iso}T12:00:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function openDatePicker(currentIso, onPick) {
  const value = parseIsoDate(currentIso);
  if (Platform.OS === 'android') {
    DateTimePickerAndroid.open({
      value,
      mode: 'date',
      onChange: (_e, selected) => {
        if (selected) onPick(isoFromDate(selected));
      },
    });
  }
}

function roleSubtitle(role, team) {
  const r = String(role || '').trim();
  const t = String(team || '').trim();
  if (r && t && t !== '—') return `${r} • ${t}`;
  return r || t || '—';
}

function normalizeManualStatus(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'approved') return 'Approved';
  if (s === 'rejected') return 'Rejected';
  return 'Pending';
}

function manualStatusStyle(status) {
  const label = normalizeManualStatus(status);
  if (label === 'Approved') return { bg: '#DCFCE7', color: '#15803D', dot: '#22C55E', label };
  if (label === 'Rejected') return { bg: '#FEE2E2', color: '#B91C1C', dot: '#EF4444', label };
  return { bg: '#FFEDD5', color: '#C2410C', dot: '#F59E0B', label };
}

function FilterSelect({ label, value, options, onChange, openKey, setOpenKey, fieldKey, style }) {
  const open = openKey === fieldKey;
  const display = options.find((o) => o.key === value)?.label || value;

  return (
    <View style={[ts.logFilterField, style, { zIndex: open ? 50 : 1 }]}>
      {label ? <Text style={ts.logFilterLabel}>{label}</Text> : null}
      <Pressable style={ts.logFilterInput} onPress={() => setOpenKey(open ? null : fieldKey)}>
        <Text style={display ? ts.logFilterInputText : ts.logFilterInputPlaceholder} numberOfLines={1}>
          {display || 'Select'}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color={TsColors.textMuted} />
      </Pressable>
      {open ? (
        <View style={ts.logDropdownMenu}>
          {options.map((opt) => (
            <Pressable
              key={opt.key}
              style={ts.roleMenuItem}
              onPress={() => {
                onChange(opt.key);
                setOpenKey(null);
              }}
            >
              <Text style={ts.roleMenuItemText}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function DateField({ label, value, onChange }) {
  if (Platform.OS === 'ios') {
    return (
      <View style={ts.logFilterField}>
        <Text style={ts.logFilterLabel}>{label}</Text>
        <View style={ts.logFilterInput}>
          <TextInput
            value={value}
            onChangeText={onChange}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            style={[ts.logFilterInputText, { paddingVertical: 0 }]}
          />
          <MaterialCommunityIcons name="calendar-month-outline" size={18} color={TsColors.textMuted} />
        </View>
      </View>
    );
  }
  return (
    <View style={ts.logFilterField}>
      <Text style={ts.logFilterLabel}>{label}</Text>
      <Pressable style={ts.logFilterInput} onPress={() => openDatePicker(value, onChange)}>
        <Text style={value ? ts.logFilterInputText : ts.logFilterInputPlaceholder}>
          {value ? formatDateUs(value) : 'MM/DD/YYYY'}
        </Text>
        <MaterialCommunityIcons name="calendar-month-outline" size={18} color={TsColors.textMuted} />
      </Pressable>
    </View>
  );
}

function durationForEntry(entry) {
  return entry.durationLabel || formatAttendanceDuration(entry.hours, entry.hours);
}

function MetaTile({ icon, label, value, tone = 'blue' }) {
  const iconColor = tone === 'amber' ? '#F59E0B' : '#3B82F6';
  return (
    <View style={ts.logMetaTile}>
      <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
      <Text style={ts.logMetaTileLbl}>{label}</Text>
      <Text style={ts.logMetaTileVal} numberOfLines={2}>
        {value || '—'}
      </Text>
    </View>
  );
}

function DurationChip({ duration, variant = 'clock' }) {
  const isManual = variant === 'manual';
  return (
    <View style={[ts.logDurationChip, isManual && ts.logDurationChipAmber]}>
      <MaterialCommunityIcons
        name="clock-outline"
        size={15}
        color={isManual ? '#EA580C' : TsColors.blue}
      />
      <Text style={[ts.logDurationChipText, isManual && ts.logDurationChipTextAmber]}>{duration}</Text>
    </View>
  );
}

function StatusChip({ status }) {
  const st = manualStatusStyle(status);
  return (
    <View style={[ts.logStatusChip, { backgroundColor: st.bg }]}>
      <View style={[ts.logStatusDot, { backgroundColor: st.dot }]} />
      <Text style={[ts.logStatusChipText, { color: st.color }]}>{st.label}</Text>
    </View>
  );
}

function TimePanel({ label, time, isIn }) {
  return (
    <View style={ts.logTimePanel}>
      <MaterialCommunityIcons name={isIn ? 'login' : 'logout'} size={22} color={TsColors.blue} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={ts.logTimePanelLbl}>{label}</Text>
        <Text style={ts.logTimePanelVal} numberOfLines={1}>
          {time || '—'}
        </Text>
      </View>
    </View>
  );
}

function ManualRecordCard({ entry }) {
  const name = entry.user?.name || entry.userName || '—';
  const dept = entry.user?.team || entry.department || entry.team || '—';
  const role = entry.user?.role || entry.userRole || '—';
  const avatarUrl = entry.user?.avatarUrl || entry.avatarUrl;
  const duration = durationForEntry(entry);

  return (
    <View style={ts.logRecordCard}>
      <View style={ts.logRecordTop}>
        <TimesheetUserAvatar name={name} avatarUrl={avatarUrl} size={48} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={ts.logRecordName} numberOfLines={1}>
            {name}
          </Text>
          <Text style={ts.logRecordSub} numberOfLines={1}>
            {roleSubtitle(role, dept)}
          </Text>
        </View>
        <View style={ts.logRecordHeaderEnd}>
          <DurationChip duration={duration} variant="manual" />
          <StatusChip status={entry.recordStatus || entry.status} />
        </View>
      </View>

      <View style={[ts.logMetaBar, ts.logMetaBarManual]}>
        <MetaTile icon="card-account-details-outline" label="GDC ID" value={entry.gdcId} tone="amber" />
        <MetaTile icon="calendar-month-outline" label="Date" value={formatClockDisplayDate(entry.date)} tone="amber" />
        <MetaTile icon="clock-outline" label="Duration" value={duration} tone="amber" />
      </View>

      <View style={ts.logInOutRow}>
        <TimePanel label="IN" time={entry.checkIn} isIn />
        <MaterialCommunityIcons name="arrow-right" size={18} color="#94A3B8" />
        <TimePanel label="OUT" time={entry.checkOut} isIn={false} />
      </View>
    </View>
  );
}

/** Clock / manual records — mobile card list (parent ScrollView handles scroll). */
export function TimesheetRecordsView({
  variant,
  records,
  loading,
  token,
  exportQuery = {},
  departmentFilter,
  setDepartmentFilter,
  departmentOptions = [],
  roleFilter,
  setRoleFilter,
  roleOptions = [],
  recordSearch,
  setRecordSearch,
  recordFromDate,
  setRecordFromDate,
  recordToDate,
  setRecordToDate,
  statusFilter,
  setStatusFilter,
}) {
  const [openMenu, setOpenMenu] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const isManual = variant === 'manual';

  const roleSelectOptions = useMemo(
    () => roleOptions.map((r) => ({ key: r, label: r === 'all' ? 'All providers' : r })),
    [roleOptions],
  );

  const deptSelectOptions = useMemo(
    () => departmentOptions.map((d) => ({ key: d, label: d === 'all' ? 'All departments' : d })),
    [departmentOptions],
  );

  const kind = isManual ? 'manual' : 'clock';

  const runPdfExport = (action) => {
    if (!token) {
      Alert.alert('Sign in required', 'Please sign in to download the report.');
      return;
    }
    setPdfLoading(true);
    downloadAttendanceReportPdf(kind, token, exportQuery, action)
      .catch((err) => {
        Alert.alert(
          action === 'save' ? 'Save failed' : 'Export failed',
          err instanceof Error ? err.message : 'Could not export PDF.',
        );
      })
      .finally(() => setPdfLoading(false));
  };

  const onPdfPress = () => {
    if (Platform.OS === 'web') {
      runPdfExport('share');
      return;
    }
    promptAttendancePdfExport(kind, token, exportQuery, setPdfLoading);
  };

  return (
    <>
      <Text style={ts.logScreenTitle}>{isManual ? 'Manual Timesheet' : 'Global attendance log'}</Text>

      <View style={ts.logFilterCard}>
        <View style={ts.logFilterGrid}>
          <FilterSelect
            label="Department"
            value={departmentFilter}
            options={deptSelectOptions}
            onChange={setDepartmentFilter}
            openKey={openMenu}
            setOpenKey={setOpenMenu}
            fieldKey="dept"
          />
          <FilterSelect
            label="Role"
            value={roleFilter}
            options={roleSelectOptions}
            onChange={setRoleFilter}
            openKey={openMenu}
            setOpenKey={setOpenMenu}
            fieldKey="role"
          />
          <DateField label="From" value={recordFromDate} onChange={setRecordFromDate} />
          <DateField label="To" value={recordToDate} onChange={setRecordToDate} />
        </View>

        <View style={ts.logSearchStatusRow}>
          <View style={isManual ? ts.logSearchField70 : ts.logSearchFieldFull}>
            <Text style={ts.logFilterLabel}>Search</Text>
            <View style={ts.logFilterInput}>
              <MaterialCommunityIcons name="magnify" size={18} color={TsColors.textMuted} />
              <TextInput
                value={recordSearch}
                onChangeText={setRecordSearch}
                placeholder="GDC-ID or name"
                placeholderTextColor="#94A3B8"
                style={[ts.logFilterInputText, { paddingVertical: 0 }]}
              />
            </View>
          </View>
          {isManual ? (
            <FilterSelect
              label="Status"
              value={statusFilter}
              options={MANUAL_STATUS_OPTIONS}
              onChange={setStatusFilter}
              openKey={openMenu}
              setOpenKey={setOpenMenu}
              fieldKey="status"
              style={ts.logStatusField30}
            />
          ) : null}
        </View>

      </View>

      <View style={ts.logExportBar}>
        <Pressable
          style={[ts.logPdfBtn, pdfLoading && ts.logPdfBtnDisabled]}
          onPress={onPdfPress}
          disabled={pdfLoading}
        >
          {pdfLoading ? (
            <ActivityIndicator color={TsColors.blue} size="small" />
          ) : (
            <MaterialCommunityIcons name="share-variant" size={20} color={TsColors.blue} />
          )}
          <Text style={[ts.logPdfBtnText, { color: TsColors.blue }]}>
            {pdfLoading ? 'Please wait…' : 'Share PDF'}
          </Text>
        </Pressable>
        {Platform.OS !== 'web' ? (
          <Pressable
            style={[ts.logPdfBtn, ts.logPdfBtnSecondary, pdfLoading && ts.logPdfBtnDisabled]}
            onPress={() => runPdfExport('save')}
            disabled={pdfLoading}
          >
            <MaterialCommunityIcons name="content-save" size={20} color="#DC2626" />
            <Text style={[ts.logPdfBtnText, { color: '#DC2626' }]}>Save</Text>
          </Pressable>
        ) : null}
      </View>

      {!loading && records.length > 0 ? (
        <View style={ts.logListHeader}>
          <Text style={ts.logListHeaderText}>{isManual ? 'Manual records' : 'Clock records'}</Text>
          <MaterialCommunityIcons name="format-list-bulleted" size={18} color="rgba(255,255,255,0.9)" />
        </View>
      ) : null}

      {loading ? (
        <View style={ts.emptyBox}>
          <ActivityIndicator color={TsColors.blue} />
          <Text style={[ts.emptyText, { marginTop: 10 }]}>Loading records…</Text>
        </View>
      ) : records.length === 0 ? (
        <View style={ts.emptyBox}>
          <MaterialCommunityIcons name="clipboard-text-off-outline" size={40} color="#CBD5E1" />
          <Text style={[ts.emptyText, { marginTop: 12 }]}>
            {isManual ? 'No manual timesheet records found.' : 'No clock records found.'}
          </Text>
        </View>
      ) : (
        <View>
          {records.map((entry) =>
            isManual ? (
              <ManualRecordCard key={entry.id} entry={entry} />
            ) : (
              <ClockRecordCard key={entry.id} entry={entry} />
            ),
          )}
        </View>
      )}
    </>
  );
}
