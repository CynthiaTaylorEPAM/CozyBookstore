import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import { api, tokenStore } from './api';
import type { Staff } from './types';

interface AuthState {
  staff: Staff | null;
  isOwner: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null);
  const [checking, setChecking] = useState(Boolean(tokenStore.get()));

  // On page load, ask the gateway who the saved token belongs to.
  useEffect(() => {
    if (!tokenStore.get()) return;
    api<Staff>('/auth/me')
      .then(setStaff)
      .catch(() => tokenStore.clear())
      .finally(() => setChecking(false));
  }, []);

  async function login(username: string, password: string) {
    const result = await api<{ token: string; staff: Staff }>('/auth/login', {
      method: 'POST',
      body: { username, password },
    });
    tokenStore.set(result.token);
    setStaff(result.staff);
  }

  function logout() {
    tokenStore.clear();
    setStaff(null);
  }

  if (checking) return null;
  return (
    <AuthContext.Provider value={{ staff, isOwner: staff?.role === 'owner', login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
