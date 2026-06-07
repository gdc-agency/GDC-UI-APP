import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { login as apiLogin } from '@/data/api/auth-api';
import { getProfile as apiGetProfile } from '@/data/api/profile-api';

const AuthContext = createContext(null);

const STORAGE_TOKEN = 'gdc_auth_token';
const STORAGE_USER = 'gdc_auth_user';

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

/** Keep one canonical dashboard role label (matches login `toFrontendRole`). */
function normalizeDisplayRole(role) {
  const r = String(role ?? 'Employee')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
  if (r === 'admin') return 'Admin';
  if (r === 'hr') return 'HR';
  if (r === 'team_leader' || r === 'teamleader') return 'Team Leader';
  if (r === 'pending') return 'Pending User';
  if (r === 'employee') return 'Employee';
  return typeof role === 'string' && role.trim() ? role.trim() : 'Employee';
}

/** Map login / profile payload to a single app user shape */
function normalizeUser(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const u = raw;
  return {
    id: u.id != null ? String(u.id) : '',
    email: u.email ?? '',
    name: u.name ?? '',
    role: normalizeDisplayRole(u.role),
    department: u.department ?? null,
    phone: u.phone ?? null,
    gdc_id: u.gdc_id ?? null,
    avatar: u.avatar ?? u.profile_image ?? null,
    team_name: u.team_name ?? null,
    work_site: u.work_site ?? null,
    cnic: u.cnic ?? null,
    address: u.address ?? null,
    team_id: u.team_id ?? null,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [t, json] = await Promise.all([AsyncStorage.getItem(STORAGE_TOKEN), AsyncStorage.getItem(STORAGE_USER)]);
        if (cancelled) return;
        if (t && json) {
          setToken(t);
          try {
            setUser(JSON.parse(json));
          } catch {
            setUser(null);
            setToken(null);
            await AsyncStorage.multiRemove([STORAGE_TOKEN, STORAGE_USER]);
          }
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistSession = useCallback(async (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    if (nextToken && nextUser) {
      await AsyncStorage.multiSet([
        [STORAGE_TOKEN, nextToken],
        [STORAGE_USER, JSON.stringify(nextUser)],
      ]);
    } else {
      await AsyncStorage.multiRemove([STORAGE_TOKEN, STORAGE_USER]);
    }
  }, []);

  const signIn = useCallback(async (email, password) => {
    const em = String(email || '').trim();
    const pw = String(password || '');
    if (!em) return { ok: false, error: 'Email is required.' };
    if (!isValidEmail(em)) return { ok: false, error: 'Enter a valid email address.' };
    if (!pw.trim()) return { ok: false, error: 'Password is required.' };

    try {
      const data = await apiLogin({ email: em, password: pw });
      const t = data?.token;
      const u = normalizeUser(data?.user);
      if (!t || !u) {
        return { ok: false, error: 'Invalid response from server (missing token or user).' };
      }
      await persistSession(t, u);
      return { ok: true, role: u.role };
    } catch (e) {
      const msg = e?.message || 'Login failed. Check API URL and credentials.';
      return { ok: false, error: msg };
    }
  }, [persistSession]);

  const signOut = useCallback(async () => {
    await persistSession(null, null);
  }, [persistSession]);

  /**
   * Apply `user` row from PUT /api/profile/updateProfile (RETURNING *) so avatar updates even if
   * a follow-up GET fails (network, parse shape). Does not touch the token.
   */
  const mergeFromServerUserRow = useCallback((row) => {
    if (!row || typeof row !== 'object') return;
    setUser((prev) => {
      if (!prev) return prev;
      const merged = normalizeUser({
        id: prev.id,
        role: row.role ?? prev.role,
        name: row.name ?? prev.name,
        email: row.email ?? prev.email,
        phone: row.phone ?? prev.phone,
        department: row.department ?? prev.department,
        gdc_id: row.gdc_id ?? prev.gdc_id,
        cnic: row.cnic ?? prev.cnic,
        address: row.address ?? prev.address,
        avatar: row.profile_image ?? row.avatar ?? prev.avatar ?? null,
        team_name: row.team_name ?? prev.team_name,
        work_site: row.work_site ?? prev.work_site,
        team_id: row.team_id ?? prev.team_id,
      });
      if (merged) {
        void AsyncStorage.setItem(STORAGE_USER, JSON.stringify(merged));
      }
      return merged;
    });
  }, []);

  /** Refresh user from GET /api/profile/getProfile (merges into session). */
  const refreshProfile = useCallback(async () => {
    if (!token) return { ok: false, error: 'Not signed in' };
    try {
      const row = await apiGetProfile(token);
      if (!row || typeof row !== 'object') {
        return { ok: false, error: 'Invalid or empty profile response' };
      }
      setUser((prev) => {
        const merged = normalizeUser({
          id: prev?.id ?? '',
          role: prev?.role ?? 'Employee',
          name: row.name ?? prev?.name ?? '',
          email: row.email ?? prev?.email ?? '',
          phone: row.phone ?? prev?.phone ?? null,
          department: row.department ?? prev?.department ?? null,
          gdc_id: row.gdc_id ?? prev?.gdc_id ?? null,
          cnic: row.cnic ?? prev?.cnic ?? null,
          address: row.address ?? prev?.address ?? null,
          avatar: row.profile_image ?? row.avatar ?? prev?.avatar ?? null,
          team_name: row.team_name ?? prev?.team_name ?? null,
          work_site: row.work_site ?? prev?.work_site ?? null,
          team_id: row.team_id ?? prev?.team_id ?? null,
        });
        if (merged) {
          void AsyncStorage.setItem(STORAGE_USER, JSON.stringify(merged));
        }
        return merged;
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message || 'Profile fetch failed' };
    }
  }, [token]);

  const value = useMemo(
    () => ({
      user,
      token,
      hydrated,
      signIn,
      signOut,
      refreshProfile,
      mergeFromServerUserRow,
    }),
    [user, token, hydrated, signIn, signOut, refreshProfile, mergeFromServerUserRow],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
