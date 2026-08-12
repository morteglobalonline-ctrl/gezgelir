import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { endpoints } from "../lib/api";

const AppDataCtx = createContext(null);

export function AppDataProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [driver, setDriver] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [cfg, me, w] = await Promise.all([
      endpoints.config(),
      endpoints.me(),
      endpoints.wallet(),
    ]);
    setConfig(cfg);
    setDriver(me);
    setWallet(w);
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const d = await endpoints.notifications();
      setNotifications(d.items);
      setUnread(d.unread);
    } catch (e) {
      /* ignore */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setUnread(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await endpoints.readAllNotifications();
    } catch (e) {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([refresh(), refreshNotifications()]);
      } catch (e) {
        console.error("Veri yüklenemedi", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh, refreshNotifications]);

  return (
    <AppDataCtx.Provider
      value={{
        config, driver, wallet, notifications, unread, loading,
        refresh, refreshNotifications, markAllRead, setWallet, setDriver,
      }}
    >
      {children}
    </AppDataCtx.Provider>
  );
}

export const useAppData = () => useContext(AppDataCtx);
