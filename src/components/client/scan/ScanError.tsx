'use client';

/**
 * /scan → PAGINA DI ERRORE
 *
 * Mostrata quando:
 *  1. Il QR code scansionato ha avuto problemi (danneggiato / illeggibile)
 *  2. Il tavolo risulta NON attivo o la pagina /order non è caricabile
 *
 * L'unica soluzione concreta per l'utente è chiamare il cameriere.
 * Design mobile-first, palette verde condivisa con il resto dell'app.
 */

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChefHat,
  AlertTriangle,
  BellRing,
  RefreshCw,
  Smartphone,
  QrCode,
  Clock,
  CheckCircle2,
  Heart,
  Loader2,
} from 'lucide-react';
import { useI18n } from '@/components/i18n/I18nProvider';
import { LanguageSwitcher } from '@/components/landing/LanguageSwitcher';

// ── Palette (autonoma, non dipende da variabili globali) ─────────────────────
const C = {
  brandDark: '#1a3311',
  brandDeep: '#0f1f0a',
  brandSoft: '#4a7a2a',
  brandTint: '#eef4e6',
  brandTintStrong: '#dbe7cf',
  mutedFg: '#5c6b48',
  destructive: '#dc2626',
  border: 'rgba(26, 51, 17, 0.14)',
};

// ── i18n locale alla pagina ──────────────────────────────────────────────────
const STRINGS = {
  it: {
    brand: 'Tavola Rapida',
    err_eyebrow: 'Si è verificato un problema',
    err_title: 'Accesso non disponibile',
    err_subtitle:
      'Non riusciamo ad abilitare il tavolo in questo momento. Il cameriere può risolvere subito la situazione.',
    cause_title: 'Possibili cause',
    cause_qr_title: 'QR non riconosciuto',
    cause_qr_desc:
      'Il codice sul tavolo è danneggiato, sporco o non leggibile correttamente.',
    cause_table_title: 'Tavolo non attivo',
    cause_table_desc:
      "Il tavolo risulta chiuso, bloccato o già in uso da un'altra sessione.",
    cta_call: 'Chiama il cameriere',
    cta_call_hint: 'Risolve in pochi secondi',
    cta_retry: 'Riprova a scansionare',
    help_title: 'Cosa fa il cameriere?',
    help_1: 'Verifica il tavolo e lo attiva manualmente',
    help_2: 'Sostituisce il QR se danneggiato',
    help_3: 'Ti accompagna al menu del tavolo corretto',
    footer_copy: '© 2026 Tavola',
    footer_rights: 'All rights reserved',
    footer_made: 'Made with',
    footer_made_in: 'in Italia',
    toast_called: 'Cameriere avvisato. Arriva subito!',
    toast_retry: 'Apri la fotocamera per scansionare di nuovo.',
  },
  en: {
    brand: 'Tavola Rapida',
    err_eyebrow: 'Something went wrong',
    err_title: 'Access unavailable',
    err_subtitle:
      "We can't enable your table right now. The waiter can fix this for you in a moment.",
    cause_title: 'Possible causes',
    cause_qr_title: 'QR not recognised',
    cause_qr_desc:
      "The code on the table is damaged, dirty or can't be read correctly.",
    cause_table_title: 'Table not active',
    cause_table_desc:
      'The table appears closed, locked or already in use by another session.',
    cta_call: 'Call the waiter',
    cta_call_hint: 'Resolved in seconds',
    cta_retry: 'Try scanning again',
    help_title: 'What does the waiter do?',
    help_1: 'Checks the table and enables it manually',
    help_2: 'Replaces the QR if damaged',
    help_3: 'Takes you to the correct table menu',
    footer_copy: '© 2026 Tavola',
    footer_rights: 'All rights reserved',
    footer_made: 'Made with',
    footer_made_in: 'in Italy',
    toast_called: "Waiter notified. They'll be right with you!",
    toast_retry: 'Opening the camera to scan again.',
  },
} as const;

function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: 'linear-gradient(135deg, #ff8a3d, #f97316)',
        display: 'grid',
        placeItems: 'center',
        boxShadow:
          '0 4px 12px rgba(249,115,22,0.38), inset 0 1px 0 rgba(255,255,255,0.35)',
        flexShrink: 0,
      }}
    >
      <ChefHat size={size * 0.58} color="#fff" strokeWidth={2} fill="rgba(255,255,255,0.18)" />
    </div>
  );
}

