import { useState, useCallback, useEffect, type ReactNode } from 'react';
import api, { storeTokens, clearTokens, getStoredToken } from '@/shared/api/client';
import type { AuthResponse, UserResponse } from '@/shared/types/api';
import { AuthContext, type AuthContextType } from './AuthContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore user from stored token on mount
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored && getStoredToken()) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        clearTokens();
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<AuthResponse>('/auth/login', { email, password });
    storeTokens(data.accessToken, data.refreshToken);
    setUser(data.user);
    localStorage.setItem('user', JSON.stringify(data.user));
  }, []);

  const register = useCallback(
    async (email: string, password: string, firstName?: string, lastName?: string) => {
      const { data } = await api.post<AuthResponse>('/auth/register', {
        email,
        password,
        firstName,
        lastName,
      });
      storeTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      localStorage.setItem('user', JSON.stringify(data.user));
    },
    [],
  );

  const logout = useCallback(() => {
    api.post('/auth/logout').catch(() => {});
    clearTokens();
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    register,
    logout,
  };

  if (loading) return null;

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
