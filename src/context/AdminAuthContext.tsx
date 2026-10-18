import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { checkAdminStatus, adminLogin, adminSetup, adminLogout } from '../services/api';

interface AdminAuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  isConfigured: boolean;
  adminUsername: string | null;
  loading: boolean;
  login: (u: string, p: string) => Promise<void>;
  setup: (u: string, p: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const TOKEN_KEY = 'apphaven_admin_token';

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isConfigured, setIsConfigured] = useState<boolean>(true);
  const [adminUsername, setAdminUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshStatus = useCallback(async () => {
    try {
      const currentToken = sessionStorage.getItem(TOKEN_KEY);
      const status = await checkAdminStatus(currentToken);
      setIsConfigured(status.isConfigured);
      setIsAuthenticated(status.isAuthenticated);
      setAdminUsername(status.adminUsername);
      if (!status.isAuthenticated && currentToken) {
        sessionStorage.removeItem(TOKEN_KEY);
        setToken(null);
      }
    } catch (err) {
      console.error('Failed to verify admin status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const login = async (u: string, p: string) => {
    const res = await adminLogin(u, p);
    if (res.token) {
      sessionStorage.setItem(TOKEN_KEY, res.token);
      setToken(res.token);
      setIsAuthenticated(true);
      setAdminUsername(res.username);
    }
  };

  const setup = async (u: string, p: string) => {
    const res = await adminSetup(u, p);
    if (res.token) {
      sessionStorage.setItem(TOKEN_KEY, res.token);
      setToken(res.token);
      setIsAuthenticated(true);
      setIsConfigured(true);
      setAdminUsername(res.username);
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await adminLogout(token);
      } catch {
        // ignore logout errors
      }
    }
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setIsAuthenticated(false);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        token,
        isAuthenticated,
        isConfigured,
        adminUsername,
        loading,
        login,
        setup,
        logout,
        refreshStatus,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return context;
}
