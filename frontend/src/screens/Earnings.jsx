import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Navigation, Gauge, Route as RouteIcon, Trophy, Target, Sparkles, TrendingUp,
  Flag, Medal, Coins, Star, Gift, Lock, CheckCircle2, Zap } from "lucide-react";
import { endpoints } from "../lib/api";
import { useAppData } from "../context/AppData";
import { Wordmark, Mascot } from "../components/Brand";
import { Skeleton, RangeTabs, BarChart, ProgressBar } from "../components/ui/Primitives";
import AnimatedNumber from "../components/ui/AnimatedNumber";
import { money, km, kmNum, intNum } from "../lib/format";
import { staggerParent, riseItem, ENTER_INITIAL } from "../lib/motion";

const RANGES = [
  { value: "today", label: "Bugün" },
  { value: "week", label: "Hafta" },
  { value: "month", label: "Ay" },
  { value: "total", label: "Toplam" },
];
const TITLES = {
  today: "Bugün Kazandın",
  week: "Bu Hafta Kazandın",
  month: "Bu Ay Kazandın",
  total: "Toplam Kazancın",
};

const BADGE_ICONS = { flag: Flag, route: RouteIcon, medal: Medal, coins: Coins, star: Star, target: Target };

function Metric({ icon: Icon, label, value }) {
  return (
    <motion.div variants={riseItem} className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className="text-gg-green-700" strokeWidth={2.4} />
        <p className="text-[12px] font-600 text-gg-ink-3">{label}</p>
      </div>
      <p className="font-display font-800 text-[19px] text-gg-ink tnum">{value}</p>
    </motion.div>
  );
}

