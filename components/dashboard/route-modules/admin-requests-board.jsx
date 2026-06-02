import MaterialCommunityIcons from '@/components/ui/material-community-icons';
import React from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { PrettyRequestCard } from './pretty-request-card';
import { RqColors, requestStyles as rq } from './request-styles';

// Status pills removed (replaced by dropdown).

export function AdminRequestsBoard({
  isManualTab,
  leaveStatusFilter,
  setLeaveStatusFilter,
  manualStatusFilter,
  setManualStatusFilter,
  requestAdminSearch,
  setRequestAdminSearch,
  filteredAdminLeaveRequests,
  filteredAdminManualRequests,
  updateLeaveStatus,
  updateManualStatus,
  openRejectModal,
}) {
  const { width } = useWindowDimensions();
  const isSmallMobile = width < 380;
  const isNativeMobile = Platform.OS !== 'web';
  const [statusMenuOpen, setStatusMenuOpen] = React.useState(false);
  const statusFilter = isManualTab ? manualStatusFilter : leaveStatusFilter;
  const setStatusFilter = isManualTab ? setManualStatusFilter : setLeaveStatusFilter;
  const requests = isManualTab ? filteredAdminManualRequests : filteredAdminLeaveRequests;

  return (
    <View style={rq.contentCard}>
        <View style={rq.listHead}>
          <Text style={rq.listTitle}>{isManualTab ? 'Manual Time Requests' : 'Leave Requests'}</Text>
        </View>

        <View style={rq.statusFilterRow}>
          <View
            style={[
              rq.statusSearchWrap,
              isNativeMobile && { flexGrow: 62, flexShrink: 1, flexBasis: 0 }, // 62%
            ]}
          >
            <View style={[rq.searchWrap, isNativeMobile && { height: 44, paddingVertical: 0 }]}>
              <MaterialCommunityIcons name="magnify" size={20} color="#94A3B8" />
              <TextInput
                value={requestAdminSearch}
                onChangeText={setRequestAdminSearch}
                placeholder="Search by name, role or type..."
                placeholderTextColor="#94A3B8"
                style={rq.searchInput}
              />
            </View>
          </View>
          <View
            style={[
              rq.statusDropdownWrap,
              isNativeMobile && { flexGrow: 38, flexShrink: 1, flexBasis: 0, minWidth: 0 }, // 38%
            ]}
          >
            <Pressable style={rq.statusDropdownBtn} onPress={() => setStatusMenuOpen((v) => !v)}>
              <Text style={rq.statusDropdownText} numberOfLines={1}>
                {statusFilter}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={18} color="#94A3B8" />
            </Pressable>
            {statusMenuOpen ? (
              <View style={rq.statusDropdownMenu}>
                {['All', 'Pending', 'Approved', 'Rejected'].map((st, idx, arr) => {
                  const active = statusFilter === st;
                  return (
                    <Pressable
                      key={st}
                      onPress={() => {
                        setStatusFilter(st);
                        setStatusMenuOpen(false);
                      }}
                      style={[
                        rq.statusDropdownOption,
                        idx === arr.length - 1 && rq.statusDropdownOptionLast,
                        active && rq.statusDropdownOptionActive,
                      ]}
                    >
                      <Text style={[rq.statusDropdownOptionText, active && rq.statusDropdownOptionTextActive]}>{st}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        </View>

        {requests.length === 0 ? (
          <View style={rq.emptyBox}>
            <Text style={rq.emptyText}>No requests match filters.</Text>
          </View>
        ) : (
          requests.map((req) => (
            <PrettyRequestCard
              key={req.id}
              req={req}
              isManual={isManualTab}
              showActions
              onApprove={() => (isManualTab ? updateManualStatus(req.id, 'Approved') : updateLeaveStatus(req.id, 'Approved'))}
              onReject={() => (isManualTab ? updateManualStatus(req.id, 'Rejected') : updateLeaveStatus(req.id, 'Rejected'))}
              onOpenReject={() => openRejectModal(req.id, isManualTab ? 'manual' : 'leave')}
            />
          ))
        )}
    </View>
  );
}
