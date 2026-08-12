import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Navigation, Timer, ChevronRight, MapPin, Route as RouteIcon, Gauge, Percent } from "lucide-react";
import { endpoints } from "../lib/api";
import { Wordmark } from "../components/Brand";
import { StatusBadge, Skeleton, RangeTabs, BarChart } from "../components/ui/Primitives";
import Sheet from "../components/ui/Sheet";
import { money, km, kmNum, intNum, dateLabel, dateFull, timeShort } from "../lib/format";
import { staggerParent, riseItem, ENTER_INITIAL } from "../lib/motion";

const RANGES = [
  { value: "today", label: "Bugün" },
  { value: "week", label: "Bu Hafta" },
  { value: "month", label: "Bu Ay" },
];

function DetailRow({ icon: Icon, label, value, strong }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gg-line last:border-0">
      <div className="flex items-center gap-3">
        <div className="grid place-items-center h-9 w-9 rounded-xl bg-gg-mint text-gg-green-700">
          <Icon size={17} strokeWidth={2.2} />
        </div>
        <span className="text-[14px] text-gg-ink-2">{label}</span>
      </div>
      <span className={`text-[14px] tnum ${strong ? "font-800 text-gg-green-700" : "font-700 text-gg-ink"}`}>
        {value}
      </span>
    </div>
  );
}

export default function Trips() {
  const [range, setRange] = useState("month");
  const [data, setData] = useState(null);
  const [series, setSeries] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setData(null);
    endpoints.trips(range).then(setData).catch(() => {});
  }, [range]);

  useEffect(() => {
    endpoints.series("week").then((d) => setSeries(d.series)).catch(() => {});
  }, []);

  const grouped = useMemo(() => {
    if (!data?.items) return [];
    const map = new Map();
    data.items.forEach((t) => {
      const key = dateLabel(t.started_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    });
    return Array.from(map.entries());
  }, [data]);

  return (
    <motion.div variants={staggerParent} initial={ENTER_INITIAL} animate="animate" className="px-5">
      <motion.div variants={riseItem} className="safe-top flex items-center justify-between pt-3 pb-2">
        <div>
          <p className="text-[12px] font-600 text-gg-ink-3">GezGelir</p>
          <h1 className="font-display font-800 text-[24px] text-gg-ink">Sürüşler</h1>
        </div>
        <Wordmark style={{ height: 22 }} />
      </motion.div>

      {/* Summary card */}
      <motion.div variants={riseItem} className="hero-dark rounded-[26px] p-5 shadow-dark mb-4">
        <p className="tracking-label text-[11px] font-700 text-white/55">
          {RANGES.find((r) => r.value === range)?.label.toUpperCase()} · KAZANDIRAN MESAFE
        </p>
        <div className="flex items-end justify-between mt-1">
          <div className="flex items-baseline gap-1">
            <span className="font-display font-800 text-white text-[38px] leading-none tnum">
              {data ? kmNum(data.summary.eligible_km) : "—"}
            </span>
            <span className="font-display font-700 text-white/70 text-[16px]">km</span>
          </div>
          <div className="text-right">
            <p className="text-[12px] text-white/55">Toplam Kazanç</p>
            <p className="font-display font-800 text-gg-green text-[18px] tnum">
              {data ? money(data.summary.earning) : "—"}
            </p>
          </div>
        </div>
        <div className="mt-4 bg-white/5 rounded-2xl p-3">
          <p className="text-[11px] font-600 text-white/50 mb-2">Son 7 gün</p>
          {series.length ? (
            <BarChart data={series} valueKey="km" height={90} labelClass="text-white/45" />
          ) : (
            <Skeleton className="h-[90px] w-full bg-white/10" />
          )}
        </div>
      </motion.div>

      <motion.div variants={riseItem}>
        <RangeTabs value={range} onChange={setRange} options={RANGES} />
      </motion.div>

      {/* List */}
      <div className="mt-5">
        {!data && (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-[76px] w-full" />)}
          </div>
        )}

        {data && data.items.length === 0 && (
          <div className="card p-8 text-center">
            <div className="mx-auto grid place-items-center h-14 w-14 rounded-2xl bg-gg-mint text-gg-green-700 mb-3">
              <RouteIcon size={24} />
            </div>
            <p className="font-display font-700 text-gg-ink">Henüz sürüş yok</p>
            <p className="text-[13px] text-gg-ink-2 mt-1">
              Bu dönemde kayıtlı sürüşün bulunmuyor. Hareket et, kazanmaya başla.
            </p>
          </div>
        )}

        {grouped.map(([label, items], gi) => (
          <div key={label} className="mb-5">
            <p className="text-[12px] font-700 text-gg-ink-3 mb-2 px-1">{label}</p>
            <div className="space-y-3">
              {items.map((t) => (
                <motion.button
                  key={t.id}
                  variants={riseItem}
                  onClick={() => setSelected(t)}
                  className="card p-4 w-full flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
                  data-testid="trip-item"
                >
                  <div className="grid place-items-center h-11 w-11 rounded-2xl bg-gg-mint text-gg-green-700 shrink-0">
                    <Timer size={20} strokeWidth={2.2} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-700 text-[14px] text-gg-ink">
                      {timeShort(t.started_at)} – {timeShort(t.ended_at)}
                    </p>
                    <p className="text-[12px] text-gg-ink-2 mt-0.5 flex items-center gap-1">
                      <Navigation size={12} className="text-gg-ink-3" />
                      {km(t.distance_km)} · {t.route_label}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-display font-800 text-[15px] text-gg-green-700 tnum">
                      +{money(t.earning)}
                    </p>
                    <div className="mt-1 flex justify-end">
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Detail */}
      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Sürüş Detayı"
        testId="trip-detail-sheet"
      >
        {selected && (
          <div>
            <div className="rounded-2xl bg-gg-canvas border border-gg-line p-4 mb-4 text-center">
              <p className="text-[12px] font-600 text-gg-ink-3">Kazanç</p>
              <p className="font-display font-800 text-[30px] text-gg-green-700 tnum">
                +{money(selected.earning)}
              </p>
              <div className="mt-2 flex justify-center">
                <StatusBadge status={selected.status} />
              </div>
            </div>
            <DetailRow icon={MapPin} label="Rota" value={selected.route_label} />
            <DetailRow icon={Timer} label="Tarih" value={dateFull(selected.started_at)} />
            <DetailRow
              icon={Timer}
              label="Saat"
              value={`${timeShort(selected.started_at)} – ${timeShort(selected.ended_at)}`}
            />
            <DetailRow icon={Navigation} label="Toplam Mesafe" value={km(selected.distance_km)} />
            <DetailRow icon={Percent} label="Kazandıran KM" value={km(selected.eligible_km)} />
            <DetailRow icon={Gauge} label="Uygulanan Oran" value={`${money(selected.rate)}/km`} />
            <DetailRow icon={Timer} label="Hesaplanan Kazanç" value={money(selected.earning)} strong />
          </div>
        )}
      </Sheet>
    </motion.div>
  );
}
