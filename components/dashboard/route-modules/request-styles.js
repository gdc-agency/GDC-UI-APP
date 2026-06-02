import { Platform, StyleSheet } from 'react-native';

export const RqColors = {
  blue: '#2563EB',
  green: '#16A34A',
  greenBg: '#DCFCE7',
  greenText: '#15803D',
  red: '#DC2626',
  redBg: '#FEE2E2',
  redText: '#B91C1C',
  amber: '#F59E0B',
  amberBg: '#FEF3C7',
  amberText: '#B45309',
  bg: '#F1F5F9',
  card: '#FFFFFF',
  text: '#0F172A',
  textMuted: '#64748B',
  white: '#FFFFFF',
  border: '#E5E7EB',
};

export const requestStyles = StyleSheet.create({
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
    backgroundColor: RqColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextWrap: { flex: 1 },
  heroTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: RqColors.white,
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
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 14,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
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
    borderColor: '#E8EDF3',
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
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
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
    borderColor: '#E2E8F0',
    backgroundColor: RqColors.white,
  },
  pillCompact: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
  },
  pillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
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
    color: RqColors.blue,
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
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
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
    color: '#334155',
  },
  statusDropdownMenu: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  statusDropdownOption: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  statusDropdownOptionLast: { borderBottomWidth: 0 },
  statusDropdownOptionActive: { backgroundColor: '#EFF6FF' },
  statusDropdownOptionText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  statusDropdownOptionTextActive: { color: RqColors.blue, fontWeight: '800' },
  reqCard: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8EDF3',
    backgroundColor: RqColors.white,
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
    color: '#475569',
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
    borderTopColor: '#F1F5F9',
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
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: RqColors.redText,
  },
  rejectText: {
    marginTop: 2,
    fontSize: 12,
    color: '#7F1D1D',
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

export function requestStripeColor(status) {
  if (status === 'Approved') return RqColors.green;
  if (status === 'Rejected') return RqColors.red;
  return RqColors.amber;
}

export function requestStatusStyle(status) {
  if (status === 'Approved') {
    return { bg: RqColors.greenBg, color: RqColors.greenText, icon: 'check-circle' };
  }
  if (status === 'Rejected') {
    return { bg: RqColors.redBg, color: RqColors.redText, icon: 'close-circle' };
  }
  return { bg: RqColors.amberBg, color: RqColors.amberText, icon: 'clock-outline' };
}
