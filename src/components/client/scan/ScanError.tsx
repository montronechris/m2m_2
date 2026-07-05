'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, BellRing, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { BookLogo } from './BookLogo';
import { useI18n } from '@/components/i18n/I18nProvider';

interface ScanErrorProps {
  restaurantName?: string;
  logoUrl?: string;
  error?: string | null;
  qrValue?: string;
  tableCode?: string;
}

export function ScanError({ restaurantName, logoUrl, error, qrValue, tableCode }: ScanErrorProps) {
  const { tr } = useI18n();
  const t = tr.client.scan;
  const tCommon = tr.client.common;
  const [callState, setCallState] = useState<'idle' | 'loading' | 'sent'>('idle');
  const [callError, setCallError] = useState<string | null>(null);
  const callWaiter = async () => {
    if (callState !== 'idle') return;
    setCallState('loading');
    setCallError(null);
    try {
      const res = await fetch('/api/waiter-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableCode }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || tCommon.error);
      }
      setCallState('sent');
      setTimeout(() => setCallState('idle'), 5000);
    } catch (e: any) {
      setCallError(e?.message ?? tCommon.error);
      setCallState('idle');
    }
  };
  const name = (restaurantName ?? 'DEMO').toUpperCase();
  const qr = qrValue ?? (typeof window !== 'undefined' ? window.location.href : '');

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eef3df] px-6 py-10 text-[#2b3d1a]">
      {/* Background radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 45%, #f0f5da 0%, #d8e6bd 55%, #a9c07d 100%)',
        }}
      />
      {/* Soft green blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-10 -z-10 h-72 w-72 rounded-full opacity-70 blur-3xl"
        style={{
          background:
            'radial-gradient(circle at 40% 40%, #6f8f4e 0%, #4f6e34 60%, transparent 100%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 bottom-4 -z-10 h-80 w-80 rounded-full opacity-70 blur-3xl"
        style={{
          background:
            'radial-gradient(circle at 60% 50%, #6f8f4e 0%, #4f6e34 55%, transparent 100%)',
        }}
      />

      {/* Top-left Tavola Rapida brand */}
      <Link
        href="/"
        className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-[#4f6e34]/30 bg-white/70 px-3 py-1.5 text-[#3a2f26] backdrop-blur-sm transition hover:bg-white/90"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[#3f5a24] text-[10px] font-bold text-white">TR</span>
        <span className="font-display text-sm font-semibold tracking-tight">TavolaRapida</span>
      </Link>

      <div className="mx-auto flex max-w-md flex-col items-center pt-8 text-center">
        {/* Center logo */}
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={name}
            className="h-24 w-24 rounded-2xl object-cover shadow-[0_18px_45px_-22px_rgba(40,60,25,0.55)]"
          />
        ) : (
          <BookLogo className="h-24 w-24 drop-shadow-[0_18px_25px_rgba(40,60,25,0.35)]" ariaLabel={tCommon.bookLogoAria} />
        )}

        <h1 className="mt-3 font-serif text-4xl font-extrabold tracking-wide text-[#3f5a24]">
          {name}
        </h1>
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.3em] text-[#5e7e34]">
          {tCommon.welcome}
        </p>

        <h2 className="mt-6 font-serif text-3xl font-extrabold text-[#2b3d1a]">
          {t.accessFailed}
        </h2>
        <p className="mt-2 text-sm text-[#4f6e34]">
          {error || t.tableInactive}
        </p>

        {/* QR code framed */}
        <div className="relative mt-8 rounded-2xl border-2 border-[#c9a24b] bg-[#f7f3df] p-3 shadow-[0_16px_35px_-18px_rgba(30,50,15,0.5)]">
          <QRCodeSVG
            value={qr || 'https://tavolarapida.app'}
            size={220}
            level="M"
            bgColor="#f7f3df"
            fgColor="#2b3d1a"
          />
          <svg
            aria-hidden
            viewBox="0 0 100 100"
            className="pointer-events-none absolute inset-0 h-full w-full"
            style={{ filter: 'drop-shadow(0 4px 10px rgba(220,20,20,0.35))' }}
          >
            <line x1="15" y1="15" x2="85" y2="85" stroke="#dc2626" strokeWidth="8" strokeLinecap="round" />
            <line x1="85" y1="15" x2="15" y2="85" stroke="#dc2626" strokeWidth="8" strokeLinecap="round" />
          </svg>
        </div>

        {/* Bottom pill */}
        <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#2b3d1a] px-6 py-3 text-white shadow-[0_16px_35px_-18px_rgba(30,50,15,0.85)]">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#3f5a24]">
            <Smartphone className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold leading-tight">
            {t.scanAgain}
            <br />{t.askAssistance}
          </span>
        </div>

        {tableCode && (
          <button
            onClick={callWaiter}
            disabled={callState !== 'idle'}
            className={`mt-4 inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold shadow-[0_16px_35px_-18px_rgba(30,50,15,0.85)] transition disabled:opacity-80 ${
              callState === 'sent'
                ? 'bg-emerald-600 text-white'
                : 'bg-[#c9a24b] text-[#2b3d1a] hover:bg-[#d6b061]'
            }`}
          >
            {callState === 'loading' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : callState === 'sent' ? (
              <Check className="h-4 w-4" />
            ) : (
              <BellRing className="h-4 w-4" />
            )}
            {callState === 'sent' ? t.waiterCalled : callState === 'loading' ? t.sending : t.callWaiter}
          </button>
        )}
        {callError && (
          <p className="mt-2 text-xs text-red-700">{callError}</p>
        )}
      </div>
    </main>
  );
}
