import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowDownToLine, Clock3, ArrowUpRight, Wallet2, Landmark, Sparkles, Check,
  Plus, Star, Trash2, Pencil, ChevronRight,
} from "lucide-react";
import { endpoints, formatApiError } from "../lib/api";
import { useAppData } from "../context/AppData";
import { Wordmark, Mascot } from "../components/Brand";
import { Button, Skeleton, StatusBadge } from "../components/ui/Primitives";
import AnimatedNumber from "../components/ui/AnimatedNumber";
import Sheet from "../components/ui/Sheet";
import { money, moneySigned, intNum, dateLabel, timeShort } from "../lib/format";
import { staggerParent, riseItem, ENTER_INITIAL } from "../lib/motion";

function TxIcon({ type }) {
  const map = {
    withdrawal: { bg: "bg-[#EEF2F0]", color: "text-gg-ink", Icon: ArrowUpRight },
    bonus: { bg: "bg-[#FFF3DC]", color: "text-gg-gold-600", Icon: Sparkles },
    earning: { bg: "bg-gg-mint", color: "text-gg-green-700", Icon: ArrowDownToLine },
  };
  const { bg, color, Icon } = map[type] || map.earning;
  return (
    <div className={`grid place-items-center h-11 w-11 rounded-2xl shrink-0 ${bg} ${color}`}>
      <Icon size={20} strokeWidth={2.2} />
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, accent }) {
  return (
    <motion.div variants={riseItem} className="card p-4">
      <div className={`grid place-items-center h-9 w-9 rounded-xl mb-2 ${accent === "gold" ? "bg-[#FFF3DC] text-gg-gold-600" : "bg-gg-mint text-gg-green-700"}`}>
        <Icon size={17} strokeWidth={2.4} />
      </div>
      <p className="text-[11.5px] font-600 text-gg-ink-3 leading-tight">{label}</p>
      <p className="font-display font-800 text-[15px] text-gg-ink mt-1 tnum">{value}</p>
    </motion.div>
  );
}

