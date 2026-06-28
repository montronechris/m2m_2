"use client";
import { motion } from "framer-motion";
import { useState } from "react";
import { useSiteLanguage } from "@/hooks/use-site-language";
import type { Language } from "@/components/layout/SiteHeader";

type T = {
  badge: string;
  title1: string;
  title2: string;
  desc: string;
  emailLabel: string;
  phoneLabel: string;
  successTitle: string;
  successDesc: string;
  roleLabel: string;
  roleSelect: string;
  roleOwner: string;
  roleManager: string;
  nameLabel: string;
  emailField: string;
  phoneField: string;
  msgField: string;
  consentText: string;
  privacyLink: string;
  submit: string;
};

const TRANSLATIONS: Record<Language, T> = {
  IT: {
    badge: "Pronti a Iniziare?",
    title1: "Pronto a trasformare il",
    title2: "tuo ristorante?",
    desc: "Compila il form per richiedere una demo gratuita o per parlare con il nostro team.",
    emailLabel: "Email",
    phoneLabel: "Telefono",
    successTitle: "Richiesta inviata!",
    successDesc: "Ti ricontatteremo entro 24 ore.",
    roleLabel: "Ruolo*",
    roleSelect: "Seleziona…",
    roleOwner: "Titolare Ristorante",
    roleManager: "Manager",
    nameLabel: "Nome Completo*",
    emailField: "Email*",
    phoneField: "Telefono*",
    msgField: "Messaggio*",
    consentText: "Acconsento al trattamento dei Dati Personali.",
    privacyLink: "Privacy Policy",
    submit: "Invia Richiesta",
  },
  EN: {
    badge: "Ready to Start?",
    title1: "Ready to transform your",
    title2: "restaurant?",
    desc: "Fill out the form to request a free demo or talk to our team.",
    emailLabel: "Email",
    phoneLabel: "Phone",
    successTitle: "Request sent!",
    successDesc: "We'll get back to you within 24 hours.",
    roleLabel: "Role*",
    roleSelect: "Select…",
    roleOwner: "Restaurant Owner",
    roleManager: "Manager",
    nameLabel: "Full Name*",
    emailField: "Email*",
    phoneField: "Phone*",
    msgField: "Message*",
    consentText: "I consent to the processing of Personal Data.",
    privacyLink: "Privacy Policy",
    submit: "Send Request",
  },
};

export default function ContactForm() {
  const [language] = useSiteLanguage();
  const t = TRANSLATIONS[language];
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ role: "", name: "", email: "", phone: "", msg: "", consent: false });
  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  const submit = () => {
    if (!form.name || !form.email || !form.consent) return;
    setSent(true);
  };

  return (
    <section id="contact" className="relative z-10 mx-auto max-w-6xl px-6 py-32">
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <span className="label">{t.badge}</span>
          <h2 className="mt-5 font-display text-4xl font-bold tracking-tight sm:text-5xl">
            {t.title1} <span className="text-gradient">{t.title2}</span>
          </h2>
          <p className="mt-5 text-ink/60">{t.desc}</p>
          <div className="mt-10 space-y-4 text-sm">
            <Info label={t.emailLabel} value="info@tavolarapida.it" />
            <Info label={t.phoneLabel} value="+39 02 1234567" />
          </div>
        </div>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} transition={{ duration: 0.6 }} className="card p-8">
          {sent ? (
            <div className="grid h-full place-items-center py-16 text-center">
              <div>
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-sage/15 text-3xl text-sage">✓</div>
                <h3 className="mt-4 font-display text-xl font-semibold">{t.successTitle}</h3>
                <p className="mt-2 text-ink/50">{t.successDesc}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Select value={form.role} onChange={(v) => set("role", v)} t={t} />
              <Field label={t.nameLabel} value={form.name} onChange={(v) => set("name", v)} />
              <Field label={t.emailField} type="email" value={form.email} onChange={(v) => set("email", v)} />
              <Field label={t.phoneField} value={form.phone} onChange={(v) => set("phone", v)} />
              <Field label={t.msgField} textarea value={form.msg} onChange={(v) => set("msg", v)} />
              <label className="flex items-start gap-3 text-xs text-ink/50">
                <input type="checkbox" checked={form.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-0.5 accent-[#B6794C]" />
                {t.consentText} <a href="/privacy" className="text-gold">{t.privacyLink}</a>.
              </label>
              <button onClick={submit} className="btn-primary w-full">{t.submit}</button>
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
function Select({ value, onChange, t }: { value: string; onChange: (v: string) => void; t: T }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs text-ink/50">{t.roleLabel}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        <option value="">{t.roleSelect}</option>
        <option value="owner">{t.roleOwner}</option>
        <option value="manager">{t.roleManager}</option>
      </select>
    </div>
  );
}
