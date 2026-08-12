import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  User, Car, FileText, Landmark, Bell, ShieldCheck, LifeBuoy, ScrollText, Info,
  ChevronRight, CheckCircle2, CalendarDays, Navigation, Coins, LogOut, BadgeCheck,
} from "lucide-react";
import { useAppData } from "../context/AppData";
import { useAuth } from "../context/Auth";
import { Wordmark, Mascot, LogoFull } from "../components/Brand";
import { Skeleton } from "../components/ui/Primitives";
import Sheet from "../components/ui/Sheet";
import DocumentsSheet from "../components/DocumentsSheet";
import { money, km, dateFull } from "../lib/format";
import { staggerParent, riseItem, ENTER_INITIAL } from "../lib/motion";

const MENU = [
  { icon: User, label: "Kişisel Bilgiler" },
  { icon: Car, label: "Aracım" },
  { icon: FileText, label: "Belgelerim" },
  { icon: Landmark, label: "Banka Bilgilerim" },
  { icon: Bell, label: "Bildirimler" },
  { icon: ShieldCheck, label: "Güvenlik" },
  { icon: LifeBuoy, label: "Yardım & Destek" },
  { icon: ScrollText, label: "Sözleşmeler & KVKK" },
  { icon: Info, label: "Hakkımızda" },
];

function SummaryStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl bg-white/8 p-3">
      <Icon size={16} className="text-gg-green mb-1.5" strokeWidth={2.4} />
      <p className="text-[11px] text-white/50 leading-tight">{label}</p>
      <p className="font-display font-800 text-white text-[15px] mt-0.5 tnum">{value}</p>
    </div>
  );
}

