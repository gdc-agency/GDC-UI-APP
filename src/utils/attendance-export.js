import { getAttendanceApiBaseUrl } from '@/data/constants/api-config';
import {
  StorageAccessFramework,
  cacheDirectory,
  deleteAsync,
  documentDirectory,
  downloadAsync,
  getContentUriAsync,
  getInfoAsync,
  makeDirectoryAsync,
  readAsStringAsync,
} from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert, Linking, Platform } from 'react-native';

/**
 * Show duration like backend PDF: minutes if under 1 hour, else hours (optional minutes).
 * @param {number} hoursDecimal
 * @param {string} [rawLabel]
 */
export function formatAttendanceDuration(hoursDecimal, rawLabel) {
  const raw = String(rawLabel || '').trim();
  if (raw && /^\d+\s*m$/i.test(raw)) return raw.replace(/\s+/g, '');
  if (raw && /\d+\s*h/i.test(raw)) return raw.replace(/\s+/g, ' ').trim();

  const h = Number(hoursDecimal);
  if (!Number.isFinite(h) || h <= 0) return '0m';
  if (h < 1) {
    const mins = Math.max(1, Math.round(h * 60));
    return `${mins}m`;
  }
  const wholeH = Math.floor(h);
  const mins = Math.round((h - wholeH) * 60);
  if (mins === 0) return `${wholeH}h`;
  return `${wholeH}h ${mins}m`;
}

/**
 * @param {Record<string, string | undefined>} query
 */
export function buildAttendanceExportQueryString(query) {
  const params = new URLSearchParams();
  params.set('format', 'pdf');
  Object.entries(query).forEach(([key, value]) => {
    const v = value != null ? String(value).trim() : '';
    if (v) params.set(key, v);
  });
  return params.toString();
}

/**
 * @param {'clock' | 'manual'} kind
 * @param {Record<string, string | undefined>} query
 */
export function buildAttendanceExportUrl(kind, query = {}) {
  const base = getAttendanceApiBaseUrl();
  const path = kind === 'manual' ? '/api/manual-timesheet/export' : '/api/clock-records/export';
  const qs = buildAttendanceExportQueryString(query);
  return `${base}${path}?${qs}`;
}

/** @param {string} fileUri */
async function ensurePdfFile(fileUri) {
  const info = await getInfoAsync(fileUri);
  if (!info.exists) {
    throw new Error('PDF file was not saved on this device.');
  }
  if ((info.size ?? 0) < 80) {
    throw new Error('Downloaded file is too small. Try different filters or check the server.');
  }
  return fileUri;
}

/**
 * Download PDF to app storage (native binary download — no base64 conversion).
 * @param {string} url
 * @param {string} token
 * @param {string} filename
 */
async function downloadPdfToAppStorage(url, token, filename) {
  const root = documentDirectory || cacheDirectory;
  if (!root) throw new Error('File storage is not available on this device.');

  const dir = `${root}attendance-exports/`;
  await makeDirectoryAsync(dir, { intermediates: true });
  const dest = `${dir}${filename}`;

  try {
    const prev = await getInfoAsync(dest);
    if (prev.exists) await deleteAsync(dest, { idempotent: true });
  } catch {
    /* ignore */
  }

  const download = await downloadAsync(url, dest, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/pdf, application/octet-stream',
    },
  });

  if (download.status && download.status !== 200) {
    throw new Error(`Download failed (HTTP ${download.status}).`);
  }

  const localUri = download.uri || dest;
  return ensurePdfFile(localUri);
}

/** Share / open PDF (works on iOS + Android). */
async function shareLocalPdf(localUri) {
  if (!(await Sharing.isAvailableAsync())) {
    if (Platform.OS === 'android') {
      const contentUri = await getContentUriAsync(localUri);
      await Linking.openURL(contentUri);
      return;
    }
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(localUri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Attendance report',
    UTI: 'com.adobe.pdf',
  });
}

/**
 * Android: let user pick Downloads (or any folder) and save PDF there.
 * @param {string} localUri
 * @param {string} filename
 */
async function savePdfToUserFolderAndroid(localUri, filename) {
  const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permissions.granted) {
    throw new Error('Folder access was denied. Choose a folder to save the PDF.');
  }

  const base64 = await readAsStringAsync(localUri, { encoding: 'base64' });
  const nameBase = filename.replace(/\.pdf$/i, '') || 'attendance_report';

  const outUri = await StorageAccessFramework.createFileAsync(
    permissions.directoryUri,
    nameBase,
    'application/pdf',
  );

  await StorageAccessFramework.writeAsStringAsync(outUri, base64, { encoding: 'base64' });
}

/**
 * @param {'clock' | 'manual'} kind
 * @param {string} token
 * @param {Record<string, string | undefined>} query
 * @param {'share' | 'save'} [action]
 */
export async function downloadAttendanceReportPdf(kind, token, query = {}, action = 'share') {
  if (!token) {
    throw new Error('You must be signed in to download reports.');
  }

  const url = buildAttendanceExportUrl(kind, query);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = kind === 'manual' ? `manual_timesheet_${stamp}.pdf` : `clock_records_${stamp}.pdf`;

  if (Platform.OS === 'web') {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/pdf' },
    });
    if (!res.ok) {
      let msg = `Download failed (${res.status})`;
      try {
        const j = await res.json();
        if (j?.message) msg = j.message;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(blobUrl);
    return { filename, action: 'web' };
  }

  const localUri = await downloadPdfToAppStorage(url, token, filename);

  if (action === 'save') {
    if (Platform.OS === 'android') {
      await savePdfToUserFolderAndroid(localUri, filename);
      Alert.alert('Saved', 'PDF saved to the folder you selected.');
      return { uri: localUri, filename, action: 'save' };
    }
    await shareLocalPdf(localUri);
    return { uri: localUri, filename, action: 'save-ios' };
  }

  await shareLocalPdf(localUri);
  return { uri: localUri, filename, action: 'share' };
}

/** Mobile: ask Share vs Save to folder. */
export function promptAttendancePdfExport(kind, token, query, onLoadingChange) {
  if (Platform.OS === 'web') {
    onLoadingChange?.(true);
    downloadAttendanceReportPdf(kind, token, query, 'share')
      .catch((err) => {
        Alert.alert('PDF export failed', err instanceof Error ? err.message : 'Could not export PDF.');
      })
      .finally(() => onLoadingChange?.(false));
    return;
  }

  Alert.alert('Export PDF', 'How do you want to export?', [
    {
      text: 'Share / Open',
      onPress: () => {
        onLoadingChange?.(true);
        downloadAttendanceReportPdf(kind, token, query, 'share')
          .catch((err) => {
            Alert.alert(
              'Export failed',
              err instanceof Error ? err.message : 'Could not open PDF.',
            );
          })
          .finally(() => onLoadingChange?.(false));
      },
    },
    {
      text: Platform.OS === 'android' ? 'Save to folder' : 'Save to Files',
      onPress: () => {
        onLoadingChange?.(true);
        downloadAttendanceReportPdf(kind, token, query, 'save')
          .catch((err) => {
            Alert.alert(
              'Save failed',
              err instanceof Error ? err.message : 'Could not save PDF.',
            );
          })
          .finally(() => onLoadingChange?.(false));
      },
    },
    { text: 'Cancel', style: 'cancel' },
  ]);
}
