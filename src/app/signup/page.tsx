// src/app/signup/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import SiteHeader from "@/components/layout/SiteHeader";
import { useSiteLanguage } from "@/hooks/use-site-language";
import type { Language } from "@/components/layout/SiteHeader";
import { ArrowLeft, ArrowRight, Check, Mail, Lock, User, Building2, Phone, CreditCard, Sparkles, Zap, ShieldCheck, Loader2, AlertCircle } from "lucide-react";

type T = {
  badge: string;
  title1: string;
  title2: string;
  subtitle: string;
  benefits: { icon: typeof Zap; title: string; desc: string }[];
  formTitle: string;
  formDesc: string;
  firstName: string;
  lastName: string;
  restaurantName: string;
  email: string;
  phone: string;
  password: string;
  passwordPlaceholder: string;
  submitBtn: (plan: string) => string;
  submitting: string;
  termsText: string;
  termsLink: string;
  privacyLink: string;
  haveAccount: string;
  login: string;
  planTitle: string;
  plans: { id: string; name: string; price: number | null; period: string; desc: string; features: string[]; cta: string; highlight: boolean }[];
  popular: string;
  trialNote: string;
  successTitle: string;
  successDesc: (plan: string, email: string) => string;
  successCta1: string;
  successCta2: string;
  backHome: string;
};

const TRANSLATIONS: Record<Language, T> = {
  IT: {
    badge: "Inizia il tuo abbonamento",
    title1: "Crea il tuo account",
    title2: "ristorante",
    subtitle: "14 giorni di prova gratuita, nessuna carta di credito richiesta. Configura il tuo menu digitale in meno di 10 minuti.",
    benefits: [
      { icon: Zap, title: "Setup in 10 minuti", desc: "Onboarding guidato, pronto subito" },
      { icon: ShieldCheck, title: "14 giorni gratis", desc: "Nessuna carta richiesta" },
      { icon: Sparkles, title: "Cancellazione gratuita", desc: "Nessun vincolo, nessun costo nascosto" },
    ],
    formTitle: "Dati account",
    formDesc: "Compila il form per creare il tuo account ristorante.",
    firstName: "Nome",
    lastName: "Cognome",
    restaurantName: "Nome ristorante",
    email: "Email",
    phone: "Telefono",
    password: "Password",
    passwordPlaceholder: "Minimo 8 caratteri",
    submitBtn: (plan) => `Crea account · Piano ${plan}`,
    submitting: "Creazione account...",
    termsText: "Procedendo accetti i",
    termsLink: "Termini di Servizio",
    privacyLink: "Privacy Policy",
    haveAccount: "Hai già un account?",
    login: "Accedi",
    planTitle: "Scegli il piano",
    popular: "PIÙ POPOLARE",
    trialNote: "Tutti i piani includono 14 giorni di prova gratuita.",
    plans: [
      {
        id: "starter",
        name: "Starter",
        price: 29,
        period: "/mese",
        desc: "Per piccoli ristoranti che iniziano il percorso digitale",
        features: ["Menu digitale illimitati", "QR codes per 20 tavoli", "Ordini in tempo reale", "Dashboard base", "Supporto email"],
        cta: "Inizia con Starter",
        highlight: false,
      },
      {
        id: "professional",
        name: "Professional",
        price: 79,
        period: "/mese",
        desc: "Per ristoranti che vogliono ottimizzare ogni aspetto",
        features: ["Tutto di Starter", "QR codes illimitati", "Analytics avanzate", "Gestione staff e turni", "Branding personalizzato", "Supporto prioritario 24/7", "API integrazioni"],
        cta: "Scegli Professional",
        highlight: true,
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price: null,
        period: "",
        desc: "Per catene e franchise con esigenze custom",
        features: ["Tutto di Professional", "Multi-locale", "Account manager dedicato", "SLA garantito 99.9%", "Onboarding personalizzato", "Integrazioni custom"],
        cta: "Contatta vendite",
        highlight: false,
      },
    ],
    successTitle: "Benvenuto in TavolaRapida!",
    successDesc: (plan, email) => `Il tuo account è stato creato con il piano ${plan}. Ti abbiamo inviato un'email di conferma a ${email} con le istruzioni per completare l'attivazione.`,
    successCta1: "Vai al login",
    successCta2: "Esplora la piattaforma",
    backHome: "Torna alla home",
  },
  EN: {
    badge: "Start your subscription",
    title1: "Create your",
    title2: "restaurant account",
    subtitle: "14-day free trial, no credit card required. Set up your digital menu in under 10 minutes.",
    benefits: [
      { icon: Zap, title: "Setup in 10 minutes", desc: "Guided onboarding, ready instantly" },
      { icon: ShieldCheck, title: "14 days free", desc: "No card required" },
      { icon: Sparkles, title: "Free cancellation", desc: "No lock-in, no hidden costs" },
    ],
    formTitle: "Account details",
    formDesc: "Fill out the form to create your restaurant account.",
    firstName: "First name",
    lastName: "Last name",
    restaurantName: "Restaurant name",
    email: "Email",
    phone: "Phone",
    password: "Password",
    passwordPlaceholder: "Minimum 8 characters",
    submitBtn: (plan) => `Create account · ${plan} plan`,
    submitting: "Creating account...",
    termsText: "By proceeding you agree to the",
    termsLink: "Terms of Service",
    privacyLink: "Privacy Policy",
    haveAccount: "Already have an account?",
    login: "Sign in",
    planTitle: "Choose your plan",
    popular: "POPULAR",
    trialNote: "All plans include a 14-day free trial.",
    plans: [
      {
        id: "starter",
        name: "Starter",
        price: 29,
        period: "/mo",
        desc: "For small restaurants starting their digital journey",
        features: ["Unlimited digital menus", "QR codes for 20 tables", "Real-time orders", "Basic dashboard", "Email support"],
        cta: "Start with Starter",
        highlight: false,
      },
      {
        id: "professional",
        name: "Professional",
        price: 79,
        period: "/mo",
        desc: "For restaurants wanting to optimize every aspect",
        features: ["Everything in Starter", "Unlimited QR codes", "Advanced analytics", "Staff and shift management", "Custom branding", "Priority 24/7 support", "API integrations"],
        cta: "Choose Professional",
        highlight: true,
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price: null,
        period: "",
        desc: "For chains and franchises with custom needs",
        features: ["Everything in Professional", "Multi-location", "Dedicated account manager", "99.9% SLA guarantee", "Custom onboarding", "Custom integrations"],
        cta: "Contact sales",
        highlight: false,
      },
    ],
    successTitle: "Welcome to TavolaRapida!",
    successDesc: (plan, email) => `Your account has been created with the ${plan} plan. We've sent a confirmation email to ${email} with instructions to complete activation.`,
    successCta1: "Go to login",
    successCta2: "Explore the platform",
    backHome: "Back to home",
  },
};

