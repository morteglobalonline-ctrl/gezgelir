import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { LogoFull } from "./Brand";

export default function Splash({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1400);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="absolute inset-0 z-50 mesh-canvas grid place-items-center"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
      data-testid="splash-screen"
    >
      <div className="flex flex-col items-center px-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.86, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-[300px]"
        >
          <LogoFull className="w-full h-auto" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5 }}
          className="mt-5 font-display font-700 tracking-label text-[12px] text-gg-ink-2"
        >
          HAREKET ET, KAZAN
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 h-8 w-8"
        >
          <div className="h-8 w-8 rounded-full border-[3px] border-gg-mint-2 border-t-gg-green animate-spin" />
        </motion.div>
      </div>
    </motion.div>
  );
}
