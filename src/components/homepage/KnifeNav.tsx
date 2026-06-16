"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useSpring } from "framer-motion";
import { SCAN_URL } from "@/lib/config";

const items = [
  { id: "top", label: "HOME", icon: null, href: "#top" },
  { id: "features", label: "FUNZIONI", icon: "dome", href: "#features" },
  { id: "security", label: "SICUREZZA", icon: "shield", href: "#security" },
  { id: "demo", label: "DEMO", icon: "utensils", href: SCAN_URL, external: true },
  { id: "contact", label: "CONTATTI", icon: "mail", href: "#contact" },
] as const;

function Icon({ name }: { name: string }) {
  const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  switch (name) {
    case "dome": return <svg width="22" height="22" viewBox="0 0 24 24" {...s}><path d="M4 16h16M5 16a7 7 0 0 1 14 0M12 6V9M12 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" /></svg>;
    case "shield": return <svg width="22" height="22" viewBox="0 0 24 24" {...s}><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" /><path d="M9.5 12l1.8 1.8L15 10" /></svg>;
    case "utensils": return <svg width="22" height="22" viewBox="0 0 24 24" {...s}><path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-1.5 0-3 2-3 5s1 4 3 4v9" /></svg>;
    case "mail": return <svg width="22" height="22" viewBox="0 0 24 24" {...s}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M4 7l8 6 8-6" /></svg>;
    default: return null;
  }
}

function ChefHat({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 14a4 4 0 1 1 1.2-7.8 4 4 0 0 1 9.6 0A4 4 0 1 1 18 14M6 14v4h12v-4M6 14h12" />
    </svg>
  );
}

/* nav item magnetico: segue il mouse + si solleva (classico) */
function MagItem({ it, active, onClick }: { it: (typeof items)[number]; active: boolean; onClick: () => void; }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useSpring(0, { stiffness: 280, damping: 18 });
  const y = useSpring(0, { stiffness: 280, damping: 18 });
  const [hover, setHover] = useState(false);
  const move = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * 0.4);
    y.set((e.clientY - (r.top + r.height / 2)) * 0.4 - 3);
  };
  const leave = () => { x.set(0); y.set(0); setHover(false); };
  return (
    <motion.a ref={ref} href={it.href} {...(("external" in it && it.external) ? { rel: "noopener" } : {})}
      onClick={onClick} onMouseMove={move} onMouseEnter={() => setHover(true)} onMouseLeave={leave}
      style={{ x, y, color: active || hover ? "#B6794C" : "#6B5B4A" }}
      className="relative flex flex-col items-center gap-1 px-2 transition-colors will-change-transform">
      {it.icon && (
        <motion.span animate={{ y: hover ? -3 : 0, scale: hover ? 1.12 : 1 }} transition={{ type: "spring", stiffness: 400, damping: 14 }}>
          <Icon name={it.icon} />
        </motion.span>
      )}
      <span className="font-display text-[15px] font-semibold tracking-[0.12em]">{it.label}</span>
      {active && <motion.span layoutId="knife-underline" className="absolute -bottom-1 h-[2px] w-6 rounded-full bg-gold" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
      {!active && <motion.span className="absolute -bottom-1 h-[2px] rounded-full bg-gold/60" initial={false} animate={{ width: hover ? 18 : 0 }} transition={{ duration: 0.25 }} />}
    </motion.a>
  );
}

