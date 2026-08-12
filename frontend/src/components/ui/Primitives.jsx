import React from "react";
import { motion } from "framer-motion";
import { INSTANT } from "../../lib/motion";

/* ---------------- Button ---------------- */
export function Button({
  children,
  variant = "primary",
  size = "md",
  full = false,
  icon: Icon,
  className = "",
  ...props
}) {
  const base =
    "font-display font-700 inline-flex items-center justify-center gap-2 rounded-2xl transition-colors duration-200 select-none disabled:opacity-50 disabled:pointer-events-none";
  const sizes = {
    sm: "h-10 px-4 text-sm",
    md: "h-12 px-5 text-[15px]",
    lg: "h-14 px-6 text-base",
  };
  const variants = {
    primary: "bg-gg-green text-white shadow-float hover:bg-gg-green-600 active:bg-gg-green-700",
    dark: "bg-gg-charcoal text-white hover:bg-gg-charcoal-2",
    soft: "bg-gg-mint text-gg-green-700 hover:bg-gg-mint-2",
    outline: "border border-gg-line bg-white text-gg-ink hover:bg-gg-canvas",
    ghost: "text-gg-ink-2 hover:bg-gg-canvas",
  };
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      className={`${base} ${sizes[size]} ${variants[variant]} ${full ? "w-full" : ""} ${className}`}
      {...props}
    >
      {Icon && <Icon size={size === "lg" ? 20 : 18} strokeWidth={2.4} />}
      {children}
    </motion.button>
  );
}

/* ---------------- IconButton ---------------- */
export function IconButton({ icon: Icon, className = "", ...props }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      className={`relative grid place-items-center h-11 w-11 rounded-2xl border border-gg-line bg-white text-gg-ink shadow-soft ${className}`}
      {...props}
    >
      <Icon size={20} strokeWidth={2.2} />
    </motion.button>
  );
}

/* ---------------- SectionTitle ---------------- */
export function SectionTitle({ children, action, onAction }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="font-display font-700 text-[17px] text-gg-ink">{children}</h3>
      {action && (
        <button
          onClick={onAction}
          className="text-sm font-600 text-gg-green-700 active:opacity-60"
          data-testid="section-action"
        >
          {action}
        </button>
      )}
    </div>
  );
}

/* ---------------- StatusBadge ---------------- */
const STATUS_MAP = {
  Onaylandı: { bg: "bg-gg-mint", text: "text-gg-green-700", dot: "bg-gg-green" },
  İşleniyor: { bg: "bg-[#FFF3DC]", text: "text-[#B9791A]", dot: "bg-gg-gold" },
  İnceleniyor: { bg: "bg-[#FFF3DC]", text: "text-[#B9791A]", dot: "bg-gg-gold" },
  Beklemede: { bg: "bg-[#EEF2F0]", text: "text-gg-ink-2", dot: "bg-gg-ink-3" },
  Eksik: { bg: "bg-[#EEF2F0]", text: "text-gg-ink-2", dot: "bg-gg-ink-3" },
  Düzeltilmiş: { bg: "bg-[#EAF6FF]", text: "text-[#2C7AA6]", dot: "bg-[#4AA3D5]" },
  Reddedildi: { bg: "bg-[#FDECEC]", text: "text-[#D14343]", dot: "bg-[#E36A6A]" },
  Tamamlandı: { bg: "bg-gg-mint", text: "text-gg-green-700", dot: "bg-gg-green" },
};
export function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP["İnceleniyor"];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-700 ${s.bg} ${s.text}`}
      data-testid={`status-${status}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

/* ---------------- ProgressBar ---------------- */
export function ProgressBar({ value = 0, className = "", trackClass = "bg-gg-mint", tone = "green" }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const fill = tone === "gold" ? "bg-gg-gold" : "bg-gg-green";
  return (
    <div className={`h-2.5 w-full rounded-full overflow-hidden ${trackClass} ${className}`}>
      <motion.div
        className={`h-full rounded-full ${fill}`}
        initial={INSTANT ? false : { width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: INSTANT ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

/* ---------------- Skeleton ---------------- */
export function Skeleton({ className = "" }) {
  return <div className={`skeleton rounded-2xl ${className}`} />;
}

/* ---------------- RangeTabs ---------------- */
export function RangeTabs({ value, onChange, options }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-2xl bg-gg-mint/70 border border-gg-line" data-testid="range-tabs">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className="relative flex-1 h-9 rounded-xl text-[13px] font-700"
            data-testid={`range-${o.value}`}
          >
            {active && (
              <motion.span
                layoutId="range-pill"
                className="absolute inset-0 rounded-xl bg-white shadow-soft"
                transition={{ type: "spring", damping: 30, stiffness: 380 }}
              />
            )}
            <span className={`relative z-10 ${active ? "text-gg-green-700" : "text-gg-ink-2"}`}>
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Sparkline / Bars ---------------- */
export function BarChart({ data = [], valueKey = "earning", height = 132, labelClass = "text-gg-ink-3" }) {
  const max = Math.max(1, ...data.map((d) => d[valueKey]));
  return (
    <div className="flex items-end gap-2" style={{ height }}>
      {data.map((d, i) => {
        const h = (d[valueKey] / max) * (height - 26);
        const active = d[valueKey] === max;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 min-w-0">
            <motion.div
              className={`w-full rounded-t-lg rounded-b-sm ${active ? "bg-gg-green" : "bg-gg-mint-2"}`}
              initial={INSTANT ? false : { height: 0 }}
              animate={{ height: Math.max(6, h) }}
              transition={{ duration: INSTANT ? 0 : 0.7, delay: INSTANT ? 0 : i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            />
            <span className={`text-[10px] font-600 truncate w-full text-center ${labelClass}`}>
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