/* ---------------- Bank management sheet ---------------- */
function BankSheet({ open, onClose, banks, reload }) {
  const [editing, setEditing] = useState(null); // null=list, 'new' or account
  const [form, setForm] = useState({ bank_name: "", iban: "", holder_name: "", make_default: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (open) setEditing(null); }, [open]);

  const startNew = () => {
    setForm({ bank_name: "", iban: "", holder_name: "", make_default: banks.length === 0 });
    setError(""); setEditing("new");
  };
  const startEdit = (b) => {
    setForm({ bank_name: b.bank_name, iban: b.iban, holder_name: b.holder_name, make_default: b.is_default });
    setError(""); setEditing(b);
  };

  const save = async () => {
    if (!form.bank_name.trim() || form.iban.trim().length < 10 || !form.holder_name.trim()) {
      setError("Lütfen tüm alanları doğru doldur (IBAN en az 10 karakter)."); return;
    }
    setBusy(true);
    try {
      if (editing === "new") await endpoints.addBank(form);
      else await endpoints.editBank(editing.id, form);
      await reload();
      setEditing(null);
    } catch (e) { setError(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  };

  const remove = async (b) => {
    await endpoints.deleteBank(b.id); await reload();
  };
  const makeDefault = async (b) => {
    await endpoints.setDefaultBank(b.id); await reload();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Banka Hesaplarım" testId="bank-sheet">
      <AnimatePresence mode="wait">
        {editing === null ? (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="space-y-3">
              {banks.map((b) => (
                <div key={b.id} className="rounded-2xl border border-gg-line p-4" data-testid="bank-item">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="grid place-items-center h-10 w-10 rounded-xl bg-gg-mint text-gg-green-700 shrink-0">
                        <Landmark size={18} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-700 text-[14px] text-gg-ink">{b.bank_name}</p>
                        <p className="text-[12px] text-gg-ink-3 tnum truncate">{b.iban}</p>
                        <p className="text-[11px] text-gg-ink-3">{b.holder_name}</p>
                      </div>
                    </div>
                    {b.is_default && (
                      <span className="text-[10.5px] font-700 text-gg-green-700 bg-gg-mint px-2 py-0.5 rounded-full shrink-0">
                        Varsayılan
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    {!b.is_default && (
                      <button onClick={() => makeDefault(b)} className="flex-1 h-9 rounded-xl bg-gg-mint text-gg-green-700 font-700 text-[12px] flex items-center justify-center gap-1" data-testid="bank-setdefault">
                        <Star size={13} /> Varsayılan yap
                      </button>
                    )}
                    <button onClick={() => startEdit(b)} className="h-9 px-3 rounded-xl border border-gg-line text-gg-ink-2 flex items-center gap-1 text-[12px] font-600" data-testid="bank-edit">
                      <Pencil size={13} /> Düzenle
                    </button>
                    {banks.length > 1 && (
                      <button onClick={() => remove(b)} className="h-9 w-9 grid place-items-center rounded-xl border border-gg-line text-red-400" data-testid="bank-delete">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button full variant="soft" size="lg" icon={Plus} className="mt-4" onClick={startNew} data-testid="bank-add">
              Yeni Hesap Ekle
            </Button>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <input className="w-full h-13 rounded-2xl border border-gg-line px-4 outline-none focus:border-gg-green text-[15px]"
              style={{ height: 52 }} placeholder="Banka adı" value={form.bank_name}
              onChange={(e) => setForm({ ...form, bank_name: e.target.value })} data-testid="bank-name-input" />
            <input className="w-full rounded-2xl border border-gg-line px-4 outline-none focus:border-gg-green text-[15px] tnum"
              style={{ height: 52 }} placeholder="IBAN (TR...)" value={form.iban}
              onChange={(e) => setForm({ ...form, iban: e.target.value })} data-testid="bank-iban-input" />
            <input className="w-full rounded-2xl border border-gg-line px-4 outline-none focus:border-gg-green text-[15px]"
              style={{ height: 52 }} placeholder="Hesap sahibi" value={form.holder_name}
              onChange={(e) => setForm({ ...form, holder_name: e.target.value })} data-testid="bank-holder-input" />
            <label className="flex items-center gap-2 px-1 py-1 text-[13px] text-gg-ink-2">
              <input type="checkbox" checked={form.make_default}
                onChange={(e) => setForm({ ...form, make_default: e.target.checked })} className="accent-[#00C27A] h-4 w-4" />
              Varsayılan hesap yap
            </label>
            {error && <p className="text-[13px] font-600 text-red-500">{error}</p>}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" full onClick={() => setEditing(null)}>Vazgeç</Button>
              <Button variant="primary" full onClick={save} disabled={busy} data-testid="bank-save">
                {busy ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}

/* ---------------- Withdraw sheet ---------------- */
function WithdrawSheet({ open, onClose, wallet, banks, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setAmount(String(Math.floor(wallet?.available || 0)));
      setDone(false); setError("");
      const def = banks.find((b) => b.is_default) || banks[0];
      setAccountId(def?.id || null);
    }
  }, [open, wallet, banks]);

  const submit = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0 || amt > (wallet?.available || 0)) { setError("Geçerli bir tutar gir."); return; }
    setBusy(true); setError("");
    try {
      await endpoints.withdraw(amt, accountId);
      setDone(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1600);
    } catch (e) { setError(formatApiError(e.response?.data?.detail)); }
    finally { setBusy(false); }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Paranı Çek" testId="withdraw-sheet">
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="py-6 text-center" data-testid="withdraw-success">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 14, stiffness: 260 }}
              className="mx-auto grid place-items-center h-20 w-20 rounded-full bg-gg-mint mb-4">
              <div className="grid place-items-center h-14 w-14 rounded-full bg-gg-green">
                <Check size={30} className="text-white" strokeWidth={3} />
              </div>
            </motion.div>
            <p className="font-display font-800 text-[19px] text-gg-ink">Çekim talebin alındı!</p>
            <p className="text-[13px] text-gg-ink-2 mt-1 px-6">
              {money(Number(amount))} tutarındaki talebin işleme alındı. Durumunu işlem geçmişinden takip edebilirsin.
            </p>
          </motion.div>
        ) : (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <p className="text-[12px] font-600 text-gg-ink-3 mb-1.5">Hedef hesap</p>
            <div className="space-y-2 mb-4">
              {banks.map((b) => (
                <button key={b.id} onClick={() => setAccountId(b.id)}
                  className={`w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${accountId === b.id ? "border-gg-green bg-gg-mint/50" : "border-gg-line bg-white"}`}
                  data-testid="withdraw-account-option">
                  <div className="grid place-items-center h-9 w-9 rounded-xl bg-white border border-gg-line text-gg-ink shrink-0"><Landmark size={16} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-700 text-gg-ink">{b.bank_name}</p>
                    <p className="text-[11px] text-gg-ink-3 tnum truncate">{b.iban}</p>
                  </div>
                  <div className={`h-5 w-5 rounded-full border-2 grid place-items-center ${accountId === b.id ? "border-gg-green" : "border-gg-line"}`}>
                    {accountId === b.id && <span className="h-2.5 w-2.5 rounded-full bg-gg-green" />}
                  </div>
                </button>
              ))}
            </div>

            <p className="text-[12px] font-600 text-gg-ink-3 mb-1.5">Çekilecek tutar</p>
            <div className="flex items-center gap-2 rounded-2xl border border-gg-line bg-white px-4 h-14 mb-3">
              <span className="font-display font-800 text-gg-ink text-[22px]">₺</span>
              <input type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="flex-1 min-w-0 bg-transparent outline-none font-display font-800 text-[22px] text-gg-ink tnum" data-testid="withdraw-amount-input" />
            </div>
            <div className="flex items-center gap-2 mb-4">
              {[1000, 2000].map((v) => (
                <button key={v} onClick={() => setAmount(String(v))} className="flex-1 h-10 rounded-xl bg-gg-mint text-gg-green-700 font-700 text-[13px] active:scale-95 transition-transform">{money(v)}</button>
              ))}
              <button onClick={() => setAmount(String(Math.floor(wallet?.available || 0)))} className="flex-1 h-10 rounded-xl bg-gg-charcoal text-white font-700 text-[13px] active:scale-95 transition-transform">Tümü</button>
            </div>
            {error && <p className="text-[13px] font-600 text-red-500 mb-2">{error}</p>}
            <p className="text-[12px] text-gg-ink-3 text-center mb-4">
              Kullanılabilir: <span className="font-700 text-gg-ink">{money(wallet?.available)}</span>
              {wallet?.payout_min ? ` · Min. çekim ${money(wallet.payout_min)}` : ""}
            </p>
            <Button full size="lg" onClick={submit} disabled={busy || !accountId || !Number(amount) || Number(amount) > (wallet?.available || 0)} icon={ArrowDownToLine} data-testid="withdraw-confirm-button">
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
  const [banks, setBanks] = useState([]);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);

  const loadTx = () => endpoints.transactions().then((d) => setTxs(d.items)).catch(() => {});
  const loadBanks = () => endpoints.banks().then((d) => setBanks(d.items)).catch(() => {});
  useEffect(() => { loadTx(); loadBanks(); }, []);

  const defaultBank = banks.find((b) => b.is_default) || banks[0];

  return (
    <motion.div variants={staggerParent} initial={ENTER_INITIAL} animate="animate" className="px-5">
      <motion.div variants={riseItem} className="safe-top flex items-center justify-between pt-3 pb-2">
        <div>
          <p className="text-[12px] font-600 text-gg-ink-3">GezGelir</p>
          <h1 className="font-display font-800 text-[24px] text-gg-ink">Cüzdan</h1>
        </div>
        <Wordmark style={{ height: 22 }} />
      </motion.div>

      <motion.div variants={riseItem} className="relative hero-dark rounded-[28px] p-6 shadow-dark overflow-hidden">
        <div className="absolute right-2 -bottom-2 opacity-90"><Mascot size={80} /></div>
        <p className="tracking-label text-[11px] font-700 text-white/55">KULLANILABİLİR BAKİYE</p>
        {wallet ? (
          <div className="mt-1 flex items-end gap-1">
            <span className="font-display font-800 text-white text-[15px] mb-2">₺</span>
            <AnimatedNumber value={wallet.available} format={(v) => intNum(Math.floor(v))}
              className="font-display font-800 text-white text-[44px] leading-none tnum" />
            <span className="font-display font-800 text-white/90 text-[22px] mb-1.5 tnum">
              ,{String(Math.round((wallet.available % 1) * 100)).padStart(2, "0")}
            </span>
          </div>
        ) : (<Skeleton className="h-11 w-48 mt-2 bg-white/10" />)}
        <div className="mt-5">
          <Button full size="lg" icon={ArrowDownToLine} onClick={() => setWithdrawOpen(true)} data-testid="withdraw-button">
            Paranı Çek
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <MiniStat icon={Clock3} label="Bekleyen Hakediş" value={wallet ? money(wallet.pending) : "—"} accent="gold" />
        <MiniStat icon={ArrowUpRight} label="Bu Ay Çekilen" value={wallet ? money(wallet.withdrawn_this_month) : "—"} />
        <MiniStat icon={Wallet2} label="Toplam Kazanç" value={wallet ? money(wallet.total_earning) : "—"} />
      </div>

      {/* Bank card -> manage */}
      <motion.button variants={riseItem} onClick={() => setBankOpen(true)}
        className="card p-4 mt-4 w-full flex items-center gap-3 text-left active:scale-[0.99] transition-transform" data-testid="manage-banks-button">
        <div className="grid place-items-center h-11 w-11 rounded-2xl bg-gg-mint text-gg-green-700 shrink-0"><Landmark size={20} strokeWidth={2.2} /></div>
        <div className="min-w-0 flex-1">
          <p className="font-700 text-[14px] text-gg-ink">{defaultBank?.bank_name || "Banka Hesaplarım"}</p>
          <p className="text-[12px] text-gg-ink-3 tnum truncate">{defaultBank?.iban || "Hesap ekle"}</p>
        </div>
        <span className="text-[12px] font-700 text-gg-green-700">Yönet</span>
        <ChevronRight size={18} className="text-gg-ink-3" />
      </motion.button>

      <div className="mt-6">
        <h3 className="font-display font-700 text-[17px] text-gg-ink mb-3">İşlem Geçmişi</h3>
        {!txs && <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[68px]" />)}</div>}
        <div className="space-y-3">
          {txs?.map((t) => (
            <motion.div key={t.id} variants={riseItem} className="card p-4 flex items-center gap-3" data-testid="transaction-item">
              <TxIcon type={t.type} />
              <div className="min-w-0 flex-1">
                <p className="font-700 text-[14px] text-gg-ink">{t.title}</p>
                <p className="text-[12px] text-gg-ink-3">{dateLabel(t.created_at)} · {timeShort(t.created_at)}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`font-display font-800 text-[15px] tnum ${t.amount < 0 ? "text-gg-ink" : "text-gg-green-700"}`}>{moneySigned(t.amount)}</p>
                <div className="mt-1 flex justify-end"><StatusBadge status={t.status} /></div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <WithdrawSheet open={withdrawOpen} onClose={() => setWithdrawOpen(false)} wallet={wallet} banks={banks}
        onSuccess={() => { refresh(); loadTx(); }} />
      <BankSheet open={bankOpen} onClose={() => setBankOpen(false)} banks={banks}
        reload={async () => { await loadBanks(); refresh(); }} />
    </motion.div>
  );
}
