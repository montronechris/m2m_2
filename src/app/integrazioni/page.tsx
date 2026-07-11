'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { PageShell } from '@/components/landing/PageShell'
import {
  Truck,
  CalendarCheck,
  CreditCard,
  PackageCheck,
  HeartHandshake,
  Sparkles,
  ShieldCheck,
  MonitorSmartphone,
  Star,
  ShoppingBag,
  ChevronUp,
  ThumbsUp,
  TrendingUp,
  Flame,
  Trophy,
  ArrowRight,
  Clock,
  Users,
  CheckCircle2,
  X,
  Search,
  UtensilsCrossed,
  ChefHat,
  Wine,
  Lightbulb,
} from 'lucide-react'
import { useI18n } from '@/components/i18n/I18nProvider'
import { supabase } from '@/lib/supabase'

/* ─── Icon key (stored in DB as text) → lucide component ─────────── */
const ICON_MAP: Record<string, React.ElementType> = {
  Truck, CalendarCheck, CreditCard, PackageCheck, HeartHandshake,
  Sparkles, ShieldCheck, MonitorSmartphone, Star, ShoppingBag,
}

/* ─── DB row shape (public.integration_cards) ───────────────────── */
interface DbCard {
  id: string
  card_key: string
  icon_key: string
  tag_key: string
  title_it: string
  title_en: string
  description_it: string
  description_en: string
  votes: number
  sort_order: number
  is_active: boolean
}

/* ─── Types ─────────────────────────────────────────────────────── */
type IntegrationId =
  | 'delivery'
  | 'prenotazioni'
  | 'pagamenti'
  | 'scorte'
  | 'fidelizzazione'
  | 'menu-ai'
  | 'allergeni'
  | 'pos'
  | 'recensioni'
  | 'takeaway'

type TagKey =
  | 'popular'
  | 'requested'
  | 'coming_soon'
  | 'new'
  | 'trending'
  | 'innovative'
  | 'compliance'
  | 'essential'
  | 'ai_powered'
  | 'practical'

interface IntegrationBase {
  id: string          // card_key (usato per UI keys / ricerca)
  cardId: string      // uuid della riga integration_cards (usato per il voto)
  tagKey: TagKey
  icon: React.ElementType
  votes: number
  voted: boolean
}

interface Integration extends IntegrationBase {
  title: string
  description: string
  tag: string
}

/* ─── Tag metadata (labels per lang + css class) ─────────────────── */
const TAG_META: Record<TagKey, { it: string; en: string; class: string }> = {
  popular:     { it: 'Popolare',     en: 'Popular',      class: 'bg-brand-amber/12 text-brand-amber' },
  requested:   { it: 'Richiesto',    en: 'Requested',    class: 'bg-brand-emerald/12 text-brand-emerald' },
  coming_soon: { it: 'In arrivo',    en: 'Coming soon',  class: 'bg-brand-violet/12 text-brand-violet' },
  new:         { it: 'Nuovo',        en: 'New',          class: 'bg-brand-rose/12 text-brand-rose' },
  trending:    { it: 'Trending',     en: 'Trending',     class: 'bg-brand-terra/15 text-brand-terra' },
  innovative:  { it: 'Innovativo',   en: 'Innovative',   class: 'bg-brand-amber/12 text-brand-amber' },
  compliance:  { it: 'Compliance',   en: 'Compliance',   class: 'bg-brand-emerald/12 text-brand-emerald' },
  essential:   { it: 'Essenziale',   en: 'Essential',    class: 'bg-brand-violet/12 text-brand-violet' },
  ai_powered:  { it: 'AI-Powered',   en: 'AI-Powered',   class: 'bg-brand-rose/12 text-brand-rose' },
  practical:   { it: 'Pratico',      en: 'Practical',    class: 'bg-brand-terra/15 text-brand-terra' },
}

/* Le card e i voti sono ora caricati da public.integration_cards (vedi il
   componente principale). L'ordine e i conteggi vivono nel DB, non più qui. */

/* ─── Sort options (label resolved per lang via T.sort) ─────────── */
const SORT_OPTIONS = [
  { key: 'votes-desc', labelKey: 'mostVoted',   icon: TrendingUp },
  { key: 'votes-asc',  labelKey: 'leastVoted',  icon: ChevronUp },
  { key: 'recent',     labelKey: 'recent',      icon: Clock },
  { key: 'name',       labelKey: 'alphabetical', icon: Users },
] as const