export default function Profile() {
  const { driver } = useAppData();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(null);
  const [docsOpen, setDocsOpen] = useState(false);
  const m = driver?.membership;

  const handleMenu = (label) => {
    if (label === "Banka Bilgilerim") navigate("/cuzdan");
    else if (label === "Belgelerim") setDocsOpen(true);
    else setSheet(label);
  };

  return (
    <motion.div variants={staggerParent} initial={ENTER_INITIAL} animate="animate" className="px-5">
      <motion.div variants={riseItem} className="safe-top flex items-center justify-between pt-3 pb-2">
        <div>
          <p className="text-[12px] font-600 text-gg-ink-3">GezGelir</p>
          <h1 className="font-display font-800 text-[24px] text-gg-ink">Profil</h1>
        </div>
        <Wordmark style={{ height: 22 }} />
      </motion.div>

      {/* Identity */}
      <motion.div variants={riseItem} className="card p-5 flex items-center gap-4">
        <div className="relative grid place-items-center h-16 w-16 rounded-2xl bg-gg-mint shrink-0">
          <Mascot size={52} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display font-800 text-[19px] text-gg-ink">
            {driver ? `${driver.first_name} ${driver.last_name}` : "—"}
          </p>
          <p className="text-[13px] text-gg-ink-2">{driver?.title || "GezGelir Sürücüsü"}</p>
          <span className="inline-flex items-center gap-1.5 mt-1.5 rounded-full bg-gg-mint px-2.5 py-1 text-[11px] font-700 text-gg-green-700">
            <CheckCircle2 size={12} /> {driver?.status || "Hesap Aktif"}
          </span>
        </div>
      </motion.div>

      {/* Membership summary */}
      <motion.div variants={riseItem} className="hero-dark rounded-[26px] p-5 mt-4 shadow-dark">
        <div className="flex items-center justify-between mb-3">
          <p className="tracking-label text-[11px] font-700 text-white/55">GEZGELİR ÜYELİĞİN</p>
          {m?.level && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gg-gold/20 px-2.5 py-1 text-[11px] font-700 text-gg-gold" data-testid="profile-level">
              <BadgeCheck size={12} /> {m.level.label}
              {m.level.rate_per_km != null && (
                <span className="text-white/70 font-600 tnum">· {money(m.level.rate_per_km)}/km</span>
              )}
            </span>
          )}
        </div>
        {m ? (
          <div className="grid grid-cols-3 gap-2.5">
            <SummaryStat icon={CalendarDays} label="Katılım" value={dateFull(m.joined_at)} />
            <SummaryStat icon={Navigation} label="Toplam KM" value={km(m.total_km)} />
            <SummaryStat icon={Coins} label="Toplam Kazanç" value={money(m.total_earning)} />
          </div>
        ) : (
          <Skeleton className="h-16 bg-white/10" />
        )}
      </motion.div>

      {/* Vehicle */}
      <motion.div variants={riseItem} className="card p-5 mt-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-display font-700 text-[15px] text-gg-ink">Aracım</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gg-mint px-2.5 py-1 text-[11px] font-700 text-gg-green-700">
            <CheckCircle2 size={12} /> {driver?.vehicle?.eligibility || "Uygun"}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="grid place-items-center h-14 w-14 rounded-2xl bg-gg-charcoal text-white shrink-0">
            <Car size={26} strokeWidth={2} />
          </div>
          <div className="flex-1">
            <p className="font-700 text-[15px] text-gg-ink">
              {driver ? `${driver.vehicle.name}` : "—"}
            </p>
            <p className="text-[12px] text-gg-ink-2">
              {driver ? `${driver.vehicle.year} · ${driver.vehicle.color}` : ""}
            </p>
          </div>
          <div className="rounded-xl border-2 border-gg-charcoal px-3 py-1.5">
            <p className="font-display font-800 text-[14px] text-gg-charcoal tracking-wide tnum">
              {driver?.vehicle?.plate || "—"}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Menu */}
      <motion.div variants={riseItem} className="card mt-4 overflow-hidden">
        {MENU.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              onClick={() => handleMenu(item.label)}
              className={`w-full flex items-center gap-3 px-4 py-3.5 active:bg-gg-canvas transition-colors ${
                i !== MENU.length - 1 ? "border-b border-gg-line" : ""
              }`}
              data-testid={`menu-${item.label}`}
            >
              <div className="grid place-items-center h-9 w-9 rounded-xl bg-gg-mint text-gg-green-700 shrink-0">
                <Icon size={17} strokeWidth={2.2} />
              </div>
              <span className="flex-1 text-left text-[14px] font-600 text-gg-ink">{item.label}</span>
              <ChevronRight size={18} className="text-gg-ink-3" />
            </button>
          );
        })}
      </motion.div>

      {/* Sign out */}
      <motion.button
        variants={riseItem}
        whileTap={{ scale: 0.98 }}
        onClick={logout}
        className="w-full mt-4 card p-3.5 flex items-center justify-center gap-2 text-[14px] font-700 text-gg-ink-2"
        data-testid="signout-button"
      >
        <LogOut size={18} /> Çıkış Yap
      </motion.button>

      {/* Brand footer */}
      <motion.div variants={riseItem} className="mt-6 mb-2 flex flex-col items-center gap-1">
        <LogoFull style={{ height: 40, opacity: 0.9 }} />
        <p className="text-[11px] text-gg-ink-3">Sürüm 1.0.0 · Hareket Et, Kazan</p>
      </motion.div>

      <Sheet open={!!sheet} onClose={() => setSheet(null)} title={sheet || ""} testId="profile-sheet">
        <div className="py-4 text-center">
          <div className="mx-auto grid place-items-center h-16 w-16 rounded-2xl bg-gg-mint mb-4">
            <Mascot size={52} />
          </div>
          <p className="font-display font-700 text-gg-ink text-[16px]">Çok yakında</p>
          <p className="text-[13px] text-gg-ink-2 mt-1 px-6">
            “{sheet}” bölümü bir sonraki güncellemede seni bekliyor olacak.
          </p>
        </div>
      </Sheet>

      <DocumentsSheet open={docsOpen} onClose={() => setDocsOpen(false)} />
    </motion.div>
  );
}
