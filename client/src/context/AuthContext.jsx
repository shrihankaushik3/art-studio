import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiRequest } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('artstudio_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiRequest('/auth/me');
        setUser(data.user);
      } catch (err) {
        console.error('Failed to restore session:', err.message);
        localStorage.removeItem('artstudio_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    loadUser();
  }, [token]);

  async function login(email, password) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password }
    });

    localStorage.setItem('artstudio_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function register(email, password) {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: { email, password }
    });

    localStorage.setItem('artstudio_token', data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore network errors on logout
    }
    localStorage.removeItem('artstudio_token');
    setToken(null);
    setUser(null);
  }

  const isAdmin = user?.role === 'studio' || user?.role === 'admin';
  const isCustomer = user?.role === 'customer';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAdmin, isCustomer }}>
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
