"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useSpring } from "framer-motion";
import { SCAN_URL } from "@/lib/config";

const ITEM_W = 96;

const items = [
  { id: "top", label: "HOME", href: "#top" },
  { id: "features", label: "FUNZIONI", href: "#features" },
  { id: "security", label: "SICUREZZA", href: "#security" },
  { id: "demo", label: "DEMO", href: SCAN_URL, external: true },
  { id: "contact", label: "CONTATTI", href: "#contact" },
] as const;

/* ---------------- ICONS ---------------- */
function Icon({ name }: { name: string }) {
  const s = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.45,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    width: 23,
    height: 23,
    viewBox: "0 0 24 24",
  };
  switch (name) {
    case "top":
      return (
        <svg {...s}><path d="M4 11.5 12 5l8 6.5" /><path d="M6 10.5V19h12v-8.5" /><path d="M10 19v-4.5h4V19" /></svg>
      );
    case "features":
      return (
        <svg {...s}><path d="M3.5 17h17" /><path d="M5 17a7 7 0 0 1 14 0" /><path d="M12 7V5" /><path d="M10.4 5h3.2" /></svg>
      );
    case "security":
      return (
        <svg {...s}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></svg>
      );
    case "demo":
      return (
        <svg {...s}><path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-1.5 0-3 2-3 5s1 4 3 4v9" /></svg>
      );
    case "contact":
      return (
        <svg {...s}><rect x="3.5" y="6" width="17" height="12.5" rx="2.4" /><path d="m4 8 8 5.4L20 8" /></svg>
      );
    default:
      return null;
  }
}

function ChefHat({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 18.5h11M8 18.5v-3.3M16 18.5v-3.3M12 18.5v-3.3" />
      <path d="M7.8 15.3a3.6 3.6 0 0 1-1-7 3.6 3.6 0 0 1 6.9-1.5 3.6 3.6 0 0 1 3.7 1.4 3.6 3.6 0 0 1-1.2 7.1" />
    </svg>
  );
}

/* ---------------- MAGNETIC NAV ITEM ---------------- */
function NavItem({
  it,
  href,
  i,
  on,
  onPick,
}: {
  it: (typeof items)[number];
  href: string;
  i: number;
  on: boolean;
  onPick: (i: number, ext?: boolean) => void;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useSpring(0, { stiffness: 280, damping: 18 });
  const y = useSpring(0, { stiffness: 280, damping: 18 });
  const [hover, setHover] = useState(false);
  const ext = "external" in it && it.external;

  const move = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * 0.35);
    y.set((e.clientY - (r.top + r.height / 2)) * 0.35 - 3);
  };
  const leave = () => {
    x.set(0);
    y.set(0);
    setHover(false);
  };

  return (
    <motion.a
      ref={ref}
      href={href}
      {...(ext ? { rel: "noopener" } : {})}
      onClick={() => onPick(i, ext)}
      onMouseMove={move}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={leave}
      style={{ x, y, width: ITEM_W, color: on || hover ? "#B6794C" : "#6f5e4c", cursor: "pointer" }}
      className="relative z-[4] flex flex-col items-center justify-center gap-2 will-change-transform"
    >
      <motion.span
        animate={{ y: hover ? -3 : 0, scale: hover ? 1.2 : 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 13 }}
      >
        <Icon name={it.id} />
      </motion.span>
      <span className="text-[11px] font-semibold tracking-[0.15em]">{it.label}</span>
    </motion.a>
  );
}

