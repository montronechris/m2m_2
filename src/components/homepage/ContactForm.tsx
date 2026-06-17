"use client";
import { motion } from "framer-motion";
import { useState } from "react";

export default function ContactForm() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ role: "", name: "", email: "", phone: "", msg: "", consent: false });
  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  const submit = () => {
    // TODO: collega a /app/api/contact/route.ts (Resend / Supabase)
    if (!form.name || !form.email || !form.consent) return;
    setSent(true);
  };

  return (
    <section id="contact" className="relative z-10 mx-auto max-w-6xl px-6 py-32">
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <span className="label">Pronti a Iniziare?</span>
          <h2 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Pronto a trasformare il <span className="text-gradient">tuo ristorante?</span>
          </h2>
          <p className="mt-5 text-ink/60">Compila il form per richiedere una demo gratuita o per parlare con il nostro team.</p>
          <div className="mt-10 space-y-4 text-sm">
            <Info label="Email" value="info@tavolarapida.it" />
            <Info label="Telefono" value="+39 02 1234567" />
          </div>
        </div>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }} className="card p-8">
          {sent ? (
            <div className="grid h-full place-items-center py-16 text-center">
              <div>
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sage/15 text-3xl text-sage">✓</div>
                <h3 className="mt-4 font-display text-xl font-semibold">Richiesta inviata!</h3>
                <p className="mt-2 text-ink/50">Ti ricontatteremo entro 24 ore.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Select value={form.role} onChange={(v) => set("role", v)} />
              <Field label="Nome Completo*" value={form.name} onChange={(v) => set("name", v)} />
              <Field label="Email*" type="email" value={form.email} onChange={(v) => set("email", v)} />
              <Field label="Telefono*" value={form.phone} onChange={(v) => set("phone", v)} />
              <Field label="Messaggio*" textarea value={form.msg} onChange={(v) => set("msg", v)} />
              <label className="flex items-start gap-3 text-xs text-ink/50">
                <input type="checkbox" checked={form.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-0.5 accent-[#B6794C]" />
                Acconsento al trattamento dei Dati Personali. <a href="#" className="text-gold">Privacy Policy</a>.
              </label>
              <button onClick={submit} className="btn-primary w-full">Invia Richiesta</button>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="card flex items-center justify-between px-4 py-3">
      <span className="text-ink/40">{label}</span><span className="text-gold">{value}</span>
    </div>
  );
}
const inputCls = "w-full rounded-xl border border-ink/15 bg-cream px-4 py-3 text-sm outline-none transition focus:border-gold/60 focus:ring-2 focus:ring-gold/20";
function Field({ label, value, onChange, type = "text", textarea = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; textarea?: boolean; }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs text-ink/50">{label}</label>
      {textarea ? <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />
        : <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls} />}
    </div>
  );
}
function Select({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs text-ink/50">Ruolo*</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        <option value="">Seleziona…</option><option value="owner">Titolare Ristorante</option><option value="manager">Manager</option>
      </select>
    </div>
  );
}
