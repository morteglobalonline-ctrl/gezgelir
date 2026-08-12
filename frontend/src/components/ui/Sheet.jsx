import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

export default function Sheet({ open, onClose, title, children, testId }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="absolute inset-0 z-40 bg-gg-charcoal/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="absolute inset-x-0 bottom-0 z-50 bg-white rounded-t-[28px] max-h-[86%] overflow-hidden flex flex-col"
            style={{ boxShadow: "0 -20px 50px rgba(26,31,35,0.25)" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            data-testid={testId}
          >
            <div className="pt-3 pb-1 grid place-items-center">
              <span className="h-1.5 w-11 rounded-full bg-gg-line" />
            </div>
            <div className="flex items-center justify-between px-6 pt-2 pb-3">
              <h3 className="font-display font-800 text-[18px] text-gg-ink">{title}</h3>
              <button
                onClick={onClose}
                className="grid place-items-center h-9 w-9 rounded-full bg-gg-canvas text-gg-ink-2"
                data-testid="sheet-close"
              >
                <X size={18} strokeWidth={2.4} />
              </button>
            </div>
            <div className="px-6 pb-8 overflow-y-auto no-scrollbar">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
