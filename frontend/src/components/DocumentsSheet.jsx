import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, FileText, Car, Upload, RefreshCw, Trash2, Camera, ShieldCheck } from "lucide-react";
import Sheet from "./ui/Sheet";
import { StatusBadge } from "./ui/Primitives";
import { endpoints, docFileSrc, formatApiError } from "../lib/api";
import { useAppData } from "../context/AppData";

const TYPE_ICONS = { ehliyet: CreditCard, ruhsat: FileText, arac_foto: Car };

export default function DocumentsSheet({ open, onClose }) {
  const { refreshNotifications } = useAppData();
  const [docs, setDocs] = useState(null);
  const [busyType, setBusyType] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const pendingType = useRef(null);

  const load = () => endpoints.documents().then((d) => setDocs(d)).catch(() => {});
  useEffect(() => { if (open) { setError(""); load(); } }, [open]);

  const pick = (type) => {
    pendingType.current = type;
    inputRef.current?.click();
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const type = pendingType.current;
    if (!file || !type) return;
    setBusyType(type);
    setError("");
    try {
      await endpoints.uploadDocument(type, file);
      await load();
      refreshNotifications();
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail));
    } finally {
      setBusyType(null);
    }
  };

  const remove = async (id) => {
    await endpoints.deleteDocument(id);
    await load();
  };

  return (
    <Sheet open={open} onClose={onClose} title="Belgelerim" testId="documents-sheet">
      <input ref={inputRef} type="file" accept="image/*,application/pdf" capture="environment"
        onChange={onFile} className="hidden" data-testid="document-file-input" />

      {docs && (
        <div className="flex items-center gap-3 rounded-2xl bg-gg-mint/60 border border-gg-mint-2 p-3.5 mb-4">
          <div className="grid place-items-center h-10 w-10 rounded-xl bg-gg-green text-white shrink-0">
            <ShieldCheck size={19} />
          </div>
          <div className="min-w-0">
            <p className="font-700 text-[13.5px] text-gg-ink">
              {docs.approved}/{docs.total} belge onaylı
            </p>
            <p className="text-[12px] text-gg-ink-2">Belgelerini yükle, aracın uygun kalsın.</p>
          </div>
        </div>
      )}

      {error && <p className="text-[13px] font-600 text-red-500 mb-3">{error}</p>}

      <div className="space-y-3">
        {docs?.items.map((slot) => {
          const Icon = TYPE_ICONS[slot.key] || FileText;
          const busy = busyType === slot.key;
          return (
            <div key={slot.key} className="card p-4" data-testid={`doc-${slot.key}`}>
              <div className="flex items-start gap-3">
                {slot.uploaded ? (
                  <img
                    src={docFileSrc(slot.id)}
                    alt={slot.label}
                    className="h-14 w-14 rounded-xl object-cover bg-gg-mint shrink-0"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                ) : (
                  <div className="grid place-items-center h-14 w-14 rounded-xl bg-gg-mint text-gg-green-700 shrink-0">
                    <Icon size={22} strokeWidth={2.2} />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-700 text-[14px] text-gg-ink">{slot.label}</p>
                    <StatusBadge status={slot.status} />
                  </div>
                  <p className="text-[12px] text-gg-ink-2 mt-0.5">{slot.desc}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3">
                {slot.uploaded ? (
                  <>
                    <button onClick={() => pick(slot.key)} disabled={busy}
                      className="flex-1 h-10 rounded-xl bg-gg-mint text-gg-green-700 font-700 text-[13px] flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
                      data-testid={`doc-replace-${slot.key}`}>
                      <RefreshCw size={14} className={busy ? "animate-spin" : ""} /> {busy ? "Yükleniyor" : "Değiştir"}
                    </button>
                    <button onClick={() => remove(slot.id)}
                      className="h-10 w-10 grid place-items-center rounded-xl border border-gg-line text-red-400"
                      data-testid={`doc-delete-${slot.key}`}>
                      <Trash2 size={16} />
                    </button>
                  </>
                ) : (
                  <button onClick={() => pick(slot.key)} disabled={busy}
                    className="flex-1 h-11 rounded-xl bg-gg-green text-white font-700 text-[14px] flex items-center justify-center gap-2 shadow-float active:scale-95 transition-transform"
                    data-testid={`doc-upload-${slot.key}`}>
                    {busy ? (<><RefreshCw size={16} className="animate-spin" /> Yükleniyor</>)
                          : (<><Camera size={17} /> Fotoğraf Yükle</>)}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}