/* ---------------- NAVBAR ---------------- */
export default function KnifeNav() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const toHref = (hash: string) => (isHome ? hash : `/${hash}`);
  const logoHref = isHome ? "#top" : "/";

  const [active, setActive] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const lock = useRef(false);

  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => {
      setScrolled(window.scrollY > 18);
      if (lock.current) return;
      const idx = items
        .map((it, i) => {
          if ("external" in it && it.external) return null;
          const el = document.getElementById(it.id);
          return el ? { i, top: Math.abs(el.getBoundingClientRect().top - 130) } : null;
        })
        .filter(Boolean)
        .sort((a: any, b: any) => a.top - b.top)[0];
      if (idx) setActive((idx as any).i);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const pick = (i: number, external?: boolean) => {
    if (external) return;
    setActive(i);
    lock.current = true;
    setTimeout(() => (lock.current = false), 700);
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center"
      style={{ paddingTop: scrolled ? 12 : 24, transition: "padding-top .5s cubic-bezier(.22,.61,.36,1)" }}
    >
      {/* ── DESKTOP: knife ── */}
      <div
        className="pointer-events-auto hidden origin-top md:block"
        style={{ transform: `scale(${scrolled ? 0.9 : 1})`, transition: "transform .5s cubic-bezier(.22,.61,.36,1)" }}
      >
        <div
          className="relative flex items-stretch"
          style={{
            height: 120,
            width: "min(960px, 94vw)",
            filter: "drop-shadow(0 26px 38px rgba(74,48,22,.26)) drop-shadow(0 5px 9px rgba(74,48,22,.16))",
          }}
        >
          {/* BLADE */}
          <div
            className="relative flex flex-1 items-center"
            style={{
              borderRadius: "60px 6px 6px 60px",
              background: "linear-gradient(177deg,#fefdfa 0%,#f4f0e8 38%,#ece6da 60%,#ddd5c6 100%)",
              boxShadow:
                "inset 0 2px 0 rgba(255,255,255,.95), inset 0 -4px 9px rgba(120,90,55,.14), inset 0 0 0 1px rgba(255,255,255,.5)",
            }}
          >
            {/* sheen */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                borderRadius: "inherit",
                opacity: 0.5,
                background: "linear-gradient(102deg,transparent 28%,rgba(255,255,255,.6) 46%,transparent 58%)",
              }}
            />

            {/* logo */}
            <a href={logoHref} onClick={() => pick(0)} className="z-[2] flex items-center pl-11 pr-1.5" style={{ color: "#B6794C" }}>
              <span className="mr-2 font-display text-2xl font-light tracking-[0.2em]">TR</span>
              <ChefHat />
            </a>
            <div
              className="z-[2] mx-1.5 h-[52px] w-px"
              style={{ background: "linear-gradient(180deg,transparent,rgba(120,90,55,.28),transparent)" }}
            />

            {/* nav items */}
            <div className="relative z-[2] flex h-full items-stretch pr-3.5">
              {/* sliding white panel */}
              <motion.div
                className="absolute bottom-4 top-4 left-0 z-[1]"
                style={{
                  width: ITEM_W,
                  borderRadius: 18,
                  background: "linear-gradient(180deg,#fffefb,#f5f0e6)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,.95),0 8px 18px -11px rgba(120,90,50,.5)",
                }}
                animate={{ x: active * ITEM_W }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
              />
              {/* sliding underline */}
              <motion.div
                className="absolute bottom-[23px] left-[34px] z-[3] h-[2.5px] w-7 rounded"
                style={{ background: "linear-gradient(90deg,#d8b98f,#B6794C)" }}
                animate={{ x: active * ITEM_W }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
              />

              {items.map((it, i) => {
                const ext = "external" in it && it.external;
                const href = ext ? it.href : toHref(it.href);
                return <NavItem key={it.id} it={it} href={href} i={i} on={!ext && active === i} onPick={pick} />;
              })}
            </div>
          </div>

          {/* BOLSTER */}
          <div
            className="relative z-[5] -mx-[7px] w-[30px] self-stretch"
            style={{
              background: "linear-gradient(177deg,#f0f0ee,#cccdc9 48%,#a6a6a1)",
              clipPath: "polygon(42% 0,100% 0,100% 100%,0 100%)",
              boxShadow: "inset 0 2px 0 rgba(255,255,255,.75)",
            }}
          />

          {/* HANDLE = demo */}
          <a
            href={SCAN_URL}
            rel="noopener"
            className="relative flex flex-col items-center justify-center gap-[7px] overflow-hidden transition-[filter,transform] duration-300 hover:-translate-y-px hover:brightness-110"
            style={{
              width: 184,
              borderRadius: "6px 66px 66px 6px",
              background: "linear-gradient(177deg,#7c5736 0%,#5d3c22 52%,#6a482c 100%)",
              boxShadow: "inset 0 2px 0 rgba(255,221,180,.22), inset 0 -9px 17px rgba(0,0,0,.32)",
              cursor: "pointer",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{ opacity: 0.55, background: "repeating-linear-gradient(94deg,rgba(20,10,0,.16) 0 1.5px,transparent 1.5px 8px)" }}
            />
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-2/5"
              style={{ background: "linear-gradient(180deg,rgba(255,225,185,.18),transparent)" }}
            />
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#d9b67e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="z-[2]">
              <path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M17 3c-1.5 0-3 2-3 5s1 4 3 4v9" />
            </svg>
            <span
              className="z-[2] text-[10px] font-semibold tracking-[0.34em]"
              style={{ color: "rgba(247,226,194,.72)", textShadow: "0 1px 1px rgba(0,0,0,.45),0 -1px 0 rgba(255,230,200,.12)" }}
            >
              AVVIA DEMO
            </span>
          </a>
        </div>
      </div>

      {/* ── MOBILE: glass bar ── */}
      <div className="pointer-events-auto relative w-[min(560px,92vw)] md:hidden">
        <div
          className="flex items-center justify-between rounded-[22px] border border-white/60 px-[18px]"
          style={{
            paddingTop: scrolled ? 12 : 24,
            paddingBottom: scrolled ? 12 : 24,
            background: "rgba(245,240,231,.72)",
            backdropFilter: "blur(18px) saturate(150%)",
            boxShadow: "0 14px 32px -14px rgba(80,55,25,.4)",
            transition: "padding .45s ease",
          }}
        >
          <a href={logoHref} className="flex items-center gap-2.5" style={{ color: "#B6794C" }}>
            <ChefHat size={28} />
            <span className="font-display text-base font-semibold tracking-tight" style={{ color: "#3a2f26" }}>TavolaRapida</span>
          </a>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="menu"
            className="flex h-[42px] w-[42px] items-center justify-center rounded-[13px] border bg-white/50"
            style={{ borderColor: "rgba(120,90,55,.16)", color: "#5a4a38" }}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 8h16M4 16h16" />}
            </svg>
          </button>
        </div>

        {open && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute inset-x-0 top-[calc(100%+10px)] rounded-3xl border border-white/60 p-3.5"
            style={{
              background: "rgba(246,241,232,.9)",
              backdropFilter: "blur(26px) saturate(150%)",
              boxShadow: "0 24px 48px -18px rgba(80,55,25,.45)",
            }}
          >
            {items.map((it, i) => {
              const ext = "external" in it && it.external;
              const href = ext ? it.href : toHref(it.href);
              return (
                <a
                  key={it.id}
                  href={href}
                  {...(ext ? { rel: "noopener" } : {})}
                  onClick={() => {
                    pick(i, ext);
                    setOpen(false);
                  }}
                  className="flex items-center gap-4 rounded-[15px] px-4 py-3.5 hover:bg-white/60"
                  style={{ color: "#4a3d30" }}
                >
                  <span style={{ color: "#B6794C" }}><Icon name={it.id} /></span>
                  <span className="text-[17px] font-medium">{it.label}</span>
                </a>
              );
            })}
            <a
              href={SCAN_URL}
              rel="noopener"
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center justify-center rounded-[15px] px-4 py-4 text-base font-semibold"
              style={{ color: "#fff8ef", background: "linear-gradient(135deg,#8a5e30,#6a482c)", boxShadow: "0 12px 26px -12px rgba(106,72,44,.7)" }}
            >
              Avvia Demo →
            </a>
          </motion.div>
        )}
      </div>
    </div>
  );
}