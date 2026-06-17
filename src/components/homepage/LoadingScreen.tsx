"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 500);
    const iv = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(100, p + Math.random() * 14 + 4);
        if (next >= 100) clearInterval(iv);
        return next;
      });
    }, 140);
    return () => { clearTimeout(t1); clearInterval(iv); };
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      const t = setTimeout(() => { setPhase(2); onComplete(); }, 450);
      return () => clearTimeout(t);
    }
  }, [progress, onComplete]);

  return (
    <AnimatePresence>
      {phase < 2 && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-cream"
          exit={{ clipPath: "inset(0 0 100% 0)", transition: { duration: 0.9, ease: [0.76, 0, 0.24, 1] } }}
        >
          <motion.div className="absolute h-[420px] w-[420px] rounded-full bg-gold/15 blur-[120px]"
            animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 2.4, repeat: Infinity }} />
          <motion.div
            initial={{ scale: 0.7, opacity: 0, filter: "blur(12px)" }}
            animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex flex-col items-center text-ink"
          >
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 14a4 4 0 1 1 1.2-7.8 4 4 0 0 1 9.6 0A4 4 0 1 1 18 14M6 14v4h12v-4M6 14h12" />
            </svg>
            <span className="mt-4 font-display text-3xl font-bold tracking-tight">
              Tavola<span className="text-gold">Rapida</span>
            </span>
            <p className="mt-2 text-xs uppercase tracking-[0.35em] text-ink/40">Gestione Ordini</p>
          </motion.div>
          <div className="absolute bottom-24 h-[3px] w-56 overflow-hidden rounded-full bg-ink/10">
            <motion.div className="h-full rounded-full bg-gold" animate={{ width: `${progress}%` }} transition={{ ease: "linear" }} />
          </div>
          <motion.span className="absolute bottom-16 text-xs tabular-nums text-ink/40" animate={{ opacity: phase >= 1 ? 1 : 0 }}>
            {Math.floor(progress)}%
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