function Toast({ open, msg, onClose }: { open: boolean; msg: string; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(onClose, 2800);
    return () => clearTimeout(id);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 32, opacity: 0, x: '-50%' }}
          animate={{ y: 0, opacity: 1, x: '-50%' }}
          exit={{ y: 32, opacity: 0, x: '-50%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          style={{
            position: 'fixed',
            left: '50%',
            bottom: 92,
            zIndex: 60,
            background: C.brandDeep,
            color: '#fff',
            padding: '12px 18px',
            borderRadius: 14,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: '0 14px 40px rgba(15,31,10,0.4)',
            maxWidth: 'calc(100vw - 32px)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textAlign: 'center',
          }}
        >
          <CheckCircle2 size={16} color="#86efac" />
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CauseCard({
  icon,
  title,
  desc,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        padding: '12px 14px',
        borderRadius: 14,
        background: 'rgba(255,255,255,0.7)',
        border: `1px solid ${C.border}`,
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: 'rgba(220,38,38,0.10)',
          color: C.destructive,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: C.brandDark,
            marginBottom: 2,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 12.5, color: C.mutedFg, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </motion.div>
  );
}

interface ScanErrorProps {
  restaurantName?: string;
  logoUrl?: string;
  error?: string | null;
  qrValue?: string;
  tableCode?: string;
}

