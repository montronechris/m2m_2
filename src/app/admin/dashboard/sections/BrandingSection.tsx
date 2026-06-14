// src/app/admin/dashboard/sections/BrandingSection.tsx

"use client";

import React, { useState, useEffect, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Palette, Upload, Save, AlertCircle,
  CheckCircle2, Loader2, Globe, Phone,
  MapPin, Instagram, Facebook, Star, ImageIcon,
  MessageSquare,
} from "lucide-react";
import type { RestaurantCtx, ThemeMode } from "../page";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BrandingData {
  name:            string;
  tagline:         string;
  logo_url:        string;
  cover_url:       string;
  brand_color:     string;
  welcome_message: string;
  confirm_message: string;
  address:         string;
  phone:           string;
  instagram:       string;
  facebook:        string;
  tripadvisor:     string;
  website:         string;
}

const DEFAULTS: BrandingData = {
  name: "", tagline: "", logo_url: "", cover_url: "",
  brand_color: "#10b981", welcome_message: "", confirm_message: "",
  address: "", phone: "", instagram: "", facebook: "", tripadvisor: "", website: "",
};

const BRAND_PALETTE: { hex: string; name: string }[] = [
  { hex: "#22c55e", name: "Verde"    },
  { hex: "#059669", name: "Smeraldo" },
  { hex: "#3b82f6", name: "Blu"      },
  { hex: "#6366f1", name: "Viola"    },
  { hex: "#f59e0b", name: "Giallo"   },
  { hex: "#94a3b8", name: "Grigio"   },
  { hex: "#14b8a6", name: "Teal"     },
  { hex: "#f97316", name: "Arancio"  },
];

// ─── Sub-components (FUORI dal componente principale per evitare re-mount) ────

const Field = ({
  label, value, onChange, placeholder, type = "text", hint, inputCls, mutedCls,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; hint?: string;
  inputCls: string; mutedCls: string;
}) => (
  <div>
    <label className={`block text-xs font-semibold uppercase tracking-wide ${mutedCls} mb-1`}>
      {label}
    </label>
    {hint && <p className={`text-xs ${mutedCls} mb-1.5`}>{hint}</p>}
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-4 py-2.5 border-2 rounded-xl text-sm outline-none transition-colors ${inputCls}`}
    />
  </div>
);

const TextArea = ({
  label, value, onChange, placeholder, hint, rows = 3, inputCls, mutedCls,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; hint?: string; rows?: number;
  inputCls: string; mutedCls: string;
}) => (
  <div>
    <label className={`block text-xs font-semibold uppercase tracking-wide ${mutedCls} mb-1`}>
      {label}
    </label>
    {hint && <p className={`text-xs ${mutedCls} mb-1.5`}>{hint}</p>}
    <textarea
      rows={rows}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-4 py-2.5 border-2 rounded-xl text-sm outline-none transition-colors resize-none ${inputCls}`}
    />
  </div>
);

const SectionCard = ({
  icon: Icon, title, children, color = "green", cardCls, bordCls, txtCls,
}: {
  icon: React.ElementType; title: string; children: React.ReactNode;
  color?: string; cardCls: string; bordCls: string; txtCls: string;
}) => (
  <div className={`${cardCls} rounded-2xl border ${bordCls} overflow-hidden`}>
    <div className={`flex items-center gap-3 px-6 py-4 border-b ${bordCls}`}>
      <div className={`w-8 h-8 rounded-xl bg-${color}-500/15 flex items-center justify-center`}>
        <Icon className={`w-4 h-4 text-${color}-400`} />
      </div>
      <h3 className={`font-semibold text-sm ${txtCls}`}>{title}</h3>
    </div>
    <div className="px-6 py-5 space-y-4">{children}</div>
  </div>
);

// ─── ImageUploader ────────────────────────────────────────────────────────────

