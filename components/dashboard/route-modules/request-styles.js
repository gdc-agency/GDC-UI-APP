import { Platform, StyleSheet } from 'react-native';

import { getRqColors } from '@/constants/themed-palettes';
import { lightTheme } from '@/constants/themes';

/** @param {import('@/constants/themes').AppThemeColors} c */
export function createRequestStyles(c) {
  const RqColors = getRqColors(c);
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: RqColors.bg },
  scroll: { paddingHorizontal: 12, paddingBottom: 120, paddingTop: 8 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: RqColors.blue,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: RqColors.heroIconBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextWrap: { flex: 1 },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: c.heroText,
    letterSpacing: -0.3,
  },
  heroSub: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
  },
  tabsCard: {
    backgroundColor: RqColors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: RqColors.inputBorder,
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 14,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: RqColors.pillTrackBg,
    borderRadius: 999,
    padding: 4,
    gap: 6,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 999,
  },
  tabBtnActive: {
    backgroundColor: RqColors.tabActiveBg,
    borderWidth: 1,
    borderColor: RqColors.chipActiveBorder,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: RqColors.textMuted,
  },
  tabTextActive: {
    color: RqColors.blue,
    fontWeight: '700',
  },
  // tabsActiveCaption removed (caption text hidden per UI spec)
  contentCard: {
    backgroundColor: RqColors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: RqColors.dividerSoft,
    padding: 16,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  listHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  listTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: RqColors.text,
    flex: 1,
  },
  createBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: RqColors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: RqColors.inputBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: RqColors.inputBorder,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: RqColors.text,
    paddingVertical: 10,
  },
  filterIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: RqColors.inputBorder,
    backgroundColor: RqColors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 2,
    marginBottom: 10,
  },
  pillsRowCompact: {
    gap: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: RqColors.inputBorder,
    backgroundColor: RqColors.chipBg,
  },
  pillCompact: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
  },
  pillActive: {
    backgroundColor: RqColors.chipActiveBg,
    borderColor: RqColors.chipActiveBorder,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: RqColors.text,
  },
  pillTextCompact: {
    fontSize: 12,
  },
  pillTextActive: {
    color: RqColors.chipActiveText,
    fontWeight: '700',
  },
  hint: {
    fontSize: 12,
    color: RqColors.textMuted,
    marginBottom: 12,
  },
  statusFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  statusSearchWrap: {
    flexGrow: 3,
    flexShrink: 1,
    flexBasis: 0,
  },
  statusDropdownWrap: {
    flexGrow: 1,
    flexShrink: 0,
    flexBasis: 0,
    minWidth: 96,
    position: 'relative',
    zIndex: 20,
  },
  statusDropdownBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: RqColors.inputBorder,
    backgroundColor: RqColors.inputBg,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusDropdownText: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    fontWeight: '800',
    color: RqColors.text,
  },
  statusDropdownMenu: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderColor: RqColors.inputBorder,
    borderRadius: 12,
    backgroundColor: RqColors.dropdownBg,
    overflow: 'hidden',
  },
  statusDropdownOption: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: RqColors.divider,
  },
  statusDropdownOptionLast: { borderBottomWidth: 0 },
  statusDropdownOptionActive: { backgroundColor: RqColors.chipActiveBg },
  statusDropdownOptionText: { fontSize: 12, fontWeight: '700', color: RqColors.textMuted },
  statusDropdownOptionTextActive: { color: RqColors.chipActiveText, fontWeight: '800' },
  reqCard: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: RqColors.dividerSoft,
    backgroundColor: RqColors.surfaceElevated,
    marginBottom: 12,
    overflow: 'hidden',
  },
  reqStripe: {
    width: 4,
  },
  reqBody: {
    flex: 1,
    padding: 12,
    paddingLeft: 10,
  },
  reqTop: {
    flexDirection: 'row',
    gap: 12,
  },
  reqMain: {
    flex: 1,
    minWidth: 0,
  },
  reqName: {
    fontSize: 16,
    fontWeight: '800',
    color: RqColors.text,
  },
  reqRoleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  reqRole: {
    fontSize: 12,
    color: RqColors.textMuted,
    fontWeight: '500',
  },
  reqMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
  },
  reqMetaText: {
    flex: 1,
    fontSize: 12,
    color: RqColors.textMuted,
    lineHeight: 17,
  },
  reqMetaLabel: {
    fontWeight: '700',
    color: RqColors.textMuted,
  },
  reqRight: { alignItems: 'flex-end', gap: 8, maxWidth: 150 },
  reqDateBlock: {
    alignItems: 'flex-end',
  },
  reqDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reqDateText: {
    fontSize: 11,
    fontWeight: '600',
    color: RqColors.text,
    textAlign: 'right',
  },
  // reqDays removed (day count hidden per UI spec)
  reqStatusCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // statusTime removed (approved/rejected timestamp hidden per UI spec)
  reqActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: RqColors.divider,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: RqColors.green,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: RqColors.red,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionBtnText: {
    color: RqColors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  rejectBox: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: RqColors.redBg,
    borderWidth: 1,
    borderColor: RqColors.red,
  },
  rejectTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: RqColors.redText,
  },
  rejectText: {
    marginTop: 2,
    fontSize: 12,
    color: RqColors.redText,
  },
  emptyBox: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: RqColors.textMuted,
  },
});

}

export function requestStripeColor(status, rq = getRqColors(lightTheme)) {
  if (status === 'Approved') return rq.green;
  if (status === 'Rejected') return rq.red;
  return rq.amber;
}

export function requestStatusStyle(status, rq = getRqColors(lightTheme)) {
  if (status === 'Approved') {
    return { bg: rq.greenBg, color: rq.greenText, icon: 'check-circle' };
  }
  if (status === 'Rejected') {
    return { bg: rq.redBg, color: rq.redText, icon: 'close-circle' };
  }
  return { bg: rq.amberBg, color: rq.amberText, icon: 'clock-outline' };
}
