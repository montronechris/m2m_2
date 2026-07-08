'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { PageShell } from '@/components/landing/PageShell'
import {
  QrCode,
  Smartphone,
  UtensilsCrossed,
  ChefHat,
  Wine,
  Bell,
  CheckCircle2,
  Clock,
  Shield,
  Zap,
  ArrowRight,
  TrendingUp,
  Users,
  CreditCard,
  Star,
  Globe,
  Printer,
  Download,
  Eye,
  MessageCircle,
  BarChart3,
  Wallet,
  Leaf,
  Camera,
  ScanLine,
  ShoppingCart,
  Utensils,
  Timer,
  Receipt,
  HandCoins,
  CircleCheckBig,
  BadgePercent,
  Languages,
  ChevronDown,
  Palette,
  Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useI18n } from '@/components/i18n/I18nProvider'

/* ─── Types ───────────────────────────────────────────────────────── */
type Step = {
  num: string
  title: string
  description: string
  icon: LucideIcon
  iconBg: string
  accent: string
}

type Benefit = {
  title: string
  description: string
  icon: LucideIcon
  stat: string
  statLabel: string
  iconBg: string
  accent: string
}

type Feature = {
  title: string
  description: string
  icon: LucideIcon
  iconBg: string
}

type FAQ = {
  question: string
  answer: string
}

/* ─── Static meta (icons, colors, stats — language-independent) ───── */
const STEP_META: Pick<Step, 'num' | 'icon' | 'iconBg' | 'accent'>[] = [
  {
    num: '01',
    icon: Smartphone,
    iconBg: 'bg-brand-amber/15 text-brand-amber',
    accent: 'text-brand-amber',
  },
  {
    num: '02',
    icon: ShoppingCart,
    iconBg: 'bg-brand-emerald/15 text-brand-emerald',
    accent: 'text-brand-emerald',
  },
  {
    num: '03',
    icon: ChefHat,
    iconBg: 'bg-brand-terra/15 text-brand-terra',
    accent: 'text-brand-terra',
  },
  {
    num: '04',
    icon: Timer,
    iconBg: 'bg-brand-rose/15 text-brand-rose',
    accent: 'text-brand-rose',
  },
  {
    num: '05',
    icon: Receipt,
    iconBg: 'bg-brand-amber/15 text-brand-amber',
    accent: 'text-brand-amber',
  },
]

const BENEFIT_META: Pick<Benefit, 'icon' | 'stat' | 'iconBg' | 'accent'>[] = [
  {
    icon: Zap,
    stat: '-40%',
    iconBg: 'bg-brand-amber/15 text-brand-amber',
    accent: 'text-brand-amber',
  },
  {
    icon: Shield,
    stat: '0',
    iconBg: 'bg-brand-emerald/15 text-brand-emerald',
    accent: 'text-brand-emerald',
  },
  {
    icon: TrendingUp,
    stat: '+18%',
    iconBg: 'bg-brand-terra/15 text-brand-terra',
    accent: 'text-brand-terra',
  },
  {
    icon: Users,
    stat: '-30%',
    iconBg: 'bg-brand-sky/15 text-brand-sky',
    accent: 'text-brand-sky',
  },
]

const FEATURE_META: Pick<Feature, 'icon' | 'iconBg'>[] = [
  { icon: Palette, iconBg: 'bg-brand-amber/15 text-brand-amber' },
  { icon: Utensils, iconBg: 'bg-brand-emerald/15 text-brand-emerald' },
  { icon: Leaf, iconBg: 'bg-brand-emerald/15 text-brand-emerald' },
  { icon: Star, iconBg: 'bg-brand-sky/15 text-brand-sky' },
  { icon: Languages, iconBg: 'bg-brand-terra/15 text-brand-terra' },
  { icon: BadgePercent, iconBg: 'bg-brand-rose/15 text-brand-rose' },
  { icon: Bell, iconBg: 'bg-brand-amber/15 text-brand-amber' },
  { icon: MessageCircle, iconBg: 'bg-brand-emerald/15 text-brand-emerald' },
  { icon: CreditCard, iconBg: 'bg-brand-amber/15 text-brand-amber' },
  { icon: Printer, iconBg: 'bg-brand-terra/15 text-brand-terra' },
  { icon: BarChart3, iconBg: 'bg-brand-sky/15 text-brand-sky' },
  { icon: Receipt, iconBg: 'bg-brand-emerald/15 text-brand-emerald' },
]

const QR_DEMO_META: { icon: LucideIcon; iconBg: string; iconColor: string }[] = [
  { icon: Download, iconBg: 'bg-brand-amber/15', iconColor: 'text-brand-amber' },
  { icon: Printer, iconBg: 'bg-brand-emerald/15', iconColor: 'text-brand-emerald' },
  { icon: Eye, iconBg: 'bg-brand-terra/15', iconColor: 'text-brand-terra' },
  { icon: Globe, iconBg: 'bg-brand-sky/15', iconColor: 'text-brand-sky' },
]

