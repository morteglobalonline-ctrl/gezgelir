import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Coins, CheckCircle2, Wallet, Sparkles, FileText, Bell, CheckCheck, BellRing, BellOff } from "lucide-react";
import Sheet from "./ui/Sheet";
import { useAppData } from "../context/AppData";
import { timeAgo } from "../lib/format";
import { pushSupported, getPushStatus, enablePush, disablePush } from "../lib/push";
import { endpoints } from "../lib/api";

const ICONS = {
  coins: { Icon: Coins, bg: "bg-gg-mint", color: "text-gg-green-700" },
  check: { Icon: CheckCircle2, bg: "bg-gg-mint", color: "text-gg-green-700" },
  wallet: { Icon: Wallet, bg: "bg-[#EEF2F0]", color: "text-gg-ink" },
  spark: { Icon: Sparkles, bg: "bg-[#FFF3DC]", color: "text-gg-gold-600" },
  doc: { Icon: FileText, bg: "bg-[#EAF6FF]", color: "text-[#2C7AA6]" },
  bell: { Icon: Bell, bg: "bg-gg-mint", color: "text-gg-green-700" },
};

export default function NotificationSheet({ open, onClose }) {
  const { notifications, unread, refreshNotifications, markAllRead } = useAppData();
  const [pushState, setPushState] = useState("disabled");
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (open) {
      refreshNotifications();
      getPushStatus().then(setPushState);
    }
  }, [open, refreshNotifications]);

  const togglePush = async () => {
    setPushBusy(true);
    try {
      if (pushState === "enabled") {
        setPushState(await disablePush());
      } else {
        const s = await enablePush();
        setPushState(s);
        try { await endpoints.pushTest(); refreshNotifications(); } catch (e) {}
      }
    } catch (e) {
      setPushState(await getPushStatus());
    } finally {
      setPushBusy(false);
    }
  };

  const PushIcon = pushState === "enabled" ? BellRing : BellOff;
  const pushLabel =
    pushState === "unsupported" ? "Cihaz desteklemiyor"
    : pushState === "denied" ? "İzin reddedildi — tarayıcı ayarlarından aç"
    : pushState === "enabled" ? "Anlık bildirimler açık"
    : "Anlık bildirimleri aç";

  return (
    <Sheet open={open} onClose={onClose} title="Bildirimler" testId="notification-sheet">
      {pushSupported() && (
        <button
          onClick={togglePush}
          disabled={pushBusy || pushState === "unsupported" || pushState === "denied"}
          className={`w-full mb-4 flex items-center gap-3 rounded-2xl p-3.5 border transition-colors ${
            pushState === "enabled" ? "border-gg-mint-2 bg-gg-mint/50" : "border-gg-line bg-white"
          }`}
          data-testid="push-toggle"
        >
          <div className={`grid place-items-center h-10 w-10 rounded-xl shrink-0 ${pushState === "enabled" ? "bg-gg-green text-white" : "bg-gg-mint text-gg-green-700"}`}>
            <PushIcon size={19} strokeWidth={2.3} />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="font-700 text-[14px] text-gg-ink">{pushLabel}</p>
            <p className="text-[12px] text-gg-ink-2">Kazanç, onay ve çekim gelişmelerini anında al.</p>
          </div>
          {pushState !== "denied" && pushState !== "unsupported" && (
            <span className={`h-6 w-11 rounded-full p-0.5 transition-colors ${pushState === "enabled" ? "bg-gg-green" : "bg-gg-line"}`}>
              <motion.span layout className="block h-5 w-5 rounded-full bg-white shadow" style={{ marginLeft: pushState === "enabled" ? 20 : 0 }} />
            </span>
          )}
        </button>
      )}

      {unread > 0 && (
        <button
          onClick={markAllRead}
          className="mb-3 ml-auto flex items-center gap-1.5 text-[13px] font-700 text-gg-green-700"
          data-testid="mark-all-read"
        >
          <CheckCheck size={15} /> Tümünü okundu işaretle
        </button>
      )}

      {notifications.length === 0 && (
        <div className="py-10 text-center">
          <div className="mx-auto grid place-items-center h-14 w-14 rounded-2xl bg-gg-mint text-gg-green-700 mb-3">
            <Bell size={24} />
          </div>
          <p className="font-display font-700 text-gg-ink">Bildirim yok</p>
          <p className="text-[13px] text-gg-ink-2 mt-1">Yeni gelişmeler burada görünecek.</p>
        </div>
      )}

      <div className="space-y-2.5">
        {notifications.map((n, i) => {
          const cfg = ICONS[n.icon] || ICONS.bell;
          const Icon = cfg.Icon;
          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
              className={`flex items-start gap-3 rounded-2xl p-3.5 border ${
                n.read ? "border-gg-line bg-white" : "border-gg-mint-2 bg-gg-mint/40"
              }`}
              data-testid="notification-item"
            >
              <div className={`grid place-items-center h-10 w-10 rounded-xl shrink-0 ${cfg.bg} ${cfg.color}`}>
                <Icon size={19} strokeWidth={2.3} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-700 text-[14px] text-gg-ink truncate">{n.title}</p>
                  {!n.read && <span className="h-2 w-2 rounded-full bg-gg-green shrink-0" />}
                </div>
                <p className="text-[12.5px] text-gg-ink-2 mt-0.5 leading-snug">{n.body}</p>
                <p className="text-[11px] text-gg-ink-3 mt-1">{timeAgo(n.created_at)}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </Sheet>
  );
}
