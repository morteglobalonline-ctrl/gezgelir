import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Square, Gauge, Navigation, Timer, Check, ChevronRight } from "lucide-react";
import { endpoints } from "../lib/api";
import { useAppData } from "../context/AppData";
import { Mascot } from "../components/Brand";
import { Button, StatusBadge } from "../components/ui/Primitives";
import AnimatedNumber from "../components/ui/AnimatedNumber";
import { money, kmNum, intNum } from "../lib/format";

function fmtClock(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function DriveSession() {
  const navigate = useNavigate();
  const { config, driver, refresh, refreshNotifications } = useAppData();
  const rate = driver?.membership?.level?.rate_per_km ?? config?.rate_per_km ?? 0.4;

  const [dist, setDist] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [state, setState] = useState("driving"); // driving | finishing | done
  const [result, setResult] = useState(null);

  const startRef = useRef(new Date());
  const distRef = useRef(0);
  const speedRef = useRef(48);
  const lastRef = useRef(performance.now());

  useEffect(() => {
    if (state !== "driving") return;
    const id = setInterval(() => {
      const now = performance.now();
      const dt = (now - lastRef.current) / 1000;
      lastRef.current = now;
      // drift speed between 34 and 64 km/h
      const drift = (Math.random() - 0.5) * 6;
      speedRef.current = Math.max(34, Math.min(64, speedRef.current + drift));
      distRef.current += (speedRef.current * dt) / 3600;
      setDist(distRef.current);
      setSpeed(speedRef.current);
      setElapsed((e) => e + dt);
    }, 250);
    return () => clearInterval(id);
  }, [state]);

  const liveEarning = distRef.current * 0.97 * rate;

  const finish = async () => {
    setState("finishing");
    try {
      const payload = {
        distance_km: Math.max(0.1, Number(distRef.current.toFixed(1))),
        duration_sec: Math.floor(elapsed),
        started_at: startRef.current.toISOString(),
      };
      const res = await endpoints.driveStop(payload);
      setResult(res.trip);
      await refresh();
      refreshNotifications();
      setState("done");
    } catch (e) {
      console.error(e);
      navigate("/");
    }
  };

  return (
    <div className="absolute inset-0 z-50 hero-dark flex flex-col overflow-hidden" data-testid="drive-session">
      {/* top bar */}
      <div className="safe-top flex items-center justify-between px-5 pt-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
          <motion.span
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="h-2 w-2 rounded-full bg-gg-green"
          />
          <span className="text-[11px] font-700 tracking-label text-white/80">CANLI SÜRÜŞ</span>
        </span>
        <button
          onClick={() => navigate("/")}
          className="grid place-items-center h-10 w-10 rounded-full bg-white/10 text-white"
          data-testid="drive-close"
        >
          <X size={20} />
        </button>
      </div>

      {/* live earning */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-4">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          className="mb-5"
        >
          <Mascot size={96} />
        </motion.div>
        <p className="tracking-label text-[11px] font-700 text-white/50 mb-1">ANLIK KAZANÇ</p>
        <div className="flex items-end gap-1">
          <span className="font-display font-800 text-white text-[18px] mb-2.5">₺</span>
          <span className="font-display font-800 text-white text-[58px] leading-none tnum">
            {intNum(Math.floor(liveEarning))}
          </span>
          <span className="font-display font-800 text-white/80 text-[26px] mb-2 tnum">
            ,{String(Math.round((liveEarning % 1) * 100)).padStart(2, "0")}
          </span>
        </div>
        <p className="text-[13px] text-white/45 mt-2">{money(rate)} / km · %97 kazandıran</p>
      </div>

      {/* live stats */}
      <div className="px-5">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-2xl bg-white/8 p-3.5 text-center">
            <Navigation size={16} className="text-gg-green mx-auto mb-1.5" />
            <p className="font-display font-800 text-white text-[18px] tnum">{kmNum(dist)}</p>
            <p className="text-[11px] text-white/45">km</p>
          </div>
          <div className="rounded-2xl bg-white/8 p-3.5 text-center">
            <Timer size={16} className="text-gg-green mx-auto mb-1.5" />
            <p className="font-display font-800 text-white text-[18px] tnum">{fmtClock(elapsed)}</p>
            <p className="text-[11px] text-white/45">süre</p>
          </div>
          <div className="rounded-2xl bg-white/8 p-3.5 text-center">
            <Gauge size={16} className="text-gg-green mx-auto mb-1.5" />
            <p className="font-display font-800 text-white text-[18px] tnum">{Math.round(speed)}</p>
            <p className="text-[11px] text-white/45">km/s</p>
          </div>
        </div>
      </div>

      {/* animated road */}
      <div className="relative h-14 overflow-hidden mb-3">
        <motion.div
          className="road-line absolute top-1/2 -translate-y-1/2 h-1.5 w-[200%]"
          animate={{ x: ["0%", "-50%"] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* finish */}
      <div className="px-5 pb-8" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 24px)" }}>
        <Button
          full
          size="lg"
          variant="primary"
          icon={Square}
          onClick={finish}
          disabled={state !== "driving"}
          data-testid="finish-drive-button"
        >
          {state === "finishing" ? "Kaydediliyor..." : "Sürüşü Bitir"}
        </Button>
      </div>

      {/* result overlay */}
      <AnimatePresence>
        {state === "done" && result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-10 bg-gg-charcoal/70 backdrop-blur-sm flex items-end"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full bg-white rounded-t-[30px] p-6 pb-10"
              data-testid="drive-result"
            >
              <div className="grid place-items-center pt-1 pb-4">
                <span className="h-1.5 w-11 rounded-full bg-gg-line" />
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 13, stiffness: 240 }}
                className="mx-auto grid place-items-center h-20 w-20 rounded-full bg-gg-mint mb-4"
              >
                <div className="grid place-items-center h-14 w-14 rounded-full bg-gg-green">
                  <Check size={30} className="text-white" strokeWidth={3} />
                </div>
              </motion.div>
              <p className="text-center font-display font-800 text-[20px] text-gg-ink">Sürüş tamamlandı!</p>
              <p className="text-center text-[13px] text-gg-ink-2 mt-1">Kazandığın tutar hesabına eklendi.</p>

              <div className="mt-5 rounded-2xl bg-gg-canvas border border-gg-line p-5 text-center">
                <p className="text-[12px] font-600 text-gg-ink-3">Bu sürüşten kazancın</p>
                <div className="flex items-end justify-center gap-1 mt-1">
                  <span className="font-display font-800 text-gg-green-700 text-[16px] mb-2">₺</span>
                  <AnimatedNumber
                    value={result.earning}
                    format={(v) => intNum(Math.floor(v))}
                    className="font-display font-800 text-gg-green-700 text-[40px] leading-none tnum"
                  />
                  <span className="font-display font-800 text-gg-green-700/80 text-[22px] mb-1 tnum">
                    ,{String(Math.round((result.earning % 1) * 100)).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-3 mt-3 text-[13px] text-gg-ink-2">
                  <span className="tnum">{kmNum(result.eligible_km)} km</span>
                  <span className="h-1 w-1 rounded-full bg-gg-ink-3" />
                  <StatusBadge status={result.status} />
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <Button variant="outline" full onClick={() => navigate("/surusler")} icon={ChevronRight}>
                  Sürüşlerim
                </Button>
                <Button variant="primary" full onClick={() => navigate("/")}>
                  Harika!
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