type SortKey = (typeof SORT_OPTIONS)[number]['key']
type SortLabelKey = (typeof SORT_OPTIONS)[number]['labelKey']

/* ─── Bilingual translations ────────────────────────────────────── */
interface IntegrationText {
  title: string
  description: string
}

interface Translations {
  hero: {
    eyebrow: string
    title1: string
    title2: string
    subtitle1: string
    subtitle2: string
  }
  stats: {
    totalVotes: string
    integrations: string
    yourVotes: string
  }
  search: {
    placeholder: string
  }
  sort: {
    mostVoted: string
    leastVoted: string
    recent: string
    alphabetical: string
  }
  filter: {
    all: string
    voted: string
    notVoted: string
  }
  voteButton: {
    vote: string
    voted: string
  }
  card: {
    votes: string
    ofMax: string
    restaurants: string
  }
  empty: {
    title: string
    subtitle: string
    button: string
  }
  suggestion: {
    title: string
    subtitle: string
    primaryButton: string
    secondaryButton: string
  }
  integrations: Record<IntegrationId, IntegrationText>
}

const T: Record<'it' | 'en', Translations> = {
  it: {
    hero: {
      eyebrow: 'Roadmap della piattaforma',
      title1: 'Integrazioni',
      title2: 'Future',
      subtitle1: 'Scegli le funzionalità che vorresti vedere nella piattaforma.',
      subtitle2: 'Il tuo voto ci aiuta a prioritizzare gli sviluppi futuri.',
    },
    stats: {
      totalVotes: 'Voti totali',
      integrations: 'Integrazioni',
      yourVotes: 'I tuoi voti',
    },
    search: {
      placeholder: "Cerca un'integrazione...",
    },
    sort: {
      mostVoted: 'Più votati',
      leastVoted: 'Meno votati',
      recent: 'Più recenti',
      alphabetical: 'Alfabetico',
    },
    filter: {
      all: 'Tutti',
      voted: 'Votati',
      notVoted: 'Da votare',
    },
    voteButton: {
      vote: 'Vota',
      voted: 'Votato',
    },
    card: {
      votes: 'voti',
      ofMax: 'del massimo',
      restaurants: 'ristoranti',
    },
    empty: {
      title: 'Nessun risultato',
      subtitle: 'Prova a cercare con termini diversi o rimuovi i filtri attivi.',
      button: 'Rimuovi filtri',
    },
    suggestion: {
      title: "Hai un'idea per una nuova integrazione?",
      subtitle:
        'Ci piace ascoltare i nostri ristoratori. Suggerisci una funzionalità che ti servirebbe e la valuteremo per la prossima roadmap.',
      primaryButton: 'Invia un suggerimento',
      secondaryButton: 'Scopri la roadmap',
    },
    integrations: {
      delivery: {
        title: 'Consegna & Delivery',
        description:
          "Collega il tuo ristorante a Glovo, Deliveroo, Just Eat e altri platform di delivery. Sincronizza ordini, menu e disponibilità in tempo reale da un unico pannello.",
      },
      prenotazioni: {
        title: 'Prenotazioni Online',
        description:
          'Gestisci prenotazioni direttamente dal tuo sito. Integrazione con TheFork, Resy e Google Reserve. Notifiche automatiche per conferme e promemoria ai clienti.',
      },
      pagamenti: {
        title: 'Pagamenti Digitali',
        description:
          'Accetta pagamenti con Satispay, SumUp, Stripe e circuito Bancomat. Fatturazione automatica, split payment per tavoli e chiusura cassa semplificata.',
      },
      scorte: {
        title: 'Gestione Scorte & Inventario',
        description:
          'Traccia ingredienti, scorte e scadenze in automatico. Allarmi per riordino, calcolo food cost in tempo reale e suggerimenti per ridurre lo spreco alimentare.',
      },
      fidelizzazione: {
        title: 'Programma Fedeltà',
        description:
          'Crea programmi punti, sconti fedeltà e coupon personalizzati. Il cliente accumula punti ad ogni ordine e sblocca ricompense esclusive del tuo ristorante.',
      },
      'menu-ai': {
        title: 'Menu con Intelligenza Artificiale',
        description:
          "Genera descrizioni accattivanti per i tuoi piatti, ottimizza i prezzi in base ai trend e ottieni suggerimenti stagionali. L'AI impara il tuo stile culinario.",
      },
      allergeni: {
        title: 'Gestione Allergeni Auto',
        description:
          'Scansione automatica degli ingredienti per identificare allergeni. Genera dichiarazione conforme al regolamento UE 1169/2011 con aggiornamenti in tempo reale.',
      },
      pos: {
        title: 'Integrazione POS & Cassa',
        description:
          'Collega la tua cassa fisica (Zettle, Kasarda, Tilby) al sistema. Sincronizza ordini digitali e fisici, gestisci incassi e report giornalieri unificati.',
      },
      recensioni: {
        title: 'Recensioni Automatiche',
        description:
          'Raccogli recensioni Google e TripAdvisor in automatico dopo ogni pasto. Rispondi ai feedback con AI, monitora il sentiment e migliora il tuo rating online.',
      },
      takeaway: {
        title: 'Take-Away & Asporto',
        description:
          'Menù dedicato per asporto con orari di ritiro, packaging personalizzabile e tracker ordini. Il cliente prenota e ritira senza attese alla cassa.',
      },
    },
  },
  en: {
    hero: {
      eyebrow: 'Platform roadmap',
      title1: 'Future',
      title2: 'Integrations',
      subtitle1: 'Choose the features you would like to see on the platform.',
      subtitle2: 'Your vote helps us prioritize future development.',
    },
    stats: {
      totalVotes: 'Total votes',
      integrations: 'Integrations',
      yourVotes: 'Your votes',
    },
    search: {
      placeholder: 'Search for an integration...',
    },
    sort: {
      mostVoted: 'Most voted',
      leastVoted: 'Least voted',
      recent: 'Most recent',
      alphabetical: 'Alphabetical',
    },
    filter: {
      all: 'All',
      voted: 'Voted',
      notVoted: 'To vote',
    },
    voteButton: {
      vote: 'Vote',
      voted: 'Voted',
    },
    card: {
      votes: 'votes',
      ofMax: 'of max',
      restaurants: 'restaurants',
    },
    empty: {
      title: 'No results',
      subtitle: 'Try searching with different terms or remove the active filters.',
      button: 'Remove filters',
    },
    suggestion: {
      title: 'Have an idea for a new integration?',
      subtitle:
        'We love hearing from our restaurateurs. Suggest a feature you would like and we will evaluate it for our next roadmap.',
      primaryButton: 'Submit a suggestion',
      secondaryButton: 'Discover the roadmap',
    },
    integrations: {
      delivery: {
        title: 'Delivery & Takeaway',
        description:
          'Connect your restaurant to Glovo, Deliveroo, Just Eat and other delivery platforms. Sync orders, menus and availability in real time from a single panel.',
      },
      prenotazioni: {
        title: 'Online Reservations',
        description:
          'Manage reservations directly from your website. Integration with TheFork, Resy and Google Reserve. Automatic notifications for confirmations and customer reminders.',
      },
      pagamenti: {
        title: 'Digital Payments',
        description:
          'Accept payments with Satispay, SumUp, Stripe and the Bancomat network. Automatic invoicing, split payments per table and simplified end-of-day closing.',
      },
      scorte: {
        title: 'Stock & Inventory Management',
        description:
          'Automatically track ingredients, stock and expiry dates. Reorder alerts, real-time food cost calculation and suggestions to reduce food waste.',
      },
      fidelizzazione: {
        title: 'Loyalty Program',
        description:
          'Create points programs, loyalty discounts and personalized coupons. The customer accumulates points with every order and unlocks exclusive rewards from your restaurant.',
      },
      'menu-ai': {
        title: 'AI-Powered Menu',
        description:
          'Generate engaging descriptions for your dishes, optimize prices based on trends and get seasonal suggestions. The AI learns your culinary style.',
      },
      allergeni: {
        title: 'Auto Allergen Management',
        description:
          'Automatic ingredient scanning to identify allergens. Generate a declaration compliant with EU regulation 1169/2011 with real-time updates.',
      },
      pos: {
        title: 'POS & Cash Register Integration',
        description:
          'Connect your physical cash register (Zettle, Kasarda, Tilby) to the system. Sync digital and physical orders, manage takings and unified daily reports.',
      },
      recensioni: {
        title: 'Automatic Reviews',
        description:
          'Automatically collect Google and TripAdvisor reviews after every meal. Reply to feedback with AI, monitor sentiment and improve your online rating.',
      },
      takeaway: {
        title: 'Take-Away & Pickup',
        description:
          'Dedicated takeaway menu with pickup times, customizable packaging and order tracking. The customer books and picks up without waiting at the counter.',
      },
    },
  },
}

