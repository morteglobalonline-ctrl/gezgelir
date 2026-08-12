import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownToLine, Clock3, ArrowUpRight, Wallet2, Landmark, Plus, Minus, Sparkles, Check,
} from "lucide-react";
import { endpoints } from "../lib/api";
import { useAppData } from "../context/AppData";
import { Wordmark, Mascot } from "../components/Brand";
import { Button, Skeleton, StatusBadge } from "../components/ui/Primitives";
import AnimatedNumber from "../components/ui/AnimatedNumber";
import Sheet from "../components/ui/Sheet";
import { money, moneySigned, intNum, dateLabel, timeShort } from "../lib/format";
import { staggerParent, riseItem, ENTER_INITIAL } from "../lib/motion";

function TxIcon({ type }) {
  if (type === "withdrawal")
    return (
      <div className="grid place-items-center h-11 w-11 rounded-2xl bg-[#EEF2F0] text-gg-ink shrink-0">
        <ArrowUpRight size={20} strokeWidth={2.2} />
      </div>
    );
  if (type === "bonus")
    return (
      <div className="grid place-items-center h-11 w-11 rounded-2xl bg-[#FFF3DC] text-gg-gold-600 shrink-0">
        <Sparkles size={20} strokeWidth={2.2} />
      </div>
    );
  return (
    <div className="grid place-items-center h-11 w-11 rounded-2xl bg-gg-mint text-gg-green-700 shrink-0">
      <ArrowDownToLine size={20} strokeWidth={2.2} />
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, accent }) {
  return (
    <motion.div variants={riseItem} className="card p-4">
      <div
        className={`grid place-items-center h-9 w-9 rounded-xl mb-2 ${
          accent === "gold" ? "bg-[#FFF3DC] text-gg-gold-600" : "bg-gg-mint text-gg-green-700"
        }`}
      >
        <Icon size={17} strokeWidth={2.4} />
      </div>
      <p className="text-[11.5px] font-600 text-gg-ink-3 leading-tight">{label}</p>
      <p className="font-display font-800 text-[15px] text-gg-ink mt-1 tnum">{value}</p>
    </motion.div>
  );
}

function WithdrawSheet({ open, onClose, wallet, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      setAmount(String(Math.floor(wallet?.available || 0)));
      setDone(false);
    }
  }, [open, wallet]);

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0 || amt > (wallet?.available || 0)) return;
    setBusy(true);
    try {
      await endpoints.withdraw(amt, wallet?.bank?.iban);
      setDone(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1600);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Paranı Çek" testId="withdraw-sheet">
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-6 text-center"
            data-testid="withdraw-success"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 14, stiffness: 260 }}
              className="mx-auto grid place-items-center h-20 w-20 rounded-full bg-gg-mint mb-4"
            >
              <div className="grid place-items-center h-14 w-14 rounded-full bg-gg-green">
                <Check size={30} className="text-white" strokeWidth={3} />
              </div>
            </motion.div>
            <p className="font-display font-800 text-[19px] text-gg-ink">Çekim talebin alındı!</p>
            <p className="text-[13px] text-gg-ink-2 mt-1 px-6">
              {money(Number(amount))} tutarındaki çekim banka hesabına aktarılıyor.
            </p>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="rounded-2xl bg-gg-canvas border border-gg-line p-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid place-items-center h-10 w-10 rounded-xl bg-white border border-gg-line text-gg-ink">
                  <Landmark size={18} />
                </div>
                <div>
                  <p className="text-[13px] font-700 text-gg-ink">{wallet?.bank?.bank_name}</p>
                  <p className="text-[12px] text-gg-ink-3 tnum">{wallet?.bank?.iban}</p>
                </div>
              </div>
            </div>

            <p className="text-[12px] font-600 text-gg-ink-3 mb-1.5">Çekilecek tutar</p>
            <div className="flex items-center gap-2 rounded-2xl border border-gg-line bg-white px-4 h-14 mb-3">
              <span className="font-display font-800 text-gg-ink text-[22px]">₺</span>
              <input
                type="number"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 min-w-0 bg-transparent outline-none font-display font-800 text-[22px] text-gg-ink tnum"
                data-testid="withdraw-amount-input"
              />
            </div>
            <div className="flex items-center gap-2 mb-5">
              {[1000, 2000].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(String(v))}
                  className="flex-1 h-10 rounded-xl bg-gg-mint text-gg-green-700 font-700 text-[13px] active:scale-95 transition-transform"
                >
                  {money(v)}
                </button>
              ))}
              <button
                onClick={() => setAmount(String(Math.floor(wallet?.available || 0)))}
                className="flex-1 h-10 rounded-xl bg-gg-charcoal text-white font-700 text-[13px] active:scale-95 transition-transform"
              >
                Tümü
              </button>
            </div>
            <p className="text-[12px] text-gg-ink-3 text-center mb-4">
              Kullanılabilir bakiye: <span className="font-700 text-gg-ink">{money(wallet?.available)}</span>
            </p>
            <Button
              full
              size="lg"
              onClick={submit}
              disabled={busy || !Number(amount) || Number(amount) > (wallet?.available || 0)}
              icon={ArrowDownToLine}
              data-testid="withdraw-confirm-button"
            >
              {busy ? "İşleniyor..." : "Çekim Talebi Oluştur"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}