function ImageUploader({
  label, hint, currentUrl, fieldName, restaurantId, onUploaded, theme,
}: {
  label: string; hint: string; currentUrl: string;
  fieldName: "logo" | "cover"; restaurantId: string;
  onUploaded: (url: string) => void; theme: ThemeMode;
}) {
  const dark   = theme === "dark";
  const muted  = dark ? "#a8a29e" : "#78716c";
  const border = dark ? "rgba(255,255,255,0.08)" : "#e7e5e4";
  const areaBg = dark ? "rgba(255,255,255,0.03)" : "#fafaf9";
  const txtC   = dark ? "#f5f5f4" : "#1c1917";

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { setError("Carica un file immagine (jpg, png, webp)."); return; }
    if (file.size > 5 * 1024 * 1024)    { setError("Dimensione massima: 5 MB."); return; }
    setError(null); setUploading(true);
    try {
      const ext  = file.name.split(".").pop();
      const path = `${restaurantId}/${fieldName}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("restaurant-logos").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("restaurant-logos").getPublicUrl(path);
      onUploaded(data.publicUrl + "?t=" + Date.now());
    } catch (e: any) {
      setError(e.message || "Errore upload.");
    } finally {
      setUploading(false);
    }
  };

  const isLogo = fieldName === "logo";

  return (
    <div>
      <p style={{ fontSize: 13, fontWeight: 600, color: txtC, marginBottom: 6 }}>{label}</p>
      <p style={{ fontSize: 12, color: muted, marginBottom: 10 }}>{hint}</p>
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onDragOver={e => e.preventDefault()}
        style={{
          border: `2px dashed ${border}`, borderRadius: isLogo ? 16 : 14,
          background: areaBg, cursor: "pointer", overflow: "hidden",
          position: "relative", height: isLogo ? 120 : 160,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {currentUrl ? (
          <img src={currentUrl} alt={label} style={{
            width: isLogo ? 80 : "100%", height: isLogo ? 80 : "100%",
            objectFit: isLogo ? "contain" : "cover", borderRadius: isLogo ? 12 : 0,
          }} />
        ) : (
          <div style={{ textAlign: "center", padding: 20 }}>
            <ImageIcon style={{ width: 32, height: 32, color: muted, margin: "0 auto 8px", display: "block" }} />
            <p style={{ fontSize: 13, color: muted }}>Trascina qui o clicca per caricare</p>
          </div>
        )}
        {uploading && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Loader2 style={{ width: 28, height: 28, color: "#fff", animation: "spin 1s linear infinite" }} />
          </div>
        )}
      </div>
      {error && <p style={{ fontSize: 12, color: "#f87171", marginTop: 6 }}>{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
}

// ─── BrandingSection ──────────────────────────────────────────────────────────

interface Props { ctx: RestaurantCtx; theme: ThemeMode; }

export function BrandingSection({ ctx, theme }: Props) {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const dark  = theme === "dark";
  const card  = dark ? "bg-[#13131e]"   : "bg-white";
  const bord  = dark ? "border-white/8" : "border-gray-200";
  const txt   = dark ? "text-white"     : "text-gray-900";
  const muted = dark ? "text-gray-400"  : "text-gray-500";
  const input = dark
    ? "bg-[#0e0d0b] border-white/10 text-white placeholder-gray-600 focus:border-green-500"
    : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-green-500";
  const C = {
    txt:  dark ? "#f5f5f4" : "#1c1917",
    card: dark ? "#13131e" : "#ffffff",
  };

  const [data,    setData]    = useState<BrandingData>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: r, error: e } = await supabase
          .from("restaurants")
          .select("name,tagline,logo_url,cover_url,brand_color,welcome_message,confirm_message,address,phone,instagram,facebook,tripadvisor,website")
          .eq("id", ctx.restaurantId).single();
        if (e) throw e;
        setData({
          name:            r.name            ?? "",
          tagline:         r.tagline         ?? "",
          logo_url:        r.logo_url        ?? "",
          cover_url:       r.cover_url       ?? "",
          brand_color:     r.brand_color     ?? "#10b981",
          welcome_message: r.welcome_message ?? "",
          confirm_message: r.confirm_message ?? "",
          address:         r.address         ?? "",
          phone:           r.phone           ?? "",
          instagram:       r.instagram       ?? "",
          facebook:        r.facebook        ?? "",
          tripadvisor:     r.tripadvisor     ?? "",
          website:         r.website         ?? "",
        });
      } catch { setError("Errore nel caricamento del profilo."); }
      finally  { setLoading(false); }
    };
    load();
  }, [ctx.restaurantId]);

  const set = (field: keyof BrandingData) => (val: string) =>
    setData(prev => ({ ...prev, [field]: val }));

  const handleSave = async () => {
    setSaving(true); setError(null); setSaved(false);
    try {
      const { error: e } = await supabase.from("restaurants").update({
        name:            data.name.trim() || ctx.restaurantName,
        tagline:         data.tagline,
        logo_url:        data.logo_url    || null,
        cover_url:       data.cover_url   || null,
        brand_color:     data.brand_color,
        welcome_message: data.welcome_message,
        confirm_message: data.confirm_message,
        address:         data.address,
        phone:           data.phone,
        instagram:       data.instagram,
        facebook:        data.facebook,
        tripadvisor:     data.tripadvisor,
        website:         data.website,
      }).eq("id", ctx.restaurantId);
      if (e) throw e;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message || "Errore nel salvataggio.");
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-10 h-10 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
    </div>
  );

  const SaveBtn = ({ cls }: { cls: string }) => (
    <button onClick={handleSave} disabled={saving}
      className={`flex items-center gap-2 rounded-xl bg-green-500 hover:bg-green-400 disabled:opacity-60 text-white font-semibold transition-all shadow-lg shadow-green-500/20 ${cls}`}>
      {saving ? <Loader2 className="w-4 h-4 animate-spin" />
        : saved ? <CheckCircle2 className="w-4 h-4" />
        : <Save className="w-4 h-4" />}
      {saving ? "Salvataggio…" : saved ? "Salvato!" : "Salva modifiche"}
    </button>
  );

  return (
    <div className="p-6 space-y-5 max-w-4xl w-full mx-auto">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/15 flex items-center justify-center">
            <Palette className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className={`text-xl font-bold ${txt}`}>Branding</h2>
            <p className={`text-xs ${muted}`}>Identità visiva e informazioni pubbliche</p>
          </div>
        </div>
        <SaveBtn cls="px-5 py-2.5 text-sm" />
      </div>

      {error && (
        <div className="flex items-start gap-3 px-5 py-4 rounded-2xl bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* ANTEPRIMA */}
      <div className={`${card} rounded-2xl border ${bord} px-6 py-4 flex items-center gap-4`}>
        {data.logo_url ? (
          <img src={data.logo_url} alt="logo" style={{ width: 52, height: 52, borderRadius: 14, objectFit: "contain", flexShrink: 0, background: dark ? "#1e1c1a" : "#f5f3ec" }} />
        ) : (
          <div style={{ width: 52, height: 52, borderRadius: 14, background: data.brand_color + "22", border: `2px dashed ${data.brand_color}55`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ImageIcon style={{ width: 20, height: 20, color: data.brand_color }} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className={`font-bold text-base truncate ${txt}`}>{data.name || ctx.restaurantName}</p>
          {data.tagline
            ? <p className="text-xs truncate mt-0.5" style={{ color: data.brand_color }}>{data.tagline}</p>
            : <p className="text-xs mt-0.5" style={{ color: dark ? "#4a4642" : "#c8c4b8" }}>Aggiungi una descrizione…</p>
          }
        </div>
        <div style={{ width: 14, height: 14, borderRadius: "50%", background: data.brand_color, flexShrink: 0 }} />
      </div>

      {/* IMMAGINI */}
      <SectionCard icon={ImageIcon} title="Logo e copertina" color="blue" cardCls={card} bordCls={bord} txtCls={txt}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ImageUploader label="Icona ristorante (logo)" hint="Consigliato: 400×400px, sfondo trasparente (PNG)"
            currentUrl={data.logo_url} fieldName="logo" restaurantId={ctx.restaurantId}
            onUploaded={set("logo_url")} theme={theme} />
          <ImageUploader label="Immagine di copertina" hint="Consigliato: 1200×400px — appare in cima alla pagina menu"
            currentUrl={data.cover_url} fieldName="cover" restaurantId={ctx.restaurantId}
            onUploaded={set("cover_url")} theme={theme} />
        </div>
      </SectionCard>

      {/* IDENTITÀ VISIVA */}
      <SectionCard icon={Palette} title="Identità visiva" color="purple" cardCls={card} bordCls={bord} txtCls={txt}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nome ristorante" value={data.name} onChange={set("name")}
            placeholder={ctx.restaurantName} hint="Nome mostrato ai clienti sulla pagina menu"
            inputCls={input} mutedCls={muted} />
          <Field label="Descrizione" value={data.tagline} onChange={set("tagline")}
            placeholder="es. La vera cucina napoletana dal 1985"
            hint="Appare sotto il nome nella pagina menu"
            inputCls={input} mutedCls={muted} />
        </div>

        {/* Palette colori */}
        <div>
          <label className={`block text-xs font-semibold uppercase tracking-wide ${muted} mb-1`}>
            Colore tema
          </label>
          <p className={`text-xs ${muted} mb-3`}>
            Usato per bottoni, accenti e badge su tutte le pagine clienti
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {BRAND_PALETTE.map(({ hex, name }) => {
              const selected = data.brand_color === hex;
              return (
                <button
                  key={hex}
                  onClick={() => set("brand_color")(hex)}
                  title={name}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    background: "none", border: "none", cursor: "pointer", padding: 4,
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%", background: hex,
                    outline: selected ? `3px solid ${hex}` : "3px solid transparent",
                    outlineOffset: 3,
                    transform: selected ? "scale(1.15)" : "scale(1)",
                    transition: "all 0.15s",
                    boxShadow: selected ? `0 0 0 5px ${hex}22` : "none",
                  }} />
                  <span style={{
                    fontSize: 10, fontWeight: selected ? 700 : 500,
                    color: selected ? hex : (dark ? "#a8a29e" : "#78716c"),
                    letterSpacing: "0.04em",
                  }}>
                    {name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </SectionCard>

      {/* MESSAGGI */}
      <SectionCard icon={MessageSquare} title="Messaggi ai clienti" color="orange" cardCls={card} bordCls={bord} txtCls={txt}>
        <TextArea label="Messaggio di benvenuto" value={data.welcome_message}
          onChange={set("welcome_message")}
          placeholder="es. Benvenuti! Siamo felici di avervi qui. Scorri il menu e ordina direttamente dal tavolo 🍝"
          hint="Mostrato in cima alla pagina menu sotto il nome"
          inputCls={input} mutedCls={muted} />
        <TextArea label="Messaggio di conferma ordine" value={data.confirm_message}
          onChange={set("confirm_message")}
          placeholder="es. Grazie per il tuo ordine! Lo stiamo preparando con cura ✨"
          hint="Mostrato al cliente dopo aver inviato l'ordine"
          inputCls={input} mutedCls={muted} />
      </SectionCard>

      {/* CONTATTI */}
      <SectionCard icon={Globe} title="Contatti e social" color="green" cardCls={card} bordCls={bord} txtCls={txt}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-gray-400 mt-8 shrink-0" />
            <div className="flex-1">
              <Field label="Indirizzo" value={data.address} onChange={set("address")}
                placeholder="es. Via Roma 12, Napoli" inputCls={input} mutedCls={muted} />
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="w-4 h-4 text-gray-400 mt-8 shrink-0" />
            <div className="flex-1">
              <Field label="Telefono" value={data.phone} onChange={set("phone")}
                placeholder="es. +39 081 123 4567" type="tel" inputCls={input} mutedCls={muted} />
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Instagram className="w-4 h-4 text-gray-400 mt-8 shrink-0" />
            <div className="flex-1">
              <Field label="Instagram" value={data.instagram} onChange={set("instagram")}
                placeholder="es. @ilmioristorante" inputCls={input} mutedCls={muted} />
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Facebook className="w-4 h-4 text-gray-400 mt-8 shrink-0" />
            <div className="flex-1">
              <Field label="Facebook" value={data.facebook} onChange={set("facebook")}
                placeholder="es. @ilmioristorante o URL pagina" inputCls={input} mutedCls={muted} />
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Star className="w-4 h-4 text-gray-400 mt-8 shrink-0" />
            <div className="flex-1">
              <Field label="TripAdvisor (URL)" value={data.tripadvisor} onChange={set("tripadvisor")}
                placeholder="es. https://tripadvisor.it/..." inputCls={input} mutedCls={muted} />
            </div>
          </div>
          <div className="flex items-start gap-3 md:col-span-2">
            <Globe className="w-4 h-4 text-gray-400 mt-8 shrink-0" />
            <div className="flex-1">
              <Field label="Sito web" value={data.website} onChange={set("website")}
                placeholder="es. https://www.ilmioristorante.it" type="url"
                inputCls={input} mutedCls={muted} />
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="flex justify-end pb-6">
        <SaveBtn cls="px-6 py-3" />
      </div>
    </div>
  );
}