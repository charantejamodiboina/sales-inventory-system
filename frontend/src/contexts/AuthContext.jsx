import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('apex_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('apex_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
      setToken(null);
    };
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  useEffect(() => {
    async function verifyUser() {
      if (token) {
        try {
          const profile = await api.get('/auth/me');
          setUser(profile);
          localStorage.setItem('apex_user', JSON.stringify(profile));
        } catch (e) {
          console.warn('Session expired or invalid:', e.message);
          setUser(null);
          setToken(null);
          localStorage.removeItem('apex_token');
          localStorage.removeItem('apex_user');
        }
      }
      setLoading(false);
    }
    verifyUser();
  }, [token]);

  const login = async (username, password) => {
    const data = await api.post('/auth/login/json', { username, password });
    localStorage.setItem('apex_token', data.access_token);
    localStorage.setItem('apex_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('apex_token');
    localStorage.removeItem('apex_user');
    setToken(null);
    setUser(null);
  };

  const switchDemoUser = async (roleName) => {
    const credentials = {
      ADMIN: { u: 'admin', p: 'Admin@123' },
      MANAGER: { u: 'manager', p: 'Manager@123' },
      SALES_USER: { u: 'sales', p: 'Sales@123' },
    };
    const cred = credentials[roleName];
    if (cred) {
      return await login(cred.u, cred.p);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        role: user?.role,
        isAdmin: user?.role === 'ADMIN',
        isManager: user?.role === 'MANAGER' || user?.role === 'ADMIN',
        isSalesUser: user?.role === 'SALES_USER',
        login,
        logout,
        switchDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