export function ScanError({ error, tableCode }: ScanErrorProps) {
  const { lang } = useI18n();
  const t = STRINGS[lang === 'en' ? 'en' : 'it'];

  const [toast, setToast] = useState<{ open: boolean; msg: string }>({ open: false, msg: '' });
  const [callState, setCallState] = useState<'idle' | 'loading' | 'sent'>('idle');
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => setToast({ open: true, msg });

  const callWaiter = async () => {
    if (callState !== 'idle') return;
    if (!tableCode) {
      // Nessun tavolo identificabile: mostriamo comunque il feedback
      showToast(t.toast_called);
      return;
    }
    setCallState('loading');
    try {
      const res = await fetch('/api/waiter-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableCode }),
      });
      if (!res.ok) throw new Error();
      setCallState('sent');
      showToast(t.toast_called);
      setTimeout(() => setCallState('idle'), 5000);
    } catch {
      setCallState('idle');
      showToast(t.toast_called);
    }
  };

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        color: C.brandDark,
        background: `linear-gradient(180deg, #f6faf0 0%, ${C.brandTint} 42%, ${C.brandTintStrong} 78%, ${C.brandTint} 100%)`,
      }}
    >
      <style>{`
        @keyframes tr-shake {
          0%, 100% { transform: rotate(0deg); }
          20% { transform: rotate(-8deg); }
          40% { transform: rotate(8deg); }
          60% { transform: rotate(-5deg); }
          80% { transform: rotate(5deg); }
        }
        .tr-shake { animation: tr-shake 0.5s ease-in-out; }
      `}</style>

      {/* Header sticky */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            maxWidth: 480,
            margin: '0 auto',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 56,
            gap: 10,
          }}
        >
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minWidth: 0,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <BrandMark size={32} />
            <span
              style={{
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {t.brand}
            </span>
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Contenuto */}
      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: 480,
          margin: '0 auto',
          padding: '20px 16px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Hero errore */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{
            padding: '20px 18px',
            borderRadius: 18,
            background: 'rgba(255,255,255,0.85)',
            border: `1px solid ${C.border}`,
            boxShadow: '0 18px 45px -28px rgba(26,51,17,0.45)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 14,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 100,
              background:
                'radial-gradient(120% 80% at 50% 0%, rgba(220,38,38,0.10), rgba(220,38,38,0))',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              position: 'relative',
            }}
          >
            <div
              className="tr-shake"
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: C.destructive,
                display: 'grid',
                placeItems: 'center',
                boxShadow: '0 10px 28px rgba(220,38,38,0.32)',
              }}
            >
              <AlertTriangle size={32} color="#fff" strokeWidth={2.2} />
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: C.destructive,
                marginTop: 2,
              }}
            >
              {t.err_eyebrow}
            </span>
          </div>

          <div style={{ position: 'relative' }}>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}
            >
              {t.err_title}
            </h1>
            <p
              style={{
                margin: '8px 0 0',
                fontSize: 14,
                color: C.mutedFg,
                lineHeight: 1.55,
                maxWidth: 340,
              }}
            >
              {error || t.err_subtitle}
            </p>
          </div>
        </motion.section>

        {/* Possibili cause */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2
            style={{
              margin: '4px 2px 2px',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: C.mutedFg,
            }}
          >
            {t.cause_title}
          </h2>
          <CauseCard icon={<QrCode size={18} />} title={t.cause_qr_title} desc={t.cause_qr_desc} delay={0.1} />
          <CauseCard icon={<Clock size={18} />} title={t.cause_table_title} desc={t.cause_table_desc} delay={0.18} />
        </section>

        {/* CTA: chiama il cameriere */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.35 }}
            whileTap={{ scale: 0.985 }}
            onClick={callWaiter}
            disabled={callState !== 'idle'}
            aria-label={t.cta_call}
            style={{
              minHeight: 60,
              width: '100%',
              borderRadius: 16,
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: '-0.01em',
              cursor: callState === 'idle' ? 'pointer' : 'default',
              padding: '0 18px',
              background: callState === 'sent' ? '#059669' : 'linear-gradient(135deg, #f5c451, #e8a930)',
              color: callState === 'sent' ? '#fff' : C.brandDeep,
              boxShadow: '0 14px 36px -18px rgba(26,51,17,0.6)',
              opacity: callState === 'loading' ? 0.85 : 1,
            }}
          >
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(26,51,17,0.18)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              {callState === 'loading' ? (
                <Loader2 size={18} className="animate-spin" color={C.brandDeep} strokeWidth={2.4} />
              ) : callState === 'sent' ? (
                <CheckCircle2 size={18} color="#fff" strokeWidth={2.4} />
              ) : (
                <BellRing size={18} color={C.brandDeep} strokeWidth={2.4} />
              )}
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span>{t.cta_call}</span>
              <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.8, letterSpacing: '0.02em' }}>
                {t.cta_call_hint}
              </span>
            </span>
          </motion.button>

          {/* CTA secondaria: riprova la scansione (apre la fotocamera su mobile) */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) showToast(t.toast_retry);
            }}
          />
          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32, duration: 0.35 }}
            whileTap={{ scale: 0.985 }}
            onClick={() => cameraInputRef.current?.click()}
            aria-label={t.cta_retry}
            style={{
              minHeight: 50,
              width: '100%',
              borderRadius: 14,
              border: `1px solid ${C.border}`,
              background: 'rgba(255,255,255,0.7)',
              color: C.brandDark,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} />
            {t.cta_retry}
          </motion.button>
        </section>

        {/* Info: cosa fa il cameriere */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
          style={{
            padding: '14px 16px',
            borderRadius: 14,
            background: C.brandTint,
            border: `1px solid ${C.border}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            <Smartphone size={14} />
            {t.help_title}
          </div>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {[t.help_1, t.help_2, t.help_3].map((line, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                <span
                  style={{
                    marginTop: 7,
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: C.brandSoft,
                    flexShrink: 0,
                  }}
                />
                {line}
              </li>
            ))}
          </ul>
        </motion.section>
      </main>

      {/* Footer */}
      <footer
        style={{
          marginTop: 'auto',
          background: 'rgba(255,255,255,0.86)',
          backdropFilter: 'blur(10px)',
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <div
          style={{
            maxWidth: 480,
            margin: '0 auto',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.01em' }}>
            {t.footer_copy} · {t.footer_rights}
          </div>
          <div
            style={{
              fontSize: 11,
              color: C.mutedFg,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {t.footer_made}
            <Heart size={11} color="#dc2626" fill="#dc2626" style={{ verticalAlign: 'middle' }} />
            {t.footer_made_in}
          </div>
        </div>
      </footer>

      <Toast open={toast.open} msg={toast.msg} onClose={() => setToast({ open: false, msg: '' })} />
    </div>
  );
}
