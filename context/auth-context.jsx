import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

const DEMO_USERS = [
  {
    email: 'admin@gdc.com',
    password: 'Admin@123',
    name: 'System Admin',
    role: 'Admin',
  },
  {
    email: 'teamleader@gdc.com',
    password: 'TL@123',
    name: 'Team Leader',
    role: 'Team Leader',
  },
  {
    email: 'hr@gdc.com',
    password: 'HR@123',
    name: 'HR Manager',
    role: 'HR',
  },
  {
    email: 'employee@gdc.com',
    password: 'Emp@123',
    name: 'Employee User',
    role: 'Employee',
  },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const signIn = useCallback(async (email, password) => {
    const em = String(email || '').trim();
    const pw = String(password || '');
    if (!em) return { ok: false, error: 'Email is required.' };
    if (!isValidEmail(em)) return { ok: false, error: 'Enter a valid email address.' };
    if (!pw.trim()) return { ok: false, error: 'Password is required.' };
    const matched = DEMO_USERS.find((u) => u.email.toLowerCase() === em.toLowerCase() && u.password === pw);
    if (!matched) {
      return { ok: false, error: 'Invalid credentials. Use one of the demo role accounts.' };
    }

    setUser({
      id: `local-${matched.role.toLowerCase().replace(/\s+/g, '-')}`,
      email: matched.email,
      name: matched.name,
      role: matched.role,
    });
    return { ok: true, role: matched.role };
  }, []);

  const signOut = useCallback(() => setUser(null), []);

  const value = useMemo(() => ({ user, signIn, signOut }), [user, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