/* ─── Tag class lookup ──────────────────────────────────────────── */
function getTagClass(tagKey: TagKey): string {
  return TAG_META[tagKey].class
}

/* ─── Sub-components ────────────────────────────────────────────── */

function SortButton({
  option,
  label,
  isActive,
  onClick,
}: {
  option: (typeof SORT_OPTIONS)[number]
  label: string
  isActive: boolean
  onClick: () => void
}) {
  const Icon = option.icon
  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-semibold
        transition-all duration-250 ease-out cursor-pointer
        ${
          isActive
            ? 'bg-gradient-to-r from-brand-amber to-brand-terra text-white shadow-glow-amber sheen scale-[1.02]'
            : 'border-ink/15 bg-white/70 text-ink backdrop-blur rounded-full lift-hover'
        }
      `}
    >
      <Icon size={14} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function VoteButton({
  integration,
  onVote,
  labels,
}: {
  integration: Integration
  onVote: (id: string) => void
  labels: { vote: string; voted: string }
}) {
  const [justVoted, setJustVoted] = useState(false)

  const handleVote = () => {
    if (!integration.voted) {
      setJustVoted(true)
      onVote(integration.cardId)
      setTimeout(() => setJustVoted(false), 500)
    }
  }

  return (
    <motion.button
      onClick={handleVote}
      disabled={integration.voted}
      whileTap={integration.voted ? {} : { scale: 0.9 }}
      className={`
        relative flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold
        transition-all duration-300 cursor-pointer select-none overflow-hidden
        ${
          integration.voted
            ? 'border border-brand-emerald/25 bg-brand-emerald/15 text-brand-emerald cursor-default'
            : 'bg-gradient-to-r from-brand-amber to-brand-terra text-white shadow-glow-amber sheen hover:-translate-y-0.5 active:scale-95'
        }
      `}
    >
      {integration.voted ? (
        <>
          <CheckCircle2 size={16} />
          <span>{labels.voted}</span>
        </>
      ) : (
        <>
          <ThumbsUp size={16} />
          <span>{labels.vote}</span>
        </>
      )}
      <AnimatePresence>
        {justVoted && (
          <motion.span
            className="absolute inset-0 rounded-full bg-brand-emerald/30"
            initial={{ scale: 0.8, opacity: 0.6 }}
            animate={{ scale: 1.4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  )
}

/* ─── Integration Card ──────────────────────────────────────────── */
function IntegrationCard({
  integration,
  maxVotes,
  onVote,
  index,
  cardLabels,
  voteLabels,
}: {
  integration: Integration
  maxVotes: number
  onVote: (id: string) => void
  index: number
  cardLabels: { votes: string; ofMax: string; restaurants: string }
  voteLabels: { vote: string; voted: string }
}) {
  const Icon = integration.icon
  const tagClass = getTagClass(integration.tagKey)
  const barWidth = Math.min((integration.votes / maxVotes) * 100, 100)
  const isTop3 = index < 3

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ delay: (index % 3) * 0.08, duration: 0.55 }}
      className="noise-overlay group relative overflow-hidden rounded-3xl border border-ink/5 bg-white/80 p-6 shadow-sm backdrop-blur lift-hover"
    >
      {/* Gradient top border on hover */}
      <div className="absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-gradient-to-r from-brand-amber via-brand-rose to-brand-violet opacity-0 transition-all duration-500 group-hover:scale-x-100 group-hover:opacity-100" />

      {/* Big faint number in corner */}
      <span className="absolute right-3 top-1 font-serif text-7xl font-black leading-none text-brand-amber/10 select-none pointer-events-none">
        {String(integration.votes).padStart(3, '0')}
      </span>

      {/* Top-voted ribbon */}
      {isTop3 && (
        <div className="absolute top-0 right-0 z-10">
          <div
            className={`flex items-center gap-1 px-3 py-1 rounded-bl-xl text-[0.65rem] font-bold text-white ${index === 0 ? 'bg-gradient-to-r from-brand-amber to-brand-terra' : index === 1 ? 'bg-gradient-to-r from-brand-emerald to-brand-sky' : 'bg-gradient-to-r from-brand-terra to-brand-violet'}`}
          >
            <Trophy size={11} />
            <span>#{index + 1}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        {/* Icon */}
        <div className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl bg-brand-amber/15 text-brand-amber transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6">
          <Icon size={24} />
        </div>

        {/* Title + Tag */}
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-lg font-bold leading-tight mb-1.5 text-ink">
            {integration.title}
          </h3>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[0.65rem] font-bold tracking-wide ${tagClass}`}
          >
            {integration.tag}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm leading-relaxed mb-5 text-ink/60">
        {integration.description}
      </p>

      {/* Vote bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-ink">
            {integration.votes} {cardLabels.votes}
          </span>
          <span className="text-xs text-ink/60">
            {Math.round(barWidth)}% {cardLabels.ofMax}
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden bg-[#f5efe0]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand-amber to-brand-terra"
            initial={{ width: 0 }}
            whileInView={{ width: `${barWidth}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 + (index % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>

      {/* Action */}
      <div className="flex items-center justify-between">
        <VoteButton integration={integration} onVote={onVote} labels={voteLabels} />

        <motion.div
          className="flex items-center gap-1.5 text-xs text-ink/60"
          initial={{ opacity: 0, x: 10 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 + (index % 3) * 0.08 }}
        >
          <Users size={13} />
          <span>{cardLabels.restaurants}</span>
        </motion.div>
      </div>
    </motion.div>
  )
}

