import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { endpoints, tokenStore } from "../lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=checking, false=guest, object=authed
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      if (!tokenStore.get()) {
        setUser(false);
        setChecking(false);
        return;
      }
      try {
        const me = await endpoints.authMe();
        setUser(me);
      } catch {
        tokenStore.clear();
        setUser(false);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await endpoints.login(email, password);
    tokenStore.set(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await endpoints.register(payload);
    tokenStore.set(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(false);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, checking, login, register, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
