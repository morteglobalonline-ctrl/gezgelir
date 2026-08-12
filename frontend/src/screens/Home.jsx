import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bell, Play, Navigation, Gauge, CalendarDays, Clock3, ChevronRight, Timer } from "lucide-react";
import { endpoints } from "../lib/api";
import { useAppData } from "../context/AppData";
import { Wordmark, Mascot } from "../components/Brand";
import AnimatedNumber from "../components/ui/AnimatedNumber";
import { Button, ProgressBar, Skeleton, SectionTitle, StatusBadge } from "../components/ui/Primitives";
import { money, km, kmNum, intNum, greetingByHour, dateLabel, timeShort } from "../lib/format";
import { staggerParent, riseItem, ENTER_INITIAL } from "../lib/motion";

function QuickMetric({ icon: Icon, label, value, accent }) {
  return (
    <motion.div variants={riseItem} className="card p-4">
      <div
        className={`grid place-items-center h-9 w-9 rounded-xl mb-3 ${
          accent === "gold" ? "bg-[#FFF3DC] text-gg-gold-600" : "bg-gg-mint text-gg-green-700"
        }`}
      >
        <Icon size={18} strokeWidth={2.4} />
      </div>
      <p className="text-[12px] font-600 text-gg-ink-3">{label}</p>
      <p className="font-display font-800 text-[18px] text-gg-ink mt-0.5 tnum">{value}</p>
    </motion.div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { driver, wallet, config } = useAppData();
  const [today, setToday] = useState(null);
  const [recent, setRecent] = useState(null);

  useEffect(() => {
    endpoints.earnings("today").then(setToday).catch(() => {});
    endpoints.trips("month").then((d) => setRecent(d.items?.[0] || null)).catch(() => {});
  }, []);

  const name = driver?.greeting_name || "Sürücü";
  const rate = config?.rate_per_km || today?.rate_per_km || 0;

  return (
    <motion.div variants={staggerParent} initial={ENTER_INITIAL} animate="animate" className="px-5">
      {/* Header */}
      <motion.div variants={riseItem} className="safe-top flex items-center justify-between pt-3 pb-4">
        <Wordmark style={{ height: 26 }} />
        <button
          className="relative grid place-items-center h-11 w-11 rounded-2xl bg-white border border-gg-line shadow-soft"
          data-testid="notifications-button"
        >
          <Bell size={20} className="text-gg-ink" strokeWidth={2.2} />
          <span className="absolute top-2.5 right-3 h-2 w-2 rounded-full bg-gg-green ring-2 ring-white" />
        </button>
      </motion.div>

      {/* Greeting */}
      <motion.div variants={riseItem} className="mb-4">
        <h1 className="font-display font-800 text-[24px] text-gg-ink">
          {greetingByHour()}, {name} <span className="align-middle">👋</span>
        </h1>
        <p className="text-[14px] text-gg-ink-2 mt-0.5">Bugün de gezdikçe kazan.</p>
      </motion.div>

      {/* Earnings hero */}
      <motion.div variants={riseItem} className="relative hero-dark rounded-[28px] p-6 overflow-hidden shadow-dark">
        <div className="absolute -right-3 -top-3 opacity-95">
          <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
            <Mascot size={92} />
          </motion.div>
        </div>
        <p className="tracking-label text-[11px] font-700 text-white/55">BUGÜNKÜ KAZANCIN</p>
        {today ? (
          <div className="mt-1 flex items-end gap-1">
            <span className="font-display font-800 text-white text-[15px] mb-2">₺</span>
            <AnimatedNumber
              value={today.earning}
              format={(v) => intNum(Math.floor(v))}
              className="font-display font-800 text-white text-[46px] leading-none tnum"
            />
            <span className="font-display font-800 text-white/90 text-[24px] mb-1.5 tnum">
              ,{String(Math.round((today.earning % 1) * 100)).padStart(2, "0")}
            </span>
          </div>
        ) : (
          <Skeleton className="h-12 w-44 mt-2 bg-white/10" />
        )}

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-600 text-white/90">
            <Navigation size={13} className="text-gg-green" />
            {today ? `${kmNum(today.eligible_km)} km kazandıran mesafe` : "—"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gg-green/15 px-3 py-1.5 text-[12px] font-700 text-gg-green">
            {money(rate)} / km
          </span>
        </div>
      </motion.div>

      {/* Primary action */}
      <motion.div variants={riseItem} className="mt-4">
        <Button full size="lg" icon={Play} onClick={() => navigate("/surus")} data-testid="start-drive-button">
          Sürüşe Başla
        </Button>
      </motion.div>

      {/* Quick metrics */}
      <div className="grid grid-cols-2 gap-3 mt-5">
        <QuickMetric
          icon={Navigation}
          label="Bugünkü KM"
          value={today ? km(today.eligible_km) : "—"}
        />
        <QuickMetric
          icon={CalendarDays}
          label="Bu Hafta"
          value={today ? km(today.weekly.current_km) : "—"}
        />
        <QuickMetric icon={Gauge} label="Mevcut Oran" value={`${money(rate)}/km`} />
        <QuickMetric
          icon={Clock3}
          label="Bekleyen Hakediş"
          value={wallet ? money(wallet.pending) : "—"}
          accent="gold"
        />
      </div>

      {/* Weekly goal */}
      <motion.div variants={riseItem} className="card p-5 mt-5">
        <div className="flex items-center justify-between mb-1">
          <p className="font-display font-700 text-[15px] text-gg-ink">Bu hafta hedefin</p>
          {today && (
            <span className="text-[13px] font-700 text-gg-green-700">
              %{Math.round(today.weekly.progress * 100)}
            </span>
          )}
        </div>
        <p className="text-[13px] text-gg-ink-2 mb-3">
          {today ? `${intNum(today.weekly.goal_km)} km sürüş hedefi` : "Yükleniyor"}
        </p>
        <ProgressBar value={today ? today.weekly.progress : 0} />
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-[13px] font-700 text-gg-ink tnum">
            {today ? `${kmNum(today.weekly.current_km)} / ${intNum(today.weekly.goal_km)} km` : "—"}
          </span>
          <span className="text-[12px] font-600 text-gg-ink-3">
            {today ? `${kmNum(today.weekly.remaining_km)} km kaldı` : ""}
          </span>
        </div>
      </motion.div>

      {/* Recent activity */}
      <motion.div variants={riseItem} className="mt-6">
        <SectionTitle action="Tümü" onAction={() => navigate("/surusler")}>
          Son Sürüş
        </SectionTitle>
        {recent ? (
          <button
            onClick={() => navigate("/surusler")}
            className="card p-4 w-full flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
            data-testid="recent-trip"
          >
            <div className="grid place-items-center h-11 w-11 rounded-2xl bg-gg-mint text-gg-green-700 shrink-0">
              <Timer size={20} strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-700 text-[14px] text-gg-ink">{dateLabel(recent.started_at)}</p>
                <span className="text-[12px] text-gg-ink-3">
                  {timeShort(recent.started_at)}–{timeShort(recent.ended_at)}
                </span>
              </div>
              <p className="text-[12px] text-gg-ink-2 mt-0.5">{km(recent.distance_km)}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display font-800 text-[15px] text-gg-green-700 tnum">
                +{money(recent.earning)}
              </p>
              <div className="mt-1 flex justify-end">
                <StatusBadge status={recent.status} />
              </div>
            </div>
            <ChevronRight size={18} className="text-gg-ink-3 shrink-0" />
          </button>
        ) : (
          <Skeleton className="h-20 w-full" />
        )}
      </motion.div>
    </motion.div>
  );
}