// Italian dish names are proper nouns — kept identical in both languages.
const PHONE_ITEMS = [
  { name: 'Carbonara', price: '€14', iconBg: 'bg-brand-amber/15', iconColor: 'text-brand-amber', btnBg: 'bg-brand-amber' },
  { name: 'Cacio e Pepe', price: '€13', iconBg: 'bg-brand-emerald/15', iconColor: 'text-brand-emerald', btnBg: 'bg-brand-emerald' },
  { name: 'Tiramisù', price: '€7', iconBg: 'bg-brand-sky/15', iconColor: 'text-brand-sky', btnBg: 'bg-brand-sky' },
]

/* ─── Bilingual translations ──────────────────────────────────────── */
const T = {
  it: {
    hero: {
      eyebrow: 'Menu QR Digitale',
      title1: 'Il tuo menu,',
      title2: 'sempre sul tavolo',
      subtitle:
        'Un QR code per ogni tavolo. Il cliente scannerizza, sfoglia il tuo menù personalizzato e ordina direttamente dal telefono. Zero app da scaricare, zero attese.',
      ctaPrimary: 'Prova la demo',
      ctaSecondary: 'Scopri come funziona',
      stats: [
        { value: '3 sec', label: 'per ordinare' },
        { value: '0 app', label: 'da installare' },
        { value: '100%', label: 'il tuo brand' },
      ],
    },
    phone: {
      restaurant: 'Il Tuo Ristorante',
      table: 'Tavolo 5',
      cartItems: '3 articoli',
    },
    scan: 'Scan',
    steps: {
      eyebrow: 'FLUSSO COMPLETO',
      title: 'Come funziona',
      subtitle: 'Dal QR code al piatto servito — tutto in 5 semplici passi.',
      stepLabel: 'STEP',
      items: [
        {
          title: 'Il cliente scannerizza',
          description:
            'Appoggia il telefono sul QR code posizionato sul tavolo. Si apre automaticamente il tuo menu digitale personalizzato con il tuo brand, i tuoi colori e il tuo logo.',
        },
        {
          title: 'Sfoglia e ordina',
          description:
            'Il cliente naviga le categorie, legge descrizioni dettagliate, controlla allergeni e aggiunge piatti al carrello. Può personalizzare ogni piatto con varianti e note speciali.',
        },
        {
          title: 'Cucina riceve subito',
          description:
            "L'ordine appare istantaneamente nel pannello cucina con animazione e suono. Il cuoco vede portata, quantità, personalizzazioni e note — zero errori di trascrizione.",
        },
        {
          title: 'Tracking in tempo reale',
          description:
            "Il cliente segue lo stato dell'ordine: confermato → in preparazione → pronto → servito. Ogni aggiornamento è istantaneo con indicatore ETA.",
        },
        {
          title: 'Pagamento e recensione',
          description:
            'Al termine, il cliente richiede il pagamento con un tap (contanti o carta). Dopo il pasto può lasciare una recensione con stelle e testo.',
        },
      ],
    },
    benefits: {
      eyebrow: 'PERCHÉ CONVIENE',
      title: 'Numeri che parlano',
      subtitle: 'I vantaggi concreti del menu QR per il tuo ristorante.',
      items: [
        {
          title: 'Ordini più veloci',
          description:
            'Il cliente ordina quando è pronto, senza aspettare il cameriere. Tempistiche di attesa ridotte fino al 40%.',
          statLabel: 'tempo attesa',
        },
        {
          title: 'Nessun errore',
          description:
            "L'ordine passa direttamente dal cliente alla cucina. Zero errori di trascrizione, zero piatti sbagliati.",
          statLabel: 'errori di trascrizione',
        },
        {
          title: 'Scontrino medio +18%',
          description:
            'I clienti ordinano di più quando possono navigare il menu a proprio ritmo, con foto e descrizioni dettagliate.',
          statLabel: 'scontrino medio',
        },
        {
          title: 'Staff ridotto',
          description:
            "Riduci il numero di camerieri necessari per prendere le comande. Il tuo team si concentra sul servizio e l'esperienza.",
          statLabel: 'costo personale',
        },
      ],
    },
    features: {
      eyebrow: 'FUNZIONALITÀ',
      title: 'Tutto quello che include',
      subtitle: 'Ogni dettaglio pensato per la ristorazione italiana.',
      items: [
        {
          title: 'Menu digitale personalizzato',
          description:
            'Il tuo brand, i tuoi colori, il tuo logo. Il cliente non sa di usare una piattaforma esterna — vive la tua esperienza.',
        },
        {
          title: 'Gestione portate',
          description:
            'Organizza gli ordini per portata (antipasti, primi, secondi...). Il cliente può ordinare tutto subito o portata per portata.',
        },
        {
          title: 'Allergeni automatici',
          description:
            'Icone visive per ogni allergene (glutine, lattosio, uova...). Conforme al regolamento UE 1169/2011. Rassicura il cliente.',
        },
        {
          title: 'Varianti e personalizzazioni',
          description:
            'Ogni piatto supporta opzioni (cottura, dimensione, aggiunte) e note libere. Il cliente crea il piatto esattamente come lo vuole.',
        },
        {
          title: 'Multi-lingua',
          description:
            "Il menu si adatta automaticamente alla lingua del telefono del cliente. Italiano, inglese e altre lingue supportate.",
        },
        {
          title: 'Codici sconto',
          description:
            'Crea coupon percentuali o a importo fisso. Il cliente inserisce il codice nel carrello e lo sconto si applica in tempo reale.',
        },
        {
          title: 'Chiamata cameriere',
          description:
            'Pulsante "Chiama cameriere" integrato. Il cliente può richiedere assistenza senza alzare la voce o cercare il personale.',
        },
        {
          title: 'Notifiche push',
          description:
            'Ogni nuovo ordine, richiesta di pagamento o chiamata al tavolo genera una notifica istantanea con suono personalizzabile.',
        },
        {
          title: 'Pagamenti flessibili',
          description:
            'Il cliente sceglie come pagare: contanti o carta. Il cameriere riceve la notifica e gestisce il pagamento al tavolo.',
        },
        {
          title: 'QR per ogni tavolo',
          description:
            'Ogni tavolo ha un codice QR unico (es. TAVO-A7K2). Stampa, scarica o attiva/disattiva i tavoli in un click dalla dashboard.',
        },
        {
          title: 'Analytics ordini',
          description:
            'Statistiche in tempo reale: ordini giornalieri, ricavi, piatti più venduti, orari di punta. Dati per decidere meglio.',
        },
        {
          title: 'Scheda ricevuta stile carta',
          description:
            'Al riepilogo ordine, una ricevuta stilizzata con effetto carta strappata mostra ogni dettaglio: portate, note, totali.',
        },
      ],
    },
    qrDemo: {
      print: 'Stampa',
      title: 'Un codice, un tavolo',
      descPrefix: 'Ogni tavolo del tuo ristorante ha un',
      descHighlight: 'codice QR unico',
      descMiddle: 'generato automaticamente. Il formato è leggibile e professionale — ad esempio',
      items: [
        'Scarica il QR in PNG ad alta risoluzione',
        'Stampa direttamente con etichetta tavolo',
        'Anteprima live del menu del cliente',
        'Copia il link per condivisione digitale',
      ],
    },
    faq: {
      eyebrow: 'DOMANDE FREQUENTI',
      title: 'Hai dubbi?',
      items: [
        {
          question: "Il cliente deve scaricare un'app?",
          answer:
            "No. Il QR code apre il menu direttamente nel browser del telefono. Nessun download, nessuna registrazione. Il cliente scannerizza e ordina all'istante.",
        },
        {
          question: 'Come vengono generati i codici QR?',
          answer:
            'Automaticamente. Quando aggiungi un tavolo dalla sezione "Tavoli" della dashboard, un codice unico viene generato istantaneamente (es. TAVO-A7K2). Puoi scaricarlo come PNG o stamparlo direttamente.',
        },
        {
          question: 'Posso disattivare un tavolo senza eliminarlo?',
          answer:
            "Sì. Ogni tavolo ha un toggle on/off. Se disattivi un tavolo, il QR code smette di funzionare e il cliente vede un messaggio di errore. Puoi riattivarlo quando vuoi.",
        },
        {
          question: 'Cosa succede se il cliente resta inattivo?',
          answer:
            'Dopo un periodo di inattività, la sessione scade automaticamente. Il carrello viene cancellato e il tavolo torna disponibile. Configurabile nelle impostazioni.',
        },
        {
          question: 'I dati dei clienti vengono salvati?',
          answer:
            'No raccogliamo dati personali. Non registriamo nomi, email o numeri di telefono. La sessione è anonima e temporanea — rispettiamo la privacy dei tuoi clienti.',
        },
        {
          question: 'Funziona con più dispositivi contemporaneamente?',
          answer:
            'Sì. Più clienti possono ordinare dallo stesso tavolo contemporaneamente. Ogni dispositivo ha il suo carrello e i propri ordini, tutti collegati allo stesso tavolo.',
        },
      ],
    },
    cta: {
      title: 'Pronto a digitalizzare il tuo menu?',
      subtitle:
        'Configura i tuoi tavoli, stampa i QR e inizia a ricevere ordini digitali in pochi minuti. Il tuo ristorante, rivoluzionato.',
      ctaPrimary: 'Inizia ora',
      ctaSecondary: 'Guarda la demo',
    },
  },
  en: {
    hero: {
      eyebrow: 'Digital QR Menu',
      title1: 'Your menu,',
      title2: 'always on the table',
      subtitle:
        'One QR code per table. The customer scans, browses your personalized menu and orders straight from their phone. No apps to download, no waiting.',
      ctaPrimary: 'Try the demo',
      ctaSecondary: 'See how it works',
      stats: [
        { value: '3 sec', label: 'to order' },
        { value: '0 apps', label: 'to install' },
        { value: '100%', label: 'your brand' },
      ],
    },
    phone: {
      restaurant: 'Your Restaurant',
      table: 'Table 5',
      cartItems: '3 items',
    },
    scan: 'Scan',
    steps: {
      eyebrow: 'FULL FLOW',
      title: 'How it works',
      subtitle: 'From QR code to served dish — all in 5 simple steps.',
      stepLabel: 'STEP',
      items: [
        {
          title: 'The customer scans',
          description:
            'They tap their phone on the QR code placed on the table. Your personalized digital menu opens automatically with your brand, your colors and your logo.',
        },
        {
          title: 'Browse and order',
          description:
            'The customer browses categories, reads detailed descriptions, checks allergens and adds dishes to the cart. They can personalize each dish with variants and special notes.',
        },
        {
          title: 'Kitchen receives instantly',
          description:
            'The order appears instantly on the kitchen display with animation and sound. The chef sees course, quantity, customizations and notes — zero transcription errors.',
        },
        {
          title: 'Real-time tracking',
          description:
            'The customer follows the order status: confirmed → in preparation → ready → served. Every update is instant with an ETA indicator.',
        },
        {
          title: 'Payment and review',
          description:
            'At the end, the customer requests payment with one tap (cash or card). After the meal they can leave a review with stars and text.',
        },
      ],
    },
    benefits: {
      eyebrow: 'WHY IT PAYS OFF',
      title: 'Numbers that speak',
      subtitle: 'The concrete benefits of a QR menu for your restaurant.',
      items: [
        {
          title: 'Faster orders',
          description:
            'The customer orders when ready, without waiting for the waiter. Wait times reduced by up to 40%.',
          statLabel: 'wait time',
        },
        {
          title: 'No errors',
          description:
            'The order goes straight from the customer to the kitchen. Zero transcription errors, zero wrong dishes.',
          statLabel: 'transcription errors',
        },
        {
          title: 'Average ticket +18%',
          description:
            'Customers order more when they can browse the menu at their own pace, with photos and detailed descriptions.',
          statLabel: 'average ticket',
        },
        {
          title: 'Leaner staff',
          description:
            'Reduce the number of waiters needed to take orders. Your team focuses on service and experience.',
          statLabel: 'staff cost',
        },
      ],
    },
    features: {
      eyebrow: 'FEATURES',
      title: 'Everything included',
      subtitle: 'Every detail designed for the restaurant industry.',
      items: [
        {
          title: 'Personalized digital menu',
          description:
            "Your brand, your colors, your logo. The customer doesn't know they're using an external platform — they live your experience.",
        },
        {
          title: 'Course management',
          description:
            'Organize orders by course (starters, first courses, main courses...). The customer can order everything at once or course by course.',
        },
        {
          title: 'Automatic allergens',
          description:
            'Visual icons for every allergen (gluten, lactose, eggs...). Compliant with EU regulation 1169/2011. Reassures the customer.',
        },
        {
          title: 'Variants and customizations',
          description:
            'Each dish supports options (cooking, size, add-ons) and free-text notes. The customer builds the dish exactly how they want it.',
        },
        {
          title: 'Multi-language',
          description:
            'The menu automatically adapts to the customer phone language. Italian, English and other languages supported.',
        },
        {
          title: 'Discount codes',
          description:
            'Create percentage or fixed-amount coupons. The customer enters the code in the cart and the discount applies in real time.',
        },
        {
          title: 'Call waiter',
          description:
            'Integrated "Call waiter" button. The customer can request assistance without raising their voice or looking for staff.',
        },
        {
          title: 'Push notifications',
          description:
            'Every new order, payment request or table call generates an instant notification with customizable sound.',
        },
        {
          title: 'Flexible payments',
          description:
            'The customer chooses how to pay: cash or card. The waiter receives the notification and handles payment at the table.',
        },
        {
          title: 'QR for every table',
          description:
            'Every table has a unique QR code (e.g. TAVO-A7K2). Print, download or enable/disable tables in one click from the dashboard.',
        },
        {
          title: 'Order analytics',
          description:
            'Real-time statistics: daily orders, revenue, best-selling dishes, peak hours. Data to make better decisions.',
        },
        {
          title: 'Paper-style receipt card',
          description:
            'On the order summary, a stylized receipt with a torn-paper effect shows every detail: courses, notes, totals.',
        },
      ],
    },
    qrDemo: {
      print: 'Print',
      title: 'One code, one table',
      descPrefix: 'Every table in your restaurant has a',
      descHighlight: 'unique QR code',
      descMiddle: 'generated automatically. The format is readable and professional — for example',
      items: [
        'Download high-resolution QR as PNG',
        'Print directly with table label',
        'Live preview of the customer menu',
        'Copy the link for digital sharing',
      ],
    },
    faq: {
      eyebrow: 'FREQUENTLY ASKED',
      title: 'Any questions?',
      items: [
        {
          question: 'Does the customer need to download an app?',
          answer:
            'No. The QR code opens the menu directly in the phone browser. No download, no registration. The customer scans and orders instantly.',
        },
        {
          question: 'How are QR codes generated?',
          answer:
            'Automatically. When you add a table from the "Tables" section of the dashboard, a unique code is generated instantly (e.g. TAVO-A7K2). You can download it as PNG or print it directly.',
        },
        {
          question: 'Can I disable a table without deleting it?',
          answer:
            'Yes. Every table has an on/off toggle. If you disable a table, the QR code stops working and the customer sees an error message. You can reactivate it whenever you want.',
        },
        {
          question: 'What happens if the customer goes inactive?',
          answer:
            'After a period of inactivity, the session expires automatically. The cart is cleared and the table becomes available again. Configurable in settings.',
        },
        {
          question: 'Is customer data saved?',
          answer:
            "We don't collect personal data. We don't record names, emails or phone numbers. The session is anonymous and temporary — we respect your customers' privacy.",
        },
        {
          question: 'Does it work with multiple devices at the same time?',
          answer:
            'Yes. Multiple customers can order from the same table at the same time. Each device has its own cart and orders, all linked to the same table.',
        },
      ],
    },
    cta: {
      title: 'Ready to digitize your menu?',
      subtitle:
        'Set up your tables, print the QR codes and start receiving digital orders in minutes. Your restaurant, revolutionized.',
      ctaPrimary: 'Get started',
      ctaSecondary: 'Watch the demo',
    },
  },
}