export default function Wallet() {
  const { wallet, refresh } = useAppData();
  const [txs, setTxs] = useState(null);
  const [open, setOpen] = useState(false);

  const loadTx = () => endpoints.transactions().then((d) => setTxs(d.items)).catch(() => {});
  useEffect(() => { loadTx(); }, []);

  return (
    <motion.div variants={staggerParent} initial={ENTER_INITIAL} animate="animate" className="px-5">
      <motion.div variants={riseItem} className="safe-top flex items-center justify-between pt-3 pb-2">
        <div>
          <p className="text-[12px] font-600 text-gg-ink-3">GezGelir</p>
          <h1 className="font-display font-800 text-[24px] text-gg-ink">Cüzdan</h1>
        </div>
        <Wordmark style={{ height: 22 }} />
      </motion.div>

      {/* Balance hero */}
      <motion.div variants={riseItem} className="relative hero-dark rounded-[28px] p-6 shadow-dark overflow-hidden">
        <div className="absolute right-2 -bottom-2 opacity-90">
          <Mascot size={80} />
        </div>
        <p className="tracking-label text-[11px] font-700 text-white/55">KULLANILABİLİR BAKİYE</p>
        {wallet ? (
          <div className="mt-1 flex items-end gap-1">
            <span className="font-display font-800 text-white text-[15px] mb-2">₺</span>
            <AnimatedNumber
              value={wallet.available}
              format={(v) => intNum(Math.floor(v))}
              className="font-display font-800 text-white text-[44px] leading-none tnum"
            />
            <span className="font-display font-800 text-white/90 text-[22px] mb-1.5 tnum">
              ,{String(Math.round((wallet.available % 1) * 100)).padStart(2, "0")}
            </span>
          </div>
        ) : (
          <Skeleton className="h-11 w-48 mt-2 bg-white/10" />
        )}
        <div className="mt-5">
          <Button
            full
            size="lg"
            icon={ArrowDownToLine}
            onClick={() => setOpen(true)}
            data-testid="withdraw-button"
          >
            Paranı Çek
          </Button>
        </div>
      </motion.div>

      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        <MiniStat icon={Clock3} label="Bekleyen Hakediş" value={wallet ? money(wallet.pending) : "—"} accent="gold" />
        <MiniStat icon={ArrowUpRight} label="Bu Ay Çekilen" value={wallet ? money(wallet.withdrawn_this_month) : "—"} />
        <MiniStat icon={Wallet2} label="Toplam Kazanç" value={wallet ? money(wallet.total_earning) : "—"} />
      </div>

      {/* Bank card */}
      <motion.div variants={riseItem} className="card p-4 mt-4 flex items-center gap-3">
        <div className="grid place-items-center h-11 w-11 rounded-2xl bg-gg-mint text-gg-green-700 shrink-0">
          <Landmark size={20} strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-700 text-[14px] text-gg-ink">{wallet?.bank?.bank_name || "Banka Hesabım"}</p>
          <p className="text-[12px] text-gg-ink-3 tnum truncate">{wallet?.bank?.iban || "—"}</p>
        </div>
        <span className="text-[11px] font-700 text-gg-green-700 bg-gg-mint px-2.5 py-1 rounded-full">Varsayılan</span>
      </motion.div>

      {/* Transactions */}
      <div className="mt-6">
        <h3 className="font-display font-700 text-[17px] text-gg-ink mb-3">İşlem Geçmişi</h3>
        {!txs && <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[68px]" />)}</div>}
        <div className="space-y-3">
          {txs?.map((t) => (
            <motion.div key={t.id} variants={riseItem} className="card p-4 flex items-center gap-3" data-testid="transaction-item">
              <TxIcon type={t.type} />
              <div className="min-w-0 flex-1">
                <p className="font-700 text-[14px] text-gg-ink">{t.title}</p>
                <p className="text-[12px] text-gg-ink-3">
                  {dateLabel(t.created_at)} · {timeShort(t.created_at)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`font-display font-800 text-[15px] tnum ${t.amount < 0 ? "text-gg-ink" : "text-gg-green-700"}`}>
                  {moneySigned(t.amount)}
                </p>
                <div className="mt-1 flex justify-end">
                  <StatusBadge status={t.status} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <WithdrawSheet
        open={open}
        onClose={() => setOpen(false)}
        wallet={wallet}
        onSuccess={() => { refresh(); loadTx(); }}
      />
    </motion.div>
  );
}
