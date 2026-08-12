import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, Route, TrendingUp, Wallet, User } from "lucide-react";

const TABS = [
  { to: "/", label: "Ana Sayfa", icon: Home },
  { to: "/surusler", label: "Sürüşler", icon: Route },
  { to: "/kazanc", label: "Kazanç", icon: TrendingUp, center: true },
  { to: "/cuzdan", label: "Cüzdan", icon: Wallet },
  { to: "/profil", label: "Profil", icon: User },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav
      className="absolute bottom-0 left-0 right-0 z-30 glass-nav border-t border-gg-line shadow-nav"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 10px)" }}
      data-testid="bottom-nav"
    >
      <div className="flex items-stretch justify-around px-2 pt-2">
        {TABS.map((t) => {
          const active = pathname === t.to;
          const Icon = t.icon;

          if (t.center) {
            return (
              <button
                key={t.to}
                onClick={() => navigate(t.to)}
                className="flex flex-col items-center gap-1 -mt-6 w-[64px]"
                data-testid={`tab-${t.label}`}
              >
                <motion.div
                  whileTap={{ scale: 0.92 }}
                  className={`grid place-items-center h-14 w-14 rounded-[20px] shadow-float transition-colors ${
                    active ? "bg-gg-green" : "bg-gg-charcoal"
                  }`}
                >
                  <Icon size={24} className="text-white" strokeWidth={2.4} />
                </motion.div>
                <span
                  className={`text-[10.5px] font-700 ${active ? "text-gg-green-700" : "text-gg-ink-2"}`}
                >
                  {t.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={t.to}
              onClick={() => navigate(t.to)}
              className="relative flex flex-col items-center gap-1 py-1 w-[64px]"
              data-testid={`tab-${t.label}`}
            >
              {active && (
                <motion.span
                  layoutId="tab-indicator"
                  className="absolute -top-2 h-1 w-6 rounded-full bg-gg-green"
                />
              )}
              <Icon
                size={23}
                strokeWidth={active ? 2.6 : 2}
                className={active ? "text-gg-green" : "text-gg-ink-3"}
              />
              <span
                className={`text-[10.5px] font-600 ${active ? "text-gg-green-700" : "text-gg-ink-3"}`}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
