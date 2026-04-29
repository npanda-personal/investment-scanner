import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchMe, loadStoredToken, login as loginApi, logout as logoutApi, signup as signupApi, updateProfile } from '../api/authIdentityService';
import type { AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
  reload: () => Promise<void>;
  setError: (error: string | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthIdentityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const token = loadStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setUser(await fetchMe());
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const response = await loginApi({ email, password });
      setUser(response.user);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Login failed');
      throw err;
    }
  };

  const signup = async (email: string, password: string, name?: string) => {
    setError(null);
    try {
      const response = await signupApi({ email, password, name });
      setUser(response.user);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Signup failed');
      throw err;
    }
  };

  const logout = async () => {
    await logoutApi();
    setUser(null);
  };

  const updateName = async (name: string) => {
    setUser(await updateProfile({ name }));
  };

  const value = useMemo(() => ({ user, loading, error, login, signup, logout, updateName, reload, setError }), [user, loading, error, reload]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuthIdentity() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthIdentity must be used within AuthIdentityProvider');
  return context;
}
