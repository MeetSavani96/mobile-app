import React, { createContext, useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';
import type { AuthUser } from '../types/auth';

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; message?: string; status?: number; isNetworkError?: boolean }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string; message?: string; status?: number; isNetworkError?: boolean }>;
  loginDemo: (role?: 'customer' | 'admin') => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone: string;
  city?: string;
  address?: string;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const DEMO_CUSTOMER_USER: AuthUser = {
  id: 999,
  name: 'Demo Customer',
  email: 'demo@akvenergy.com',
  role: 'customer',
  phone: '9537661151',
  city: 'Surat',
  address: '1st Floor, Nagnath Society, Katargam, Surat, Gujarat - 395004',
  status: 'registered',
  akv_customer_id: null,
  is_akv_customer: false,
};

const DEMO_ADMIN_USER: AuthUser = {
  id: 1,
  name: 'AKV Admin (Demo)',
  email: 'admin@akvenergy.com',
  role: 'admin',
  phone: '9537661151',
  city: 'Surat',
  address: 'AKV Energy HQ, Surat, Gujarat',
  status: 'registered',
  akv_customer_id: null,
  is_akv_customer: false,
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const cachedToken = localStorage.getItem('akv_session_id') || localStorage.getItem('akv_token');
      const cachedUser = localStorage.getItem('akv_user');

      if (cachedToken && cachedUser) {
        try {
          setToken(cachedToken);
          setUser(JSON.parse(cachedUser));
        } catch {
          localStorage.removeItem('akv_session_id');
          localStorage.removeItem('akv_token');
          localStorage.removeItem('akv_user');
        }
      }

      // Verify session integrity with server if not a demo token
      if (cachedToken && !cachedToken.startsWith('demo-session-token')) {
        const result = await apiFetch('session');
        if (result.ok && result.data && result.data.user) {
          const freshUser = result.data.user;
          setUser(freshUser);
          localStorage.setItem('akv_user', JSON.stringify(freshUser));
        } else if (result.status === 401 || result.status === 403) {
          // Only invalidate token if server explicitly rejected the credentials
          localStorage.removeItem('akv_session_id');
          localStorage.removeItem('akv_token');
          localStorage.removeItem('akv_user');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const result = await apiFetch('login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (result.ok && result.data && result.data.success) {
      const jwtToken = result.data.token;
      const loggedUser = result.data.user;

      localStorage.setItem('akv_session_id', jwtToken);
      localStorage.setItem('akv_token', jwtToken);
      localStorage.setItem('akv_user', JSON.stringify(loggedUser));
      setToken(jwtToken);
      setUser(loggedUser);
      return { success: true, status: result.status };
    }

    return { 
      success: false, 
      error: result.error || 'Login failed.',
      message: result.message || 'Login failed.',
      status: result.status,
      isNetworkError: result.isNetworkError
    };
  };

  const register = async (data: RegisterData) => {
    const result = await apiFetch('register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (result.ok && result.data && result.data.success) {
      const jwtToken = result.data.token;
      const loggedUser = result.data.user;

      localStorage.setItem('akv_session_id', jwtToken);
      localStorage.setItem('akv_token', jwtToken);
      localStorage.setItem('akv_user', JSON.stringify(loggedUser));
      setToken(jwtToken);
      setUser(loggedUser);
      return { success: true, status: result.status };
    }

    return { 
      success: false, 
      error: result.error || 'Registration failed.',
      message: result.message || 'Registration failed.',
      status: result.status,
      isNetworkError: result.isNetworkError
    };
  };

  const loginDemo = (role: 'customer' | 'admin' = 'customer') => {
    const demoUser = role === 'admin' ? DEMO_ADMIN_USER : DEMO_CUSTOMER_USER;
    const demoToken = `demo-session-token-${Date.now()}`;

    localStorage.setItem('akv_session_id', demoToken);
    localStorage.setItem('akv_token', demoToken);
    localStorage.setItem('akv_user', JSON.stringify(demoUser));
    setToken(demoToken);
    setUser(demoUser);
  };

  const refreshProfile = async () => {
    if (token && token.startsWith('demo-session-token')) return;
    const result = await apiFetch('session');
    if (result.ok && result.data && result.data.user) {
      const freshUser = result.data.user;
      setUser(freshUser);
      localStorage.setItem('akv_user', JSON.stringify(freshUser));
    }
  };

  const logout = async () => {
    try {
      if (token && !token.startsWith('demo-session-token')) {
        await apiFetch('logout', { method: 'POST' });
      }
    } catch {
      // ignore
    }
    localStorage.removeItem('akv_session_id');
    localStorage.removeItem('akv_token');
    localStorage.removeItem('akv_user');
    setToken(null);
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    register,
    loginDemo,
    logout,
    refreshProfile,
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}>
        <div className="spinner" style={{ marginBottom: '16px' }} />
        <p style={{ fontSize: '14px', color: '#9aa0a6' }}>Loading AKV Energy...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