export default function KnifeNav() {
  const [active, setActive] = useState("top");
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      const here = items.filter((i) => !("external" in i && i.external))
        .map((i) => { const el = document.getElementById(i.id); return el ? { id: i.id, top: Math.abs(el.getBoundingClientRect().top - 120) } : null; })
        .filter(Boolean).sort((a, b) => a!.top - b!.top)[0];
      if (here) setActive(here!.id);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <motion.div initial={{ y: -90, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative hidden w-full max-w-6xl md:block"
        style={{ filter: scrolled ? "drop-shadow(0 14px 30px rgba(43,38,32,0.18))" : "none" }}>
        <svg viewBox="0 0 1280 116" className="w-full" style={{ display: "block" }}>
          <defs>
            <linearGradient id="blade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FCFAF5" /><stop offset="1" stopColor="#ECE3D3" /></linearGradient>
            <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#EFEDE8" /><stop offset="0.45" stopColor="#C9C6C0" /><stop offset="1" stopColor="#9C988F" /></linearGradient>
            <linearGradient id="handle" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9A6740" /><stop offset="0.5" stopColor="#7A4F30" /><stop offset="1" stopColor="#4E311D" /></linearGradient>
            <linearGradient id="rivet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#E6E2DA" /><stop offset="1" stopColor="#8C887F" /></linearGradient>
          </defs>
          <path d="M95 18 L980 18 Q1045 18 1062 60 Q1052 88 1000 94 L95 100 A41 41 0 0 0 95 18 Z" fill="url(#blade)" stroke="#E0D4BE" strokeWidth="1.5" />
          <path d="M120 24 L975 24" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.7" strokeLinecap="round" />
          <rect x="990" y="24" width="36" height="68" rx="11" fill="url(#steel)" />
          <rect x="996" y="28" width="5" height="60" rx="2.5" fill="#FFFFFF" opacity="0.45" />
          <rect x="1018" y="33" width="234" height="50" rx="25" fill="url(#handle)" />
          <path d="M1040 40 Q1140 36 1238 41" stroke="#C68A5C" strokeWidth="2.2" fill="none" opacity="0.6" strokeLinecap="round" />
          <path d="M1040 56 Q1140 52 1240 57" stroke="#3C2614" strokeWidth="1" fill="none" opacity="0.4" />
          <path d="M1040 64 Q1140 61 1238 65" stroke="#3C2614" strokeWidth="1" fill="none" opacity="0.3" />
          <path d="M1045 49 Q1140 47 1232 50" stroke="#5C3A22" strokeWidth="1" fill="none" opacity="0.35" />
          <circle cx="1072" cy="58" r="6" fill="url(#rivet)" stroke="#3C2614" strokeWidth="0.8" />
          <circle cx="1150" cy="58" r="6" fill="url(#rivet)" stroke="#3C2614" strokeWidth="0.8" />
          <circle cx="1072" cy="58" r="2" fill="#6B655C" /><circle cx="1150" cy="58" r="2" fill="#6B655C" />
          <circle cx="1230" cy="58" r="6" fill="none" stroke="#C9A878" strokeWidth="1.6" opacity="0.6" />
        </svg>

        <a href="#top" className="absolute left-[4.5%] top-1/2 flex -translate-y-1/2 items-center gap-2 text-ink/70 transition-colors hover:text-gold">
          <span className="font-display text-xl font-light tracking-[0.2em]">TR</span>
          <ChefHat size={28} />
        </a>

        <nav className="absolute inset-y-0 left-[17%] right-[23%] flex items-center justify-between">
          {items.map((it) => {
            const ext = "external" in it && it.external;
            return <MagItem key={it.id} it={it} active={!ext && active === it.id} onClick={() => { if (!ext) setActive(it.id); }} />;
          })}
        </nav>
      </motion.div>

      <div className="flex w-full items-center justify-between rounded-2xl border border-ink/10 bg-cream-50/90 px-4 py-3 shadow-card backdrop-blur md:hidden">
        <a href="#top" className="flex items-center gap-1.5 font-display font-bold text-ink">
          <span className="text-base font-light tracking-[0.18em]">TR</span><ChefHat size={24} /> TavolaRapida
        </a>
        <button onClick={() => setOpen((o) => !o)} aria-label="menu" className="text-ink">
          <div className="space-y-1.5"><span className="block h-0.5 w-6 bg-ink" /><span className="block h-0.5 w-6 bg-ink" /></div>
        </button>
      </div>
      {open && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="absolute top-20 w-[92%] rounded-2xl border border-ink/10 bg-cream-50 p-4 shadow-soft md:hidden">
          {items.map((it) => (
            <a key={it.id} href={it.href} {...(("external" in it && it.external) ? { rel: "noopener" } : {})}
               onClick={() => setOpen(false)} className="block py-2 font-display tracking-wide text-ink/80">{it.label}</a>
          ))}
        </motion.div>
      )}
    </header>
  );
}
