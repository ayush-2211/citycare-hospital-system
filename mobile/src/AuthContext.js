import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken, setOnExpired } from './api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const logout = useCallback(() => { setToken(null); setUser(null); }, []);
  useEffect(() => { setOnExpired(logout); }, [logout]);

  const finish = (data) => {
    // The mobile app is for patients; doctors and the admin office use the web portal
    if (data.user.role !== 'patient') {
      throw new Error('The mobile app is for patients. Doctors and the admin office should use the web portal.');
    }
    setToken(data.token);
    setUser(data.user);
  };

  const login = async (email, password) => finish(await api.post('/auth/login', { email, password }));
  const register = async (form) => finish(await api.post('/auth/register', form));
  const updateUser = (patch) => setUser((u) => ({ ...u, ...patch }));

  return <AuthContext.Provider value={{ user, login, register, logout, updateUser }}>{children}</AuthContext.Provider>;
}