/* ─── Framer variants ─────────────────────────────────────────────── */
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.97, filter: 'blur(3px)' },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: { type: 'spring', stiffness: 120, damping: 22, mass: 0.8 },
  },
}

const heroTextVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: 0.1 + i * 0.1,
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1],
    },
  }),
}

/* ─── Fake QR pattern helper ─────────────────────────────────────── */
function isQrFilled(i: number): boolean {
  const col = i % 7
  const row = Math.floor(i / 7)
  return (
    ((i * 7 + row * 3) % 5 < 2) ||
    (i < 7 && (col < 3 || col > 4)) ||
    (i >= 42 && (col < 3 || col > 4)) ||
    (col < 3 && row < 3) ||
    (col > 4 && row < 3) ||
    (col === 3 && row >= 3 && row < 6 && row % 2 >= 1)
  )
}

/* ─── Sub-components ──────────────────────────────────────────────── */

function StepCard({ step, index, label }: { step: Step; index: number; label: string }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  const Icon = step.icon
  return (
    <motion.div
      ref={ref}
      variants={cardVariants}
      className="relative"
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{
        type: 'spring',
        stiffness: 120,
        damping: 22,
        mass: 0.8,
        delay: index * 0.06,
      }}
    >
      {/* Connector line */}
      {index < STEP_META.length - 1 && (
        <div className="hidden lg:block absolute top-14 left-[calc(50%+2rem)] w-[calc(100%-4rem)] h-px bg-gradient-to-r from-brand-amber/25 via-brand-emerald/25 to-brand-terra/25" />
      )}

      <div className="noise-overlay group relative overflow-hidden rounded-3xl border border-ink/5 bg-white/80 p-6 shadow-sm backdrop-blur lift-hover text-center">
        {/* Step number */}
        <span className="inline-block text-[0.65rem] font-black tracking-widest mb-4 px-3 py-1 rounded-full bg-[#f5efe0] text-ink/60">
          {label} {step.num}
        </span>

        {/* Icon */}
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg ${step.iconBg}`}
        >
          <Icon size={28} />
        </motion.div>

        <h3 className="text-lg font-bold mb-3 text-ink">{step.title}</h3>
        <p className="text-sm leading-relaxed mx-auto max-w-xs text-ink/60">
          {step.description}
        </p>

        {/* Hover glow */}
        <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-b from-brand-amber/5 to-transparent" />
      </div>
    </motion.div>
  )
}

function BenefitCard({ benefit }: { benefit: Benefit }) {
  const Icon = benefit.icon
  return (
    <motion.div
      variants={cardVariants}
      className="noise-overlay group relative overflow-hidden rounded-3xl border border-ink/5 bg-white/80 p-6 shadow-sm backdrop-blur lift-hover"
    >
      <div className="flex items-start gap-4 mb-4">
        <div
          className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${benefit.iconBg}`}
        >
          <Icon size={20} />
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-sm mb-1 text-ink">{benefit.title}</h4>
          <p className="text-xs leading-relaxed text-ink/60">
            {benefit.description}
          </p>
        </div>
      </div>
      {/* Stat */}
      <div className="flex items-baseline gap-2 pl-[60px]">
        <span className={`text-2xl font-black ${benefit.accent}`}>
          {benefit.stat}
        </span>
        <span className="text-xs font-semibold text-ink/60">
          {benefit.statLabel}
        </span>
      </div>
    </motion.div>
  )
}

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon
  return (
    <motion.div
      variants={cardVariants}
      className="noise-overlay group relative overflow-hidden rounded-3xl border border-ink/5 bg-white/80 p-5 shadow-sm backdrop-blur lift-hover h-full"
    >
      <div className="flex items-start gap-3.5">
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-110 ${feature.iconBg}`}
        >
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm mb-1 text-ink">{feature.title}</h4>
          <p className="text-xs leading-relaxed text-ink/60">
            {feature.description}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

function FAQItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FAQ
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className="border-b border-ink/10 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-4 py-4 px-1 text-left cursor-pointer group"
      >
        <span className="font-semibold text-sm sm:text-base text-ink transition-colors duration-200 group-hover:text-brand-amber">
          {item.question}
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="flex-shrink-0"
        >
          <ChevronDown size={18} className="text-ink/60" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <p className="text-sm leading-relaxed pb-4 px-1 text-ink/60">
              {item.answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="text-lg font-black leading-none text-ink">{value}</div>
      <div className="text-[0.6rem] font-semibold mt-0.5 text-ink/60">
        {label}
      </div>
    </div>
  )
}

/* ─── Main Page ───────────────────────────────────────────────────── */
export default function QrCodePage() {
  const { lang } = useI18n()
  const t = T[lang]
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)
  const heroRef = useRef<HTMLElement>(null)
  useInView(heroRef, { once: true })

  const steps: Step[] = STEP_META.map((meta, i) => ({
    ...meta,
    ...t.steps.items[i],
  }))
  const benefits: Benefit[] = BENEFIT_META.map((meta, i) => ({
    ...meta,
    ...t.benefits.items[i],
  }))
  const features: Feature[] = FEATURE_META.map((meta, i) => ({
    ...meta,
    ...t.features.items[i],
  }))
  const faqs: FAQ[] = t.faq.items
  const qrDemoItems = QR_DEMO_META.map((meta, i) => ({
    ...meta,
    label: t.qrDemo.items[i],
  }))

  return (
    <PageShell>
    <div className="flex flex-col relative overflow-x-clip">
      {/* ─── Hero Section ───────────────────────────────────────── */}
      <section className="relative pt-28 sm:pt-36 pb-10 sm:pb-14 px-4" ref={heroRef}>
        {/* Decorative floating orbs */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-brand-amber/20 blur-3xl animate-float-soft pointer-events-none" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] rounded-full bg-brand-rose/20 blur-2xl animate-float-soft pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-[450px] h-[450px] rounded-full bg-brand-emerald/15 blur-3xl animate-blob pointer-events-none" />

        {/* Floating blurred restaurant icons */}
        <UtensilsCrossed
          size={40}
          className="absolute top-24 left-[8%] text-brand-terra/25 blur-[1px] animate-float-soft pointer-events-none hidden lg:block"
        />
        <ChefHat
          size={36}
          className="absolute top-40 right-[10%] text-brand-terra/25 blur-[1px] animate-float-soft pointer-events-none hidden lg:block"
          style={{ animationDelay: '1.5s' }}
        />
        <Wine
          size={34}
          className="absolute bottom-16 left-[15%] text-brand-terra/25 blur-[1px] animate-float-soft pointer-events-none hidden lg:block"
          style={{ animationDelay: '3s' }}
        />

        <div className="max-w-4xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Left: Text */}
            <div>
              <motion.div
                custom={0}
                variants={heroTextVariants}
                initial="hidden"
                animate="visible"
                className="mb-5"
              >
                <span className="eyebrow border border-brand-violet/30 bg-brand-violet/10 text-brand-violet">
                  <QrCode size={16} />
                  <span>{t.hero.eyebrow}</span>
                </span>
              </motion.div>

              <motion.h1
                custom={1}
                variants={heroTextVariants}
                initial="hidden"
                animate="visible"
                className="font-serif text-5xl font-black leading-[1.04] tracking-tight text-ink text-lift drop-shadow-sm sm:text-6xl mb-5"
              >
                <span className="text-gradient-warm">{t.hero.title1}</span>
                <br />
                <span className="hero-veil">{t.hero.title2}</span>
              </motion.h1>

              <motion.p
                custom={2}
                variants={heroTextVariants}
                initial="hidden"
                animate="visible"
                className="text-lg text-ink/60 leading-relaxed mb-7"
              >
                {t.hero.subtitle}
              </motion.p>

              <motion.div
                custom={3}
                variants={heroTextVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-wrap gap-3"
              >
                <motion.button
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  className="bg-gradient-to-r from-brand-amber to-brand-terra text-white shadow-glow-amber rounded-full sheen px-6 py-3 font-bold text-sm inline-flex items-center gap-2 group"
                >
                  <QrCode size={17} />
                  <span>{t.hero.ctaPrimary}</span>
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  className="border-ink/15 bg-white/70 text-ink backdrop-blur rounded-full lift-hover px-6 py-3 font-bold text-sm inline-flex items-center gap-2"
                >
                  <span>{t.hero.ctaSecondary}</span>
                </motion.button>
              </motion.div>

              {/* Trust row */}
              <motion.div
                custom={4}
                variants={heroTextVariants}
                initial="hidden"
                animate="visible"
                className="flex items-center gap-6 mt-8 pt-6 border-t border-ink/5"
              >
                <HeroStat value={t.hero.stats[0].value} label={t.hero.stats[0].label} />
                <div className="w-px h-8 bg-ink/10" />
                <HeroStat value={t.hero.stats[1].value} label={t.hero.stats[1].label} />
                <div className="w-px h-8 bg-ink/10" />
                <HeroStat value={t.hero.stats[2].value} label={t.hero.stats[2].label} />
              </motion.div>
            </div>

            {/* Right: Phone mockup */}
            <motion.div
              custom={2}
              variants={heroTextVariants}
              initial="hidden"
              animate="visible"
              className="relative flex justify-center lg:justify-end"
            >
              <div className="relative">
                {/* Phone mockup */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className="relative z-10"
                >
                  <div className="w-[260px] sm:w-[280px] rounded-[2rem] p-3 shadow-2xl bg-white/80 backdrop-blur-xl border border-ink/10">
                    {/* Notch */}
                    <div className="w-20 h-5 rounded-full mx-auto mb-3 bg-ink" />
                    {/* Screen content */}
                    <div className="rounded-[1.2rem] overflow-hidden bg-[#f5efe0]">
                      {/* Restaurant header */}
                      <div className="p-4 pb-3 text-center bg-gradient-to-br from-brand-amber to-brand-terra">
                        <div className="w-10 h-10 rounded-full bg-white/20 mx-auto mb-2 flex items-center justify-center">
                          <UtensilsCrossed size={20} className="text-white" />
                        </div>
                        <p className="text-white font-bold text-sm">
                          {t.phone.restaurant}
                        </p>
                        <p className="text-white/70 text-[0.65rem]">{t.phone.table}</p>
                      </div>
                      {/* Menu items preview */}
                      <div className="p-3 space-y-2.5">
                        {PHONE_ITEMS.map((item) => (
                          <div
                            key={item.name}
                            className="flex items-center gap-3 p-2.5 rounded-xl bg-white/80"
                          >
                            <div
                              className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center ${item.iconBg}`}
                            >
                              <Utensils size={16} className={item.iconColor} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate text-ink">
                                {item.name}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-ink">
                                {item.price}
                              </span>
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${item.btnBg}`}
                              >
                                <span className="text-xs font-bold">+</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Cart bar */}
                      <div className="mx-3 mb-3 p-3 rounded-xl flex items-center justify-between bg-gradient-to-br from-brand-amber to-brand-terra">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                            <ShoppingCart size={12} className="text-white" />
                          </div>
                          <span className="text-white text-xs font-bold">
                            {t.phone.cartItems}
                          </span>
                        </div>
                        <span className="text-white text-sm font-black">€34</span>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Floating QR badge */}
                <motion.div
                  animate={{ y: [0, -6, 0], scale: [1, 1.05, 1] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 1,
                  }}
                  className="absolute -left-6 bottom-16 z-20 w-16 h-16 rounded-2xl bg-white shadow-xl flex items-center justify-center border border-ink/10"
                >
                  <QrCode size={30} className="text-brand-amber" />
                </motion.div>

                {/* Floating scan badge */}
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: 2,
                  }}
                  className="absolute -right-4 top-20 z-20 px-3 py-2 rounded-xl bg-white shadow-lg text-center border border-ink/10"
                >
                  <ScanLine size={18} className="text-brand-emerald" />
                  <p className="text-[0.55rem] font-bold mt-0.5 text-ink">
                    {t.scan}
                  </p>
                </motion.div>

                {/* Background glow */}
                <div className="absolute inset-0 -z-10 blur-3xl opacity-30 bg-gradient-radial from-brand-amber/30 to-transparent" />
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom hairline */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-amber/70 to-brand-rose/60 animate-gradient-pan" />
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-4 mb-12">
        <div className="h-px divider-gradient opacity-80" />
      </div>

      {/* ─── How it works ──────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 mb-16 sm:mb-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <span className="eyebrow border border-brand-emerald/30 bg-brand-emerald/10 text-brand-emerald mb-4 inline-flex items-center gap-2">
            <CircleCheckBig size={13} />
            {t.steps.eyebrow}
          </span>
          <h2 className="font-serif text-4xl font-black tracking-tight text-ink sm:text-5xl mb-3">
            {t.steps.title}
          </h2>
          <p className="text-sm sm:text-base max-w-lg mx-auto text-ink/60">
            {t.steps.subtitle}
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5"
        >
          {steps.map((step, i) => (
            <StepCard key={step.num} step={step} index={i} label={t.steps.stepLabel} />
          ))}
        </motion.div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-4 mb-12">
        <div className="h-px divider-gradient opacity-80" />
      </div>

      {/* ─── Why QR (Benefits) ─────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 mb-16 sm:mb-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <span className="eyebrow border border-brand-amber/30 bg-brand-amber/10 text-brand-amber mb-4 inline-flex items-center gap-2">
            <TrendingUp size={13} />
            {t.benefits.eyebrow}
          </span>
          <h2 className="font-serif text-4xl font-black tracking-tight text-ink sm:text-5xl mb-3">
            {t.benefits.title}
          </h2>
          <p className="text-sm sm:text-base max-w-lg mx-auto text-ink/60">
            {t.benefits.subtitle}
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {benefits.map((b) => (
            <BenefitCard key={b.title} benefit={b} />
          ))}
        </motion.div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-4 mb-12">
        <div className="h-px divider-gradient opacity-80" />
      </div>

      {/* ─── Feature Grid ──────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 mb-16 sm:mb-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <span className="eyebrow border border-brand-terra/30 bg-brand-terra/10 text-brand-terra mb-4 inline-flex items-center gap-2">
            <Zap size={13} />
            {t.features.eyebrow}
          </span>
          <h2 className="font-serif text-4xl font-black tracking-tight text-ink sm:text-5xl mb-3">
            {t.features.title}
          </h2>
          <p className="text-sm sm:text-base max-w-lg mx-auto text-ink/60">
            {t.features.subtitle}
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
        >
          {features.map((f) => (
            <FeatureCard key={f.title} feature={f} />
          ))}
        </motion.div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-4 mb-12">
        <div className="h-px divider-gradient opacity-80" />
      </div>

      {/* ─── QR Code Visual Section ────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 mb-16 sm:mb-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="noise-overlay group relative overflow-hidden rounded-3xl border border-ink/5 bg-white/80 shadow-sm backdrop-blur"
        >
          <div className="p-6 sm:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              {/* Left: Code visual */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-3xl flex flex-col items-center justify-center bg-white shadow-xl border border-ink/5">
                    {/* Fake QR pattern */}
                    <div className="grid grid-cols-7 gap-[3px] mb-4">
                      {Array.from({ length: 49 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-[7px] h-[7px] rounded-[1px] ${isQrFilled(i) ? 'bg-ink' : 'bg-transparent'}`}
                        />
                      ))}
                    </div>
                    <p className="text-[0.65rem] font-bold font-mono text-ink">
                      TAVO-A7K2
                    </p>
                  </div>

                  {/* Action badges floating */}
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    className="absolute -top-3 -right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white shadow-lg text-xs font-bold text-ink border border-ink/5"
                  >
                    <Download size={13} className="text-brand-amber" /> PNG
                  </motion.div>
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{
                      duration: 3.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: 0.8,
                    }}
                    className="absolute -bottom-3 -left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white shadow-lg text-xs font-bold text-ink border border-ink/5"
                  >
                    <Printer size={13} className="text-brand-emerald" /> {t.qrDemo.print}
                  </motion.div>
                </div>
              </div>

              {/* Right: Explanation */}
              <div>
                <h3 className="font-serif text-3xl font-black tracking-tight text-ink sm:text-4xl mb-4">
                  {t.qrDemo.title}
                </h3>
                <p className="text-sm leading-relaxed mb-6 text-ink/60">
                  {t.qrDemo.descPrefix}{' '}
                  <strong className="text-ink">{t.qrDemo.descHighlight}</strong>{' '}
                  {t.qrDemo.descMiddle}{' '}
                  <code className="px-1.5 py-0.5 rounded-md text-xs font-mono font-bold bg-brand-amber/10 text-brand-amber">
                    TAVO-A7K2
                  </code>
                  .
                </p>

                <div className="space-y-3">
                  {qrDemoItems.map((item) => {
                    const ItemIcon = item.icon
                    return (
                      <div key={item.label} className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${item.iconBg}`}
                        >
                          <ItemIcon size={15} className={item.iconColor} />
                        </div>
                        <span className="text-sm text-ink">{item.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-4 mb-12">
        <div className="h-px divider-gradient opacity-80" />
      </div>

      {/* ─── FAQ ───────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 mb-16 sm:mb-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <span className="eyebrow border border-brand-rose/30 bg-brand-rose/10 text-brand-rose mb-4 inline-flex items-center gap-2">
            <HandCoins size={13} />
            {t.faq.eyebrow}
          </span>
          <h2 className="font-serif text-4xl font-black tracking-tight text-ink sm:text-5xl mb-3">
            {t.faq.title}
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="noise-overlay group relative overflow-hidden rounded-3xl border border-ink/5 bg-white/80 shadow-sm backdrop-blur"
        >
          <div className="p-5 sm:p-6">
            <div className="divide-y divide-ink/10">
              {faqs.map((faq, i) => (
                <FAQItem
                  key={i}
                  item={faq}
                  isOpen={openFAQ === i}
                  onToggle={() =>
                    setOpenFAQ(openFAQ === i ? null : i)
                  }
                />
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-4 mb-12">
        <div className="h-px divider-gradient opacity-80" />
      </div>

      {/* ─── Footer CTA ────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6 }}
        className="pb-8"
      >
        <div className="max-w-4xl mx-auto px-4">
          <div className="relative overflow-hidden bg-gradient-to-br from-brand-terra via-brand-amber to-brand-rose rounded-[2.5rem] noise-overlay">
            {/* Sheen layer */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full sheen" />

            {/* Sparkle dots */}
            <div className="absolute top-8 left-12 w-2 h-2 rounded-full bg-white/30 animate-sparkle-spin" />
            <div className="absolute top-20 right-16 w-1.5 h-1.5 rounded-full bg-white/25 animate-sparkle-spin" style={{ animationDelay: '1s' }} />
            <div className="absolute bottom-12 left-1/4 w-1.5 h-1.5 rounded-full bg-white/20 animate-sparkle-spin" style={{ animationDelay: '2s' }} />
            <div className="absolute bottom-20 right-1/3 w-2 h-2 rounded-full bg-white/30 animate-sparkle-spin" style={{ animationDelay: '0.5s' }} />

            <div className="relative z-10 py-14 sm:py-18 px-4 text-center">
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 15,
                  delay: 0.15,
                }}
                className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center text-white mx-auto mb-6 shadow-lg"
              >
                <QrCode size={28} />
              </motion.div>

              <h2 className="text-lift-strong font-serif text-3xl sm:text-4xl font-black text-white mb-3 leading-tight tracking-tight">
                {t.cta.title}
              </h2>
              <p className="max-w-lg mx-auto mb-7 text-sm sm:text-base leading-relaxed text-white/80">
                {t.cta.subtitle}
              </p>

              <div className="flex flex-wrap justify-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="bg-white text-brand-terra shadow-lg rounded-full px-8 py-3.5 font-bold text-sm inline-flex items-center gap-2 group hover:shadow-xl transition-shadow"
                >
                  <span>{t.cta.ctaPrimary}</span>
                  <ArrowRight
                    size={16}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="border border-white/30 bg-white/10 text-white backdrop-blur rounded-full px-8 py-3.5 font-bold text-sm inline-flex items-center gap-2 hover:bg-white/20 transition-colors"
                >
                  <Sparkles size={16} className="animate-sparkle-spin" />
                  <span>{t.cta.ctaSecondary}</span>
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
    </PageShell>
  )
}