export default function Earnings() {
  const { driver, config } = useAppData();
  const [range, setRange] = useState("month");
  const [data, setData] = useState(null);
  const [series, setSeries] = useState([]);
  const [game, setGame] = useState(null);

  useEffect(() => {
    setData(null);
    endpoints.earnings(range).then(setData).catch(() => {});
  }, [range]);

  useEffect(() => {
    endpoints.series("week").then((d) => setSeries(d.series)).catch(() => {});
    endpoints.gamification().then(setGame).catch(() => {});
  }, []);

  const membership = driver?.membership;
  const levels = config?.levels || [];
  const totalKm = membership?.total_km || 0;
  const currentIdx = Math.max(
    0,
    levels.reduce((acc, lv, i) => (totalKm >= lv.min_km ? i : acc), 0)
  );
  const current = levels[currentIdx];
  const next = levels[currentIdx + 1];
  const levelProgress = next
    ? Math.min(1, (totalKm - current.min_km) / (next.min_km - current.min_km))
    : 1;

  return (
    <motion.div variants={staggerParent} initial={ENTER_INITIAL} animate="animate" className="px-5">
      <motion.div variants={riseItem} className="safe-top flex items-center justify-between pt-3 pb-2">
        <div>
          <p className="text-[12px] font-600 text-gg-ink-3">GezGelir</p>
          <h1 className="font-display font-800 text-[24px] text-gg-ink">Kazanç</h1>
        </div>
        <Wordmark style={{ height: 22 }} />
      </motion.div>

      <motion.div variants={riseItem} className="mb-4">
        <RangeTabs value={range} onChange={setRange} options={RANGES} />
      </motion.div>

      {/* Hero */}
      <motion.div variants={riseItem} className="relative hero-dark rounded-[28px] p-6 shadow-dark overflow-hidden">
        <div className="absolute right-3 top-4 opacity-90">
          <Mascot size={72} />
        </div>
        <p className="tracking-label text-[11px] font-700 text-white/55">{TITLES[range].toUpperCase()}</p>
        {data ? (
          <div className="mt-1 flex items-end gap-1">
            <span className="font-display font-800 text-white text-[15px] mb-2">₺</span>
            <AnimatedNumber
              value={data.earning}
              format={(v) => intNum(Math.floor(v))}
              className="font-display font-800 text-white text-[42px] leading-none tnum"
            />
            <span className="font-display font-800 text-white/90 text-[22px] mb-1 tnum">
              ,{String(Math.round((data.earning % 1) * 100)).padStart(2, "0")}
            </span>
          </div>
        ) : (
          <Skeleton className="h-11 w-40 mt-2 bg-white/10" />
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-white/8 p-3">
            <p className="text-[11px] text-white/50">Kazandıran KM</p>
            <p className="font-display font-800 text-white text-[16px] tnum">
              {data ? km(data.eligible_km) : "—"}
            </p>
          </div>
          <div className="rounded-2xl bg-white/8 p-3">
            <p className="text-[11px] text-white/50">Sürüş Sayısı</p>
            <p className="font-display font-800 text-white text-[16px] tnum">
              {data ? intNum(data.trips) : "—"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <Metric icon={Gauge} label="Aktif Oran" value={data ? `${money(data.rate_per_km)}/km` : "—"} />
        <Metric icon={Navigation} label="Toplam Mesafe" value={data ? km(data.distance_km) : "—"} />
      </div>

      {/* Weekly chart */}
      <motion.div variants={riseItem} className="card p-5 mt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-gg-green-700" />
            <p className="font-display font-700 text-[15px] text-gg-ink">Haftalık Kazanç</p>
          </div>
          <span className="text-[12px] font-600 text-gg-ink-3">Son 7 gün</span>
        </div>
        {series.length ? <BarChart data={series} valueKey="earning" height={140} /> : <Skeleton className="h-[140px]" />}
      </motion.div>

      {/* Weekly goal + bonus */}
      <motion.div variants={riseItem} className="card p-5 mt-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-gg-green-700" />
            <p className="font-display font-700 text-[15px] text-gg-ink">Haftalık Hedef</p>
          </div>
          {data && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF3DC] px-2.5 py-1 text-[11px] font-700 text-gg-gold-600">
              <Sparkles size={12} /> {money(data.weekly.bonus)} bonus
            </span>
          )}
        </div>
        {data && (
          <>
            <p className="text-[13px] text-gg-ink-2 mb-3 mt-1">
              {intNum(data.weekly.goal_km)} km tamamla, bonusu kap.
            </p>
            <ProgressBar value={data.weekly.progress} />
            <div className="flex items-center justify-between mt-2.5">
              <span className="text-[13px] font-700 text-gg-ink tnum">
                {kmNum(data.weekly.current_km)} / {intNum(data.weekly.goal_km)} km
              </span>
              <span className="text-[12px] font-600 text-gg-ink-3">
                {kmNum(data.weekly.remaining_km)} km kaldı
              </span>
            </div>
          </>
        )}
      </motion.div>

      {/* Driver level */}
      {membership && current && (
        <motion.div variants={riseItem} className="card p-5 mt-4 mb-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="grid place-items-center h-9 w-9 rounded-xl bg-[#FFF3DC] text-gg-gold-600">
              <Trophy size={18} strokeWidth={2.4} />
            </div>
            <div>
              <p className="font-display font-700 text-[15px] text-gg-ink">
                Seviye: {current.label}
              </p>
              <p className="text-[12px] font-700 text-gg-gold-600 tnum">
                {money(current.rate_per_km)}/km kazanç oranı
              </p>
            </div>
          </div>
          <ProgressBar value={levelProgress} tone="gold" trackClass="bg-[#FFF3DC]" />
          <div className="flex items-center justify-between mt-2.5">
            <span className="text-[12px] font-600 text-gg-ink-2 tnum">{km(totalKm)} toplam</span>
            {next && (
              <span className="text-[12px] font-600 text-gg-ink-3 tnum">
                {next.label} için {km(next.min_km - totalKm)}
              </span>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-gg-line flex items-center gap-1.5" data-testid="level-progression">
            {levels.map((lv, i) => (
              <React.Fragment key={lv.key}>
                <div className={`flex-1 rounded-xl px-2 py-2 text-center ${i === currentIdx ? "bg-gg-mint" : "bg-gg-canvas"}`}>
                  <p className={`text-[11px] font-800 tracking-wide ${i === currentIdx ? "text-gg-green-700" : "text-gg-ink-3"}`}>
                    {lv.label.toUpperCase()}
                  </p>
                  <p className={`text-[11.5px] font-700 tnum ${i === currentIdx ? "text-gg-ink" : "text-gg-ink-3"}`}>
                    {money(lv.rate_per_km)}
                  </p>
                </div>
                {i < levels.length - 1 && <span className="text-gg-ink-3 text-[12px]">→</span>}
              </React.Fragment>
            ))}
          </div>
        </motion.div>
      )}

      {/* Missions / Görevler */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Gift size={18} className="text-gg-green-700" />
          <h3 className="font-display font-700 text-[17px] text-gg-ink">Haftalık Görevler</h3>
        </div>
        {!game && <Skeleton className="h-24" />}
        <div className="space-y-3">
          {game?.missions?.map((mn) => (
            <motion.div key={mn.id} variants={riseItem} className="card p-4" data-testid="mission-item">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-700 text-[14px] text-gg-ink">{mn.title}</p>
                    {mn.completed && <CheckCircle2 size={15} className="text-gg-green" />}
                  </div>
                  <p className="text-[12px] text-gg-ink-2 mt-0.5">{mn.desc}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF3DC] px-2.5 py-1 text-[11px] font-700 text-gg-gold-600 shrink-0">
                  <Sparkles size={11} /> {money(mn.reward)}
                </span>
              </div>
              <div className="mt-3">
                <ProgressBar value={mn.progress} tone={mn.completed ? "green" : "green"} />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[12px] font-700 text-gg-ink tnum">
                    {mn.type === "earning" ? money(mn.current) : (mn.type === "trips" ? intNum(mn.current) : kmNum(mn.current))}
                    {" / "}
                    {mn.type === "earning" ? money(mn.target) : (mn.type === "trips" ? intNum(mn.target) + " sürüş" : intNum(mn.target) + " km")}
                  </span>
                  <span className="text-[11px] font-700 text-gg-green-700">%{Math.round(mn.progress * 100)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Badges / Rozetler */}
      <div className="mt-6 mb-2">
        <div className="flex items-center gap-2 mb-3">
          <Medal size={18} className="text-gg-gold-600" />
          <h3 className="font-display font-700 text-[17px] text-gg-ink">Rozetlerin</h3>
        </div>
        {!game && <Skeleton className="h-24" />}
        {game && (
          <div className="grid grid-cols-3 gap-3">
            {game.badges.map((b) => {
              const Icon = BADGE_ICONS[b.icon] || Star;
              return (
                <motion.div
                  key={b.id}
                  variants={riseItem}
                  className={`card p-3 flex flex-col items-center text-center ${b.earned ? "" : "opacity-60"}`}
                  data-testid={`badge-${b.id}`}
                >
                  <div
                    className={`grid place-items-center h-12 w-12 rounded-2xl mb-2 ${
                      b.earned ? "bg-gg-gold text-white shadow-soft" : "bg-gg-canvas text-gg-ink-3 border border-gg-line"
                    }`}
                  >
                    {b.earned ? <Icon size={22} strokeWidth={2.2} /> : <Lock size={18} />}
                  </div>
                  <p className="text-[11.5px] font-700 text-gg-ink leading-tight">{b.title}</p>
                  <p className="text-[10px] text-gg-ink-3 mt-0.5 leading-tight">{b.desc}</p>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