export default function SignupPage() {
  const [language, setLanguage] = useSiteLanguage();
  const t = TRANSLATIONS[language];
  const [selectedPlan, setSelectedPlan] = useState<string>("professional");
  const [formState, setFormState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    restaurantName: "",
    password: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState("submitting");
    setError(null);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setFormState("success");
    } catch (err: any) {
      setFormState("error");
      setError(err.message || "Errore durante la registrazione.");
    }
  };

  const selectedPlanObj = t.plans.find((p) => p.id === selectedPlan)!;

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{
        background: `
          radial-gradient(circle at 0% 0%, rgba(182,121,76,0.15) 0%, transparent 45%),
          radial-gradient(circle at 100% 0%, rgba(224,160,32,0.12) 0%, transparent 45%),
          radial-gradient(circle at 50% 100%, rgba(126,148,114,0.10) 0%, transparent 55%),
          linear-gradient(135deg, #FBF8F1 0%, #F1E8D8 100%)`,
      }}
    >
      <div
        aria-hidden
        className="absolute top-20 -left-32 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "rgba(182,121,76,0.18)", filter: "blur(100px)" }}
      />
      <div
        aria-hidden
        className="absolute bottom-20 -right-32 w-[28rem] h-[28rem] rounded-full pointer-events-none"
        style={{ background: "rgba(224,160,32,0.14)", filter: "blur(120px)" }}
      />

      <SiteHeader language={language} onLanguageChange={setLanguage} />

      <div className="relative mx-auto max-w-6xl px-5 pt-32 pb-20 md:pt-40 md:pb-28">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[oklch(0.50_0.08_60)] hover:text-[oklch(0.80_0.19_85)] transition-colors mb-10 min-h-[44px] py-2 px-3 -ml-3 rounded-full hover:bg-[oklch(0.80_0.19_85/0.08)]"
        >
          <ArrowLeft className="w-4 h-4" />
          {t.backHome}
        </Link>

        {formState === "success" ? (
          <div className="mx-auto max-w-xl text-center">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{
                background: "linear-gradient(135deg, #5E7355 0%, #7E9472 100%)",
                boxShadow: "0 16px 40px -8px rgba(94,115,85,0.4)",
              }}
            >
              <Check className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[oklch(0.25_0.10_65)] mb-4">
              {t.successTitle}
            </h1>
            <p className="text-base text-[oklch(0.38_0.08_60)] mb-8">
              {t.successDesc(selectedPlanObj.name, formData.email)}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-semibold text-sm transition-all hover:scale-105 min-h-[48px]"
                style={{
                  background: "linear-gradient(135deg, #B6794C 0%, #E0A020 100%)",
                  boxShadow: "0 8px 24px -4px rgba(182,121,76,0.4)",
                }}
              >
                {t.successCta1}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all min-h-[48px] border"
                style={{ borderColor: "rgba(182,121,76,0.3)", color: "#B6794C" }}
              >
                {t.successCta2}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-12">
              <div
                className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-6 border"
                style={{ background: "rgba(182,121,76,0.1)", borderColor: "rgba(182,121,76,0.25)" }}
              >
                <Sparkles className="w-4 h-4 text-[oklch(0.80_0.19_85)]" />
                <span className="text-xs font-semibold uppercase tracking-widest text-[oklch(0.55_0.14_55)]">
                  {t.badge}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[oklch(0.25_0.10_65)] mb-4">
                {t.title1}
                <br />
                <span
                  style={{
                    background: "linear-gradient(135deg, #B6794C 0%, #E0A020 100%)",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {t.title2}
                </span>
              </h1>
              <p className="mx-auto max-w-xl text-base text-[oklch(0.38_0.08_60)]">
                {t.subtitle}
              </p>
            </div>

            <div className="mx-auto max-w-3xl grid grid-cols-1 sm:grid-cols-3 gap-3 mb-12">
              {t.benefits.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="rounded-2xl p-4 border text-center"
                  style={{
                    background: "rgba(255,255,255,0.55)",
                    borderColor: "rgba(255,255,255,0.6)",
                    backdropFilter: "blur(12px)",
                  }}
                >
                  <Icon className="w-5 h-5 mx-auto mb-2 text-[oklch(0.80_0.19_85)]" />
                  <p className="text-sm font-bold text-[oklch(0.25_0.10_65)]">{title}</p>
                  <p className="text-xs text-[oklch(0.50_0.08_60)] mt-0.5">{desc}</p>
                </div>
              ))}
            </div>

            <div className="grid lg:grid-cols-5 gap-8">
              <div className="lg:col-span-3">
                <div
                  className="rounded-[2rem] p-7 md:p-10 border"
                  style={{
                    background: "rgba(255,255,255,0.65)",
                    backdropFilter: "blur(24px) saturate(180%)",
                    WebkitBackdropFilter: "blur(24px) saturate(180%)",
                    borderColor: "rgba(255,255,255,0.6)",
                    boxShadow: "0 16px 48px -12px rgba(43,38,32,0.18), inset 0 1px 0 rgba(255,255,255,0.7)",
                  }}
                >
                  <h2 className="text-xl font-bold text-[oklch(0.25_0.10_65)] mb-1">{t.formTitle}</h2>
                  <p className="text-sm text-[oklch(0.50_0.08_60)] mb-6">{t.formDesc}</p>

                  {error && (
                    <div
                      className="p-3 rounded-2xl mb-4 flex items-start gap-2 border"
                      style={{ background: "rgba(160,64,48,0.1)", borderColor: "rgba(160,64,48,0.25)", color: "#A04030" }}
                    >
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 text-sm">{error}</div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase mb-1.5 tracking-wide text-[oklch(0.40_0.09_60)]">
                          {t.firstName}
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.50_0.08_60)]" />
                          <input
                            type="text"
                            required
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none transition-all min-h-[48px]"
                            style={{
                              background: "rgba(241,232,216,0.5)",
                              border: "1.5px solid rgba(230,215,191,0.6)",
                              color: "#2B2620",
                            }}
                            placeholder="Mario"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase mb-1.5 tracking-wide text-[oklch(0.40_0.09_60)]">
                          {t.lastName}
                        </label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.50_0.08_60)]" />
                          <input
                            type="text"
                            required
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none transition-all min-h-[48px]"
                            style={{
                              background: "rgba(241,232,216,0.5)",
                              border: "1.5px solid rgba(230,215,191,0.6)",
                              color: "#2B2620",
                            }}
                            placeholder="Rossi"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase mb-1.5 tracking-wide text-[oklch(0.40_0.09_60)]">
                        {t.restaurantName}
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.50_0.08_60)]" />
                        <input
                          type="text"
                          required
                          value={formData.restaurantName}
                          onChange={(e) => setFormData({ ...formData, restaurantName: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none transition-all min-h-[48px]"
                          style={{
                            background: "rgba(241,232,216,0.5)",
                            border: "1.5px solid rgba(230,215,191,0.6)",
                            color: "#2B2620",
                          }}
                          placeholder="Trattoria La Pergola"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase mb-1.5 tracking-wide text-[oklch(0.40_0.09_60)]">
                          {t.email}
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.50_0.08_60)]" />
                          <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none transition-all min-h-[48px]"
                            style={{
                              background: "rgba(241,232,216,0.5)",
                              border: "1.5px solid rgba(230,215,191,0.6)",
                              color: "#2B2620",
                            }}
                            placeholder="mario@lapergola.it"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase mb-1.5 tracking-wide text-[oklch(0.40_0.09_60)]">
                          {t.phone}
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.50_0.08_60)]" />
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none transition-all min-h-[48px]"
                            style={{
                              background: "rgba(241,232,216,0.5)",
                              border: "1.5px solid rgba(230,215,191,0.6)",
                              color: "#2B2620",
                            }}
                            placeholder="+39 333 1234567"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase mb-1.5 tracking-wide text-[oklch(0.40_0.09_60)]">
                        {t.password}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[oklch(0.50_0.08_60)]" />
                        <input
                          type="password"
                          required
                          minLength={8}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none transition-all min-h-[48px]"
                          style={{
                            background: "rgba(241,232,216,0.5)",
                            border: "1.5px solid rgba(230,215,191,0.6)",
                            color: "#2B2620",
                          }}
                          placeholder={t.passwordPlaceholder}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={formState === "submitting"}
                      className="w-full font-bold py-4 rounded-xl transition-all duration-300 disabled:opacity-60 flex items-center justify-center gap-2 text-white min-h-[56px]"
                      style={{
                        background: "linear-gradient(135deg, #B6794C 0%, #E0A020 100%)",
                        boxShadow: "0 8px 24px -4px rgba(182,121,76,0.45), inset 0 1px 0 rgba(255,255,255,0.25)",
                      }}
                    >
                      {formState === "submitting" ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {t.submitting}
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-5 h-5" />
                          {t.submitBtn(selectedPlanObj.name)}
                        </>
                      )}
                    </button>

                    <p className="text-xs text-center text-[oklch(0.50_0.08_60)] mt-4">
                      {t.termsText}{" "}
                      <Link href="/termini" className="underline hover:text-[oklch(0.80_0.19_85)]">
                        {t.termsLink}
                      </Link>{" "}
                      {language === "IT" ? "e la" : "and the"}{" "}
                      <Link href="/privacy" className="underline hover:text-[oklch(0.80_0.19_85)]">
                        {t.privacyLink}
                      </Link>
                      .
                    </p>
                  </form>
                </div>

                <p className="text-center mt-6 text-sm text-[oklch(0.50_0.08_60)]">
                  {t.haveAccount}{" "}
                  <Link href="/login" className="font-semibold text-[oklch(0.80_0.19_85)] hover:underline">
                    {t.login}
                  </Link>
                </p>
              </div>

              <div className="lg:col-span-2 space-y-3">
                <h2 className="text-xl font-bold text-[oklch(0.25_0.10_65)] mb-4">{t.planTitle}</h2>
                {t.plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`w-full text-left rounded-2xl p-5 border-2 transition-all ${
                      selectedPlan === plan.id ? "scale-[1.02]" : "hover:scale-[1.01]"
                    }`}
                    style={{
                      background:
                        selectedPlan === plan.id
                          ? "rgba(182,121,76,0.08)"
                          : "rgba(255,255,255,0.55)",
                      borderColor:
                        selectedPlan === plan.id ? "rgba(182,121,76,0.5)" : "rgba(230,215,191,0.6)",
                      backdropFilter: "blur(12px)",
                      boxShadow:
                        selectedPlan === plan.id
                          ? "0 8px 24px -8px rgba(182,121,76,0.25)"
                          : "0 2px 8px -2px rgba(43,38,32,0.06)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        {plan.highlight && (
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                            style={{ background: "linear-gradient(135deg, #B6794C 0%, #E0A020 100%)" }}
                          >
                            {t.popular}
                          </span>
                        )}
                        <h3 className="text-base font-bold text-[oklch(0.25_0.10_65)]">{plan.name}</h3>
                      </div>
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5"
                        style={{
                          borderColor:
                            selectedPlan === plan.id ? "#B6794C" : "rgba(155,140,121,0.4)",
                          background:
                            selectedPlan === plan.id ? "#B6794C" : "transparent",
                        }}
                      >
                        {selectedPlan === plan.id && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                    <p className="text-xs text-[oklch(0.50_0.08_60)] mb-3">{plan.desc}</p>
                    <div className="flex items-baseline gap-1 mb-3">
                      {plan.price !== null ? (
                        <>
                          <span className="text-2xl font-black text-[oklch(0.25_0.10_65)]">€{plan.price}</span>
                          <span className="text-sm text-[oklch(0.50_0.08_60)]">{plan.period}</span>
                        </>
                      ) : (
                        <span className="text-2xl font-black text-[oklch(0.25_0.10_65)]">Custom</span>
                      )}
                    </div>
                    <ul className="space-y-1.5">
                      {plan.features.slice(0, 4).map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-[oklch(0.38_0.08_60)]">
                          <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[oklch(0.55_0.14_55)]" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </button>
                ))}
                <p className="text-xs text-center text-[oklch(0.50_0.08_60)] pt-2">
                  {t.trialNote}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
