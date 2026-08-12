import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Route, Coins, Wallet2 } from "lucide-react";
import { Mascot, Wordmark } from "./Brand";
import { Button } from "./ui/Primitives";

const SLIDES = [
  {
    icon: Route,
    title: "Hareket Et, Kazan",
    body: "Aracın zaten yollarda. GezGelir ile o hareket, senin için para kazanmaya başlasın.",
    tone: "green",
  },
  {
    icon: Coins,
    title: "Gezdikçe Kazan",
    body: "Kazandıran kilometrelerin otomatik hesaplanır, kazancın anında birikmeye başlar.",
    tone: "gold",
  },
  {
    icon: Wallet2,
    title: "Paranı Kolayca Çek",
    body: "Biriken kazancını dilediğin an güvenle banka hesabına aktar. Hepsi bu kadar basit.",
    tone: "green",
  },
];

export default function Onboarding({ onDone }) {
  const [i, setI] = useState(0);
  const slide = SLIDES[i];
  const Icon = slide.icon;
  const last = i === SLIDES.length - 1;

  const next = () => (last ? onDone() : setI((v) => v + 1));

  return (
    <div className="absolute inset-0 z-40 mesh-canvas flex flex-col" data-testid="onboarding-screen">
      <div className="safe-top relative z-20 flex items-center justify-between px-6 pt-3">
        <Wordmark style={{ height: 24 }} />
        <button
          onClick={onDone}
          className="text-sm font-600 text-gg-ink-2 active:opacity-60"
          data-testid="onboarding-skip"
        >
          Atla
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 -mt-6 pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center text-center"
          >
            <div className="relative mb-8">
              <div
                className={`absolute inset-0 -m-6 rounded-full blur-2xl ${
                  slide.tone === "gold" ? "bg-gg-gold/25" : "bg-gg-green/20"
                }`}
              />
              <div className="relative grid place-items-center h-40 w-40 rounded-[42px] bg-white shadow-card">
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Mascot size={112} />
                </motion.div>
                <div
                  className={`absolute -bottom-3 -right-3 grid place-items-center h-12 w-12 rounded-2xl shadow-soft ${
                    slide.tone === "gold" ? "bg-gg-gold" : "bg-gg-green"
                  }`}
                >
                  <Icon size={22} className="text-white" strokeWidth={2.4} />
                </div>
              </div>
            </div>

            <h1 className="font-display font-800 text-[28px] leading-tight text-gg-ink">
              {slide.title}
            </h1>
            <p className="mt-3 max-w-[300px] text-[15px] leading-relaxed text-gg-ink-2">
              {slide.body}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-8 pb-10">
        <div className="flex items-center justify-center gap-2 mb-7">
          {SLIDES.map((_, idx) => (
            <motion.span
              key={idx}
              animate={{ width: idx === i ? 26 : 8 }}
              className={`h-2 rounded-full ${idx === i ? "bg-gg-green" : "bg-gg-mint-2"}`}
            />
          ))}
        </div>
        <Button full size="lg" onClick={next} icon={ArrowRight} data-testid="onboarding-next">
          {last ? "Hadi Başlayalım" : "Devam Et"}
        </Button>
      </div>
    </div>
  );
}