/* ─── Confetti Particle ─────────────────────────────────────────── */
function ConfettiParticle({ index }: { index: number }) {
  // Confetti uses brand-palette colors — mapped to their CSS var equivalents
  const colors = ['var(--color-brand-amber)', 'var(--color-brand-terra)', 'var(--color-brand-emerald)', 'var(--color-brand-violet)', 'var(--color-brand-rose)']
  const startX = Math.random() * 100
  const delay = Math.random() * 3
  const duration = 2.5 + Math.random() * 2
  const size = 4 + Math.random() * 6
  const drift = (Math.random() - 0.5) * 80

  return (
    <motion.div
      className="absolute rounded-sm"
      style={{
        width: size,
        height: size * (0.6 + Math.random() * 0.8),
        background: colors[index % colors.length],
        left: `${startX}%`,
        top: '-5%',
        rotate: Math.random() * 360,
      }}
      animate={{
        y: ['0vh', '105vh'],
        x: [0, drift],
        rotate: [0, 360 + Math.random() * 360],
        opacity: [1, 1, 0],
      }}
      transition={{ duration, delay, repeat: Infinity, ease: 'linear' }}
    />
  )
}

/* ─── Stat Pill ─────────────────────────────────────────────────── */
function StatPill({ icon, value, label, accentClass }: {
  icon: React.ReactNode; value: number; label: string; accentClass: string
}) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border border-ink/5 bg-white/80 shadow-sm backdrop-blur">
      <div className={`grid h-8 w-8 place-items-center rounded-xl text-white ${accentClass}`}>
        {icon}
      </div>
      <div className="text-left">
        <div className="text-lg font-black leading-none text-ink">{value}</div>
        <div className="text-[0.65rem] font-semibold mt-0.5 text-ink/60">{label}</div>
      </div>
    </div>
  )
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function IntegrazioniPage() {
  const { lang } = useI18n()
  const t = T[lang]

  // Card + voti caricati dal DB (public.integration_cards / integration_votes).
  const [cards, setCards] = useState<DbCard[]>([])
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [canVote, setCanVote] = useState(false)         // abbonamento attivo non-prova
  const [votedCardIds, setVotedCardIds] = useState<Set<string>>(new Set())
  const [voteMsg, setVoteMsg] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('votes-desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [showConfetti, setShowConfetti] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string>('all')

  const heroRef = useRef(null)
  const gridRef = useRef(null)
  useInView(heroRef, { once: true, margin: '-50px' })
  useInView(gridRef, { once: false, margin: '-30px' })

  // Carica card attive + stato utente (loggato? idoneo al voto?) + voti già dati.
  useEffect(() => {
    let active = true
    const load = async () => {
      const { data: cardRows } = await supabase
        .from('integration_cards')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
      if (!active) return
      setCards((cardRows as DbCard[]) ?? [])

      const { data: { user } } = await supabase.auth.getUser()
      if (!active) return
      setIsLoggedIn(!!user)

      if (user) {
        // RPC gate (abbonamento attivo non-prova) + voti esistenti del ristorante.
        const [{ data: canVoteData }, { data: voteRows }] = await Promise.all([
          supabase.rpc('can_vote_integrations'),
          supabase.from('integration_votes').select('card_id'),
        ])
        if (!active) return
        setCanVote(canVoteData === true)
        setVotedCardIds(
          new Set((voteRows ?? []).map((v: { card_id: string }) => v.card_id)),
        )
      }
      setLoading(false)
    }
    load().catch(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  // Auto-dismiss del messaggio di voto (login/idoneità/errore).
  useEffect(() => {
    if (!voteMsg) return
    const timer = setTimeout(() => setVoteMsg(null), 4000)
    return () => clearTimeout(timer)
  }, [voteMsg])

  // Costruisce gli oggetti Integration dalla riga DB, localizzando testo/tag.
  const integrations: Integration[] = cards.map((c) => ({
    id: c.card_key,
    cardId: c.id,
    tagKey: c.tag_key as TagKey,
    icon: ICON_MAP[c.icon_key] ?? Sparkles,
    votes: c.votes,
    voted: votedCardIds.has(c.id),
    title: lang === 'it' ? c.title_it : c.title_en,
    description: lang === 'it' ? c.description_it : c.description_en,
    tag: TAG_META[c.tag_key as TagKey]?.[lang] ?? c.tag_key,
  }))

  // Derived value: total votes across all integrations.
  const totalVotes = integrations.reduce((sum, i) => sum + i.votes, 0)

  // Voto: solo utenti loggati con abbonamento attivo non-prova (gate lato DB via
  // RLS/RPC; qui filtriamo per UX e inseriamo in integration_votes). cardId = uuid.
  const handleVote = useCallback(async (cardId: string) => {
    if (!isLoggedIn) {
      setVoteMsg(lang === 'it'
        ? 'Accedi con un account ristorante per votare.'
        : 'Sign in with a restaurant account to vote.')
      return
    }
    if (!canVote) {
      setVoteMsg(lang === 'it'
        ? 'Solo gli account con abbonamento attivo (non di prova) possono votare.'
        : 'Only accounts with an active (non-trial) subscription can vote.')
      return
    }
    if (votedCardIds.has(cardId)) return

    // Aggiornamento ottimistico.
    setVotedCardIds((prev) => new Set(prev).add(cardId))
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, votes: c.votes + 1 } : c)))
    setShowConfetti(true)
    setTimeout(() => setShowConfetti(false), 2000)

    const { error } = await supabase.from('integration_votes').insert({ card_id: cardId })
    if (error) {
      // Rollback in caso di errore (es. voto duplicato o non idoneo lato RLS).
      setVotedCardIds((prev) => { const n = new Set(prev); n.delete(cardId); return n })
      setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, votes: Math.max(c.votes - 1, 0) } : c)))
      setVoteMsg(lang === 'it'
        ? 'Voto non registrato: potresti aver già votato o non essere idoneo.'
        : 'Vote not recorded: you may have already voted or are not eligible.')
    }
  }, [isLoggedIn, canVote, votedCardIds, lang])

  const sortedIntegrations = integrations
    .filter((i) => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)
    })
    .filter((i) => {
      if (activeFilter === 'voted') return i.voted
      if (activeFilter === 'not-voted') return !i.voted
      return true
    })
    .sort((a, b) => {
      switch (sortKey) {
        case 'votes-desc': return b.votes - a.votes
        case 'votes-asc': return a.votes - b.votes
        case 'name': return a.title.localeCompare(b.title)
        case 'recent':
          if (a.voted && !b.voted) return -1
          if (!a.voted && b.voted) return 1
          return b.votes - a.votes
        default: return 0
      }
    })

  const maxVotes = Math.max(...integrations.map((i) => i.votes), 1)
  const votedCount = integrations.filter((i) => i.voted).length

  const filterOptions: { key: 'all' | 'voted' | 'not-voted'; label: string }[] = [
    { key: 'all', label: t.filter.all },
    { key: 'voted', label: t.filter.voted },
    { key: 'not-voted', label: t.filter.notVoted },
  ]

  const sortLabel = (labelKey: SortLabelKey): string => t.sort[labelKey]

  const voteLabels = { vote: t.voteButton.vote, voted: t.voteButton.voted }
  const cardLabels = {
    votes: t.card.votes,
    ofMax: t.card.ofMax,
    restaurants: t.card.restaurants,
  }

  return (
    <PageShell>
    <div className="flex flex-col relative overflow-x-clip">
      {/* ─── Animated background orbs ─────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="pointer-events-none absolute -top-32 -left-32 h-44 w-44 rounded-full bg-brand-amber/10 blur-3xl animate-float-soft" />
        <div className="pointer-events-none absolute top-1/3 -right-24 h-44 w-44 rounded-full bg-brand-emerald/10 blur-3xl animate-float-soft" style={{ animationDelay: '2s' }} />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-44 w-44 rounded-full bg-brand-rose/8 blur-3xl animate-float-soft" style={{ animationDelay: '4s' }} />

        {/* Floating blurred restaurant icons */}
        <motion.div
          className="pointer-events-none absolute top-24 right-[15%] text-brand-amber/6 blur-2xl"
          animate={{ y: [0, -12, 0], rotate: [0, 8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <UtensilsCrossed size={64} />
        </motion.div>
        <motion.div
          className="pointer-events-none absolute top-[40%] left-[8%] text-brand-emerald/6 blur-2xl"
          animate={{ y: [0, -10, 0], rotate: [0, -6, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        >
          <ChefHat size={56} />
        </motion.div>
        <motion.div
          className="pointer-events-none absolute bottom-[30%] right-[10%] text-brand-rose/6 blur-2xl"
          animate={{ y: [0, -14, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2.5 }}
        >
          <Wine size={48} />
        </motion.div>
      </div>

      {/* ─── Confetti overlay ─────────────────────────────────────── */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            {Array.from({ length: 20 }).map((_, i) => (
              <ConfettiParticle key={i} index={i} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Toast messaggio voto (login / idoneità / errore) ──────── */}
      <AnimatePresence>
        {voteMsg && (
          <motion.div
            role="status"
            aria-live="polite"
            className="fixed top-20 left-1/2 z-[60] -translate-x-1/2 max-w-[92vw] rounded-2xl border border-brand-terra/25 bg-brand-cream/95 px-5 py-3 text-center text-sm font-semibold text-brand-terra shadow-xl backdrop-blur"
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ duration: 0.25 }}
          >
            {voteMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Hero Section ─────────────────────────────────────────── */}
      <section className="relative pt-28 sm:pt-36 pb-12 sm:pb-16 px-4" ref={heroRef}>
        <div className="max-w-4xl mx-auto text-center">
          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.55 }}
            className="font-serif text-4xl font-black tracking-tight text-ink sm:text-5xl lg:text-6xl leading-[1.1] mb-4"
          >
            <span className="text-gradient-warm">{t.hero.title1}</span>
            <br />
            <span className="text-ink">{t.hero.title2}</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.55 }}
            className="text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed text-ink/60"
          >
            {t.hero.subtitle1}
            <br className="hidden sm:block" />
            {t.hero.subtitle2}
          </motion.p>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.55 }}
            className="flex flex-wrap items-center justify-center gap-4 sm:gap-6"
          >
            <StatPill
              icon={<Flame size={16} />}
              value={totalVotes}
              label={t.stats.totalVotes}
              accentClass="bg-brand-amber"
            />
            <StatPill
              icon={<TrendingUp size={16} />}
              value={integrations.length}
              label={t.stats.integrations}
              accentClass="bg-brand-emerald"
            />
            <StatPill
              icon={<ThumbsUp size={16} />}
              value={votedCount}
              label={t.stats.yourVotes}
              accentClass="bg-brand-terra"
            />
          </motion.div>
        </div>
      </section>

      {/* ─── Decorative divider ───────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 mb-10">
        <div className="h-px divider-gradient" />
      </div>

      {/* ─── Controls bar ─────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 mb-8">
        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mb-5"
        >
          <div className="relative max-w-md mx-auto sm:mx-0">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.search.placeholder}
              className="w-full rounded-full border border-ink/10 bg-white/80 py-2.5 pl-10 pr-10 text-sm text-ink placeholder:text-ink/40 backdrop-blur shadow-sm outline-none transition-all duration-200 focus:border-brand-amber/40 focus:ring-2 focus:ring-brand-amber/10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </motion.div>

        {/* Sort + Filter row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          {/* Sort buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {SORT_OPTIONS.map((option) => (
              <SortButton
                key={option.key}
                option={option}
                label={sortLabel(option.labelKey)}
                isActive={sortKey === option.key}
                onClick={() => setSortKey(option.key)}
              />
            ))}
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-2">
            {filterOptions.map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`
                  px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer
                  ${
                    activeFilter === f.key
                      ? 'bg-[#f5efe0] text-ink border border-brand-amber/20'
                      : 'border-ink/10 bg-white/70 text-ink/60 backdrop-blur hover:text-ink'
                  }
                `}
              >
                {f.label}
              </button>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─── Integration Grid ─────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 pb-24" ref={gridRef}>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-24"
            >
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-terra/20 border-t-brand-terra" />
            </motion.div>
          ) : sortedIntegrations.length > 0 ? (
            <motion.div
              key={`${sortKey}-${searchQuery}-${activeFilter}`}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6"
            >
              {sortedIntegrations.map((integration, index) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  maxVotes={maxVotes}
                  onVote={handleVote}
                  index={index}
                  cardLabels={cardLabels}
                  voteLabels={voteLabels}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5 bg-[#f5efe0]">
                <Search size={32} className="text-ink/30" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-ink">
                {t.empty.title}
              </h3>
              <p className="text-sm max-w-sm text-ink/60">
                {t.empty.subtitle}
              </p>
              <button
                onClick={() => { setSearchQuery(''); setActiveFilter('all') }}
                className="mt-4 border-ink/15 bg-white/70 text-ink backdrop-blur rounded-full lift-hover px-5 py-2 text-sm font-semibold cursor-pointer"
              >
                {t.empty.button}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ─── Bottom CTA Section ───────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-4 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ delay: 0.1, duration: 0.55 }}
          className="noise-overlay relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-terra via-brand-amber to-brand-rose p-10 sm:p-16 text-center"
        >
          {/* Sheen overlay */}
          <div className="sheen pointer-events-none absolute inset-0 rounded-[2.5rem]" />

          {/* Sparkle dots */}
          <div className="pointer-events-none absolute top-8 left-12 h-2 w-2 rounded-full bg-white/40 animate-blob" />
          <div className="pointer-events-none absolute top-16 right-20 h-1.5 w-1.5 rounded-full bg-white/30 animate-blob" style={{ animationDelay: '1s' }} />
          <div className="pointer-events-none absolute bottom-12 left-1/4 h-1.5 w-1.5 rounded-full bg-white/25 animate-blob" style={{ animationDelay: '2s' }} />
          <div className="pointer-events-none absolute bottom-8 right-1/3 h-2 w-2 rounded-full bg-white/20 animate-blob" style={{ animationDelay: '3s' }} />

          {/* Background orb */}
          <div className="pointer-events-none absolute -top-20 -right-20 h-44 w-44 rounded-full bg-white/10 blur-3xl animate-float-soft" />

          <div className="relative z-10 max-w-2xl mx-auto">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
              className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-white text-brand-terra shadow-lg"
            >
              <Sparkles size={28} />
            </motion.div>

            <h2 className="text-lift-strong font-serif text-3xl sm:text-4xl font-black tracking-tight text-white mb-4 leading-tight">
              {t.suggestion.title}
            </h2>
            <p className="text-lift max-w-xl mx-auto mb-8 text-base sm:text-lg leading-relaxed text-white/80">
              {t.suggestion.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="bg-white text-brand-terra font-semibold rounded-full px-8 py-3.5 shadow-lg transition-shadow duration-300 hover:shadow-xl cursor-pointer group flex items-center gap-2"
              >
                <span>{t.suggestion.primaryButton}</span>
                <ArrowRight
                  size={18}
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="glass border-white/40 bg-white/15 text-white font-semibold rounded-full px-8 py-3.5 backdrop-blur cursor-pointer"
              >
                {t.suggestion.secondaryButton}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

    </div>
    </PageShell>
  )
}
