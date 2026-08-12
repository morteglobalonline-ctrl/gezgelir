import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { endpoints } from "../lib/api";

const AppDataCtx = createContext(null);

export function AppDataProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [driver, setDriver] = useState(null);
  const [wallet, setWallet] = useState(null);
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

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } catch (e) {
        console.error("Veri yüklenemedi", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  return (
    <AppDataCtx.Provider value={{ config, driver, wallet, loading, refresh, setWallet, setDriver }}>
      {children}
    </AppDataCtx.Provider>
  );
}

export const useAppData = () => useContext(AppDataCtx);
