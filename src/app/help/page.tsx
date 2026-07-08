'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence, useInView } from 'framer-motion'
import { PageShell } from '@/components/landing/PageShell'
import { useI18n } from '@/components/i18n/I18nProvider'
import {
  Search,
  ChevronDown,
  ChevronRight,
  MessageCircle,
  Mail,
  Phone,
  BookOpen,
  UtensilsCrossed,
  ShoppingCart,
  CreditCard,
  TableProperties,
  Users,
  Palette,
  BarChart3,
  Settings,
  Shield,
  Zap,
  ArrowRight,
  ExternalLink,
  Clock,
  HelpCircle,
  Lightbulb,
  Headphones,
  FileText,
  Video,
  X,
  Star,
  CircleCheckBig,
  ArrowUpRight,
} from 'lucide-react'

/* ─── Types ─────────────────────────────────────────────────────── */
interface FAQItem {
  question: string
  answer: string
}

interface Category {
  id: string
  title: string
  description: string
  icon: React.ElementType
  articleCount: number
}

interface Guide {
  id: string
  title: string
  description: string
  category: string
  readTime: string
  featured?: boolean
}

interface Article {
  id: string
  title: string
  category: string // category id (e.g. 'ordini', 'menu')
  readTime: string
  excerpt: string
  content: string[] // paragraphs
  helpful?: boolean // shown as "consigliato" badge
}

/* ─── UI labels ─────────────────────────────────────────────────── */
const UI = {
  it: {
    hero: {
      eyebrow: 'Centro Assistenza',
      title1: 'Come possiamo',
      title2: 'aiutarti?',
      subtitle1: 'Cerca tra le guide, le FAQ o contattaci direttamente.',
      subtitle2: 'Trova la risposta in pochi secondi.',
    },
    search: {
      placeholder: 'Cerca una guida, una domanda...',
    },
    stats: {
      articles: 'Articoli',
      guides: 'Guide',
      support: 'Supporto',
    },
    noResults: {
      title: 'Nessun risultato per',
      description: 'Prova con termini diversi o consulta le categorie qui sotto.',
      clear: 'Cancella ricerca',
    },
    categories: {
      title: 'Sfoglia per categoria',
      articles: 'articoli',
    },
    articlePanel: {
      articlesInCategory: 'articoli in questa categoria',
      close: 'Chiudi',
      recommended: 'Consigliato',
      helpful: 'Utile',
      comment: 'Commenta',
      category: 'Categoria',
    },
    articleSearch: {
      title: 'Articoli della guida',
      foundSingular: 'articolo trovato',
      foundPlural: 'articoli trovati',
      forSearch: 'per la tua ricerca',
    },
    tabs: {
      faq: 'FAQ',
      guides: 'Guide',
      contact: 'Contattaci',
    },
    faq: {
      title: 'Domande frequenti',
      subtitle: 'Le risposte più cercate dai ristoratori',
      noResults: 'Nessuna FAQ corrisponde alla tua ricerca.',
    },
    guides: {
      featured: 'In evidenza',
      featuredTitle: 'Guide in evidenza',
      allTitle: 'Tutte le guide',
      readGuide: 'Leggi guida',
      noResults: 'Nessuna guida corrisponde alla tua ricerca.',
    },
    contact: {
      title: 'Non hai trovato quello che cercavi?',
      subtitle: 'Il nostro team è pronto ad aiutarti. Scegli il canale che preferisci.',
      liveChat: { title: 'Chat Live', description: 'Risposta immediata', action: 'Avvia chat' },
      email: { title: 'Email', description: 'supporto@m2m.it', action: 'Invia email' },
      phone: { title: 'Telefono', description: 'Lun-Ven 9:00-18:00', action: 'Chiama ora' },
      responseTime: 'Tempo medio di risposta: meno di 2 ore',
    },
    quickLinks: {
      title: 'Risorse utili',
      subtitle: 'Video tutorial, aggiornamenti e documentazione tecnica',
      video: 'Video tutorial',
      changelog: 'Changelog',
      privacy: 'Privacy & Termini',
      api: 'API Docs',
    },
    cta: {
      title: 'Hai ancora bisogno di aiuto?',
      body: 'Il nostro team di supporto è composto da persone che conoscono il mondo della ristorazione. Non robot, non chatbot — persone vere.',
      button: 'Parla con il supporto',
    },
  },
  en: {
    hero: {
      eyebrow: 'Help Center',
      title1: 'How can we',
      title2: 'help you?',
      subtitle1: 'Search the guides, FAQs or contact us directly.',
      subtitle2: 'Find the answer in seconds.',
    },
    search: {
      placeholder: 'Search for a guide, a question...',
    },
    stats: {
      articles: 'Articles',
      guides: 'Guides',
      support: 'Support',
    },
    noResults: {
      title: 'No results for',
      description: 'Try different terms or browse the categories below.',
      clear: 'Clear search',
    },
    categories: {
      title: 'Browse by category',
      articles: 'articles',
    },
    articlePanel: {
      articlesInCategory: 'articles in this category',
      close: 'Close',
      recommended: 'Recommended',
      helpful: 'Helpful',
      comment: 'Comment',
      category: 'Category',
    },
    articleSearch: {
      title: 'Guide articles',
      foundSingular: 'article found',
      foundPlural: 'articles found',
      forSearch: 'for your search',
    },
    tabs: {
      faq: 'FAQ',
      guides: 'Guides',
      contact: 'Contact us',
    },
    faq: {
      title: 'Frequently asked questions',
      subtitle: 'The most searched answers from restaurateurs',
      noResults: 'No FAQ matches your search.',
    },
    guides: {
      featured: 'Featured',
      featuredTitle: 'Featured guides',
      allTitle: 'All guides',
      readGuide: 'Read guide',
      noResults: 'No guide matches your search.',
    },
    contact: {
      title: 'Didn\'t find what you were looking for?',
      subtitle: 'Our team is ready to help. Choose your preferred channel.',
      liveChat: { title: 'Live Chat', description: 'Immediate response', action: 'Start chat' },
      email: { title: 'Email', description: 'supporto@m2m.it', action: 'Send email' },
      phone: { title: 'Phone', description: 'Mon-Fri 9:00-18:00', action: 'Call now' },
      responseTime: 'Average response time: less than 2 hours',
    },
    quickLinks: {
      title: 'Useful resources',
      subtitle: 'Video tutorials, updates and technical documentation',
      video: 'Video tutorials',
      changelog: 'Changelog',
      privacy: 'Privacy & Terms',
      api: 'API Docs',
    },
    cta: {
      title: 'Still need help?',
      body: 'Our support team is made of people who know the restaurant world. Not robots, not chatbots — real people.',
      button: 'Talk to support',
    },
  },
}

/* ─── Categories ────────────────────────────────────────────────── */
const CATEGORIES_BY_LANG: Record<'it' | 'en', Category[]> = {
  it: [
    { id: 'ordini', title: 'Ordini', description: 'Gestione, stato e tracking degli ordini', icon: ShoppingCart, articleCount: 6 },
    { id: 'menu', title: 'Menu', description: 'Creazione, categorie, varianti e prezzi', icon: UtensilsCrossed, articleCount: 7 },
    { id: 'tavoli', title: 'Tavoli & QR', description: 'Mappa tavoli, codici QR e assegnazione', icon: TableProperties, articleCount: 6 },
    { id: 'pagamenti', title: 'Pagamenti', description: 'Metodi di pagamento, ricevute e contabilità', icon: CreditCard, articleCount: 6 },
    { id: 'staff', title: 'Staff & Ruoli', description: 'Gestione camerieri, cuochi e permessi', icon: Users, articleCount: 5 },
    { id: 'branding', title: 'Branding', description: 'Logo, colori, tema personalizzato', icon: Palette, articleCount: 5 },
    { id: 'analytics', title: 'Analytics', description: 'Statistiche vendite, report e insight', icon: BarChart3, articleCount: 6 },
    { id: 'impostazioni', title: 'Impostazioni', description: 'Account, notifiche e configurazione', icon: Settings, articleCount: 7 },
  ],
  en: [
    { id: 'ordini', title: 'Orders', description: 'Order management, status and tracking', icon: ShoppingCart, articleCount: 6 },
    { id: 'menu', title: 'Menu', description: 'Creation, categories, variants and pricing', icon: UtensilsCrossed, articleCount: 7 },
    { id: 'tavoli', title: 'Tables & QR', description: 'Table map, QR codes and assignment', icon: TableProperties, articleCount: 6 },
    { id: 'pagamenti', title: 'Payments', description: 'Payment methods, receipts and accounting', icon: CreditCard, articleCount: 6 },
    { id: 'staff', title: 'Staff & Roles', description: 'Waiters, cooks and permissions management', icon: Users, articleCount: 5 },
    { id: 'branding', title: 'Branding', description: 'Logo, colors, custom theme', icon: Palette, articleCount: 5 },
    { id: 'analytics', title: 'Analytics', description: 'Sales statistics, reports and insights', icon: BarChart3, articleCount: 6 },
    { id: 'impostazioni', title: 'Settings', description: 'Account, notifications and configuration', icon: Settings, articleCount: 7 },
  ],
}

/* ─── FAQ ───────────────────────────────────────────────────────── */
const FAQS_BY_LANG: Record<'it' | 'en', FAQItem[]> = {
  it: [
    {
      question: 'Come creo il mio primo menu?',
      answer: 'Dalla dashboard vai su "Menu" → "Aggiungi categoria" per creare le sezioni (es. Antipasti, Primi, Secondi). Poi tocca "+" dentro ogni categoria per aggiungere i piatti. Per ogni piatto puoi inserire nome, descrizione, prezzo, foto, varianti e allergeni.',
    },
    {
      question: 'Come funzionano i codici QR per i tavoli?',
      answer: 'Vai su "Tavoli" nella dashboard. Ogni tavolo ha un QR code unico che puoi stampare e posizionare sul tavolo. Il cliente scannerizza il QR con il telefono, vede il menu e può ordinare direttamente. L\'ordine arriva subito nel pannello cucina.',
    },
    {
      question: 'Posso gestire più ristoranti con un solo account?',
      answer: 'Sì, dalla sezione Impostazioni puoi aggiungere più sedi. Ogni sede ha il proprio menu, tavoli e statistiche, ma puoi gestire tutto dallo stesso pannello admin con un unico login.',
    },
    {
      question: 'Come cambiano le foto dei piatti?',
      answer: 'Entra nella modifica del piatto (tocco lungo sul piatto → Modifica). Tocca l\'area della foto per aprire la galleria. Puoi usare la fotocamera o selezionare un\'immagine esistente. Le foto vengono ottimizzate automaticamente per una visualizzazione veloce.',
    },
    {
      question: 'Come gestisco gli allergeni?',
      answer: 'Nelle impostazioni del singolo piatto trovi la sezione "Allergeni". Seleziona dalla lista ufficiale (Glutine, Lattosio, Uova, ecc.). L\'informazione appare automaticamente nel menu digitale del cliente con le icone di riferimento.',
    },
    {
      question: 'Come assegno i ruoli al mio staff?',
      answer: 'Vai su "Staff" → "Invita membro". Inserisci nome e email, poi scegli il ruolo: Admin (accesso completo), Cameriere (solo ordini e tavoli), Cucina (solo ordini in arrivo). Ogni ruolo vede solo le sezioni pertinenti.',
    },
    {
      question: 'Posso esportare le statistiche di vendita?',
      answer: 'Sì, dalla sezione "Analytics" puoi visualizzare i report giornalieri, settimanali e mensili. Tocca l\'icona di condivisione in alto a destra per esportare i dati in formato CSV o PDF, perfetti per il tuo commercialista.',
    },
    {
      question: 'Come funziona la notifica nuovo ordine?',
      answer: 'Quando un cliente effettua un ordine, ricevi una notifica push istantanea sul dispositivo. Nelle Impostazioni puoi personalizzare il suono, attivare la vibrazione e scegliere se ricevere notifiche anche via email.',
    },
  ],
  en: [
    {
      question: 'How do I create my first menu?',
      answer: 'From the dashboard go to "Menu" → "Add category" to create sections (e.g. Starters, First courses, Mains). Then tap "+" inside each category to add dishes. For each dish you can enter name, description, price, photo, variants and allergens.',
    },
    {
      question: 'How do table QR codes work?',
      answer: 'Go to "Tables" in the dashboard. Each table has a unique QR code you can print and place on the table. The customer scans the QR with their phone, sees the menu and can order directly. The order arrives immediately in the kitchen panel.',
    },
    {
      question: 'Can I manage multiple restaurants with one account?',
      answer: 'Yes, from the Settings section you can add multiple locations. Each location has its own menu, tables and statistics, but you can manage everything from the same admin panel with a single login.',
    },
    {
      question: 'How do I change dish photos?',
      answer: 'Open the dish editor (long tap on the dish → Edit). Tap the photo area to open the gallery. You can use the camera or select an existing image. Photos are automatically optimized for fast display.',
    },
    {
      question: 'How do I manage allergens?',
      answer: 'In each dish\'s settings you\'ll find the "Allergens" section. Select from the official list (Gluten, Lactose, Eggs, etc.). The information appears automatically in the customer\'s digital menu with reference icons.',
    },
    {
      question: 'How do I assign roles to my staff?',
      answer: 'Go to "Staff" → "Invite member". Enter name and email, then choose the role: Admin (full access), Waiter (orders and tables only), Kitchen (incoming orders only). Each role sees only the relevant sections.',
    },
    {
      question: 'Can I export sales statistics?',
      answer: 'Yes, from the "Analytics" section you can view daily, weekly and monthly reports. Tap the share icon in the top right to export the data in CSV or PDF format, perfect for your accountant.',
    },
    {
      question: 'How does the new order notification work?',
      answer: 'When a customer places an order, you receive an instant push notification on your device. In Settings you can customize the sound, enable vibration and choose whether to also receive notifications via email.',
    },
  ],
}

/* ─── Guides ────────────────────────────────────────────────────── */
const GUIDES_BY_LANG: Record<'it' | 'en', Guide[]> = {
  it: [
    {
      id: 'g1', title: 'Inizia da qui: guida rapida al setup',
      description: 'Configura il tuo ristorante in 5 minuti. Dalle impostazioni base al primo ordine ricevuto.',
      category: 'Impostazioni', readTime: '3 min', featured: true,
    },
    {
      id: 'g2', title: 'Creare un menu irresistibile',
      description: 'Suggerimenti per foto, descrizioni e struttura del menu che aumentano le vendite.',
      category: 'Menu', readTime: '5 min', featured: true,
    },
    {
      id: 'g3', title: 'Gestire gli ordini nel rush hour',
      description: 'Come organizzare cucina e camerieri per gestire picchi di ordini senza stress.',
      category: 'Ordini', readTime: '4 min', featured: true,
    },
    {
      id: 'g4', title: 'Personalizzare il tema del ristorante',
      description: 'Logo, colori, font e stile: rendi la tua app unica come il tuo locale.',
      category: 'Branding', readTime: '3 min',
    },
    {
      id: 'g5', title: 'Leggere le analytics come un pro',
      description: 'Piatti più venduti, orari di punta, scontrino medio: guide alla lettura dei dati.',
      category: 'Analytics', readTime: '6 min',
    },
    {
      id: 'g6', title: 'QR Code: best practices per i tavoli',
      description: 'Dimensioni, posizione, materiale e design dei QR per una scansione senza problemi.',
      category: 'Tavoli & QR', readTime: '2 min',
    },
    {
      id: 'g7', title: 'Impostare i metodi di pagamento',
      description: 'Contanti, carta, Satispay: come configurare e gestire ogni metodo di pagamento.',
      category: 'Pagamenti', readTime: '3 min',
    },
    {
      id: 'g8', title: 'Gestire il team: ruoli e permessi',
      description: 'Come invitare membri, assegnare ruoli e revocare accessi in modo sicuro.',
      category: 'Staff & Ruoli', readTime: '4 min',
    },
  ],
  en: [
    {
      id: 'g1', title: 'Start here: quick setup guide',
      description: 'Set up your restaurant in 5 minutes. From basic settings to the first order received.',
      category: 'Settings', readTime: '3 min', featured: true,
    },
    {
      id: 'g2', title: 'Create an irresistible menu',
      description: 'Tips for photos, descriptions and menu structure that increase sales.',
      category: 'Menu', readTime: '5 min', featured: true,
    },
    {
      id: 'g3', title: 'Manage orders during rush hour',
      description: 'How to organize kitchen and waiters to handle order peaks without stress.',
      category: 'Orders', readTime: '4 min', featured: true,
    },
    {
      id: 'g4', title: 'Customize the restaurant theme',
      description: 'Logo, colors, fonts and style: make your app as unique as your venue.',
      category: 'Branding', readTime: '3 min',
    },
    {
      id: 'g5', title: 'Read analytics like a pro',
      description: 'Best-selling dishes, peak hours, average ticket: guides to reading the data.',
      category: 'Analytics', readTime: '6 min',
    },
    {
      id: 'g6', title: 'QR Code: best practices for tables',
      description: 'Size, position, material and QR design for hassle-free scanning.',
      category: 'Tables & QR', readTime: '2 min',
    },
    {
      id: 'g7', title: 'Set up payment methods',
      description: 'Cash, card, Satispay: how to configure and manage every payment method.',
      category: 'Payments', readTime: '3 min',
    },
    {
      id: 'g8', title: 'Manage the team: roles and permissions',
      description: 'How to invite members, assign roles and revoke access securely.',
      category: 'Staff & Roles', readTime: '4 min',
    },
  ],
}

/* ─── Articles ────────────────────────────────────────────────────
   Real articles based on the m2m platform features (QR digital menu,
   kitchen display, analytics, payments, branding, staff, etc.).
   Each article corresponds to a category ID. */

const ARTICLES_BY_LANG: Record<'it' | 'en', Article[]> = {
  it: [
    /* ── Ordini ── */
    {
      id: 'a-ord-1', title: 'Come funziona il flusso di un ordine dal tavolo alla cucina',
      category: 'ordini', readTime: '4 min', helpful: true,
      excerpt: 'Dal momento in cui il cliente scannerizza il QR a quando il piatto viene servito: tutti i passaggi dell\'ordine.',
      content: [
        'Quando un cliente scannerizza il QR code sul tavolo, il sistema crea automaticamente una sessione temporanea associata a quel tavolo. Il cliente vede il menù digitale personalizzato con il tuo brand e può aggiungere i piatti al carrello.',
        'Una volta confermato l\'ordine, questo appare in tempo reale sul Kitchen Display in cucina, con il numero del tavolo, l\'ora esatta, i piatti ordinati, le varianti scelte e le eventuali note speciali del cliente.',
        'La cucina può cambiare lo stato dell\'ordine (In preparazione, Pronto, Servito) con un semplice tocco. Ogni cambio di stato aggiorna automaticamente la vista del cameriere e, se configurato, invia una notifica push al cliente.',
        'Tutti gli ordini vengono registrati nello storico e contribuiscono alle statistiche di vendita. Puoi rivedere ogni ordine in qualsiasi momento dalla sezione "Storico ordini".',
      ],
    },
    {
      id: 'a-ord-2', title: 'Modificare o annullare un ordine dopo l\'invio in cucina',
      category: 'ordini', readTime: '2 min',
      excerpt: 'Il cliente ha cambiato idea o ha ordinato per sbaglio? Ecco come gestire modifiche e annullamenti.',
      content: [
        'Se l\'ordine è appena stato inviato e la cucina non ha ancora iniziato la preparazione, il cameriere può annullarlo dal pannello ordini. Basta aprire l\'ordine, toccare "Annulla ordine" e confermare. Il cliente riceve una notifica di annullamento.',
        'Per modifiche minori (aggiungere un piatto, cambiare una variante) è più semplice aggiungere un nuovo ordine separato allo stesso tavolo piuttosto che modificare quello esistente. Il sistema raggrupperà automaticamente gli ordini dello stesso tavolo.',
        'Se la cucina ha già iniziato a preparare un piatto, non è più possibile rimuoverlo dall\'ordine. In quel caso puoi segnare il piatto come "rimosso" per le statistiche, ma verrà comunque preparato.',
        'Gli annullamenti vengono tracciati nelle statistiche. Un alto numero di annullamenti può indicare problemi di comunicazione tra sala e cucina o un menù poco chiaro per i clienti.',
      ],
    },
    {
      id: 'a-ord-3', title: 'Stati degli ordini: cosa significano e come cambiarli',
      category: 'ordini', readTime: '3 min',
      excerpt: 'In attesa, In preparazione, Pronto, Servito, Pagato: la guida completa agli stati degli ordini.',
      content: [
        'Ogni ordine attraversa cinque stati principali: "In attesa" (appena ricevuto, non ancora preso in carico dalla cucina), "In preparazione" (la cucina sta cucinando), "Pronto" (il piatto è pronto per essere servito), "Servito" (il cameriere ha consegnato il piatto al tavolo) e "Pagato" (l\'ordine è stato saldato).',
        'La cucina cambia gli stati dal Kitchen Display. Il cameriere vede gli aggiornamenti in tempo reale sul proprio dispositivo. Quando un piatto passa a "Pronto", il cameriere riceve una notifica push.',
        'Puoi personalizzare i nomi degli stati e aggiungerne di nuovi (ad esempio "In attesa di ingredienti") dalle Impostazioni → Flusso ordini. Alcuni ristoranti aggiungono uno stato "Da impiattare" tra preparazione e pronto.',
        'Gli ordini in ritardo (in attesa da troppo tempo) vengono evidenziati in rosso sul Kitchen Display per permettere alla cucina di dare priorità.',
      ],
    },
    {
      id: 'a-ord-4', title: 'Gestire ordini multipli dallo stesso tavolo',
      category: 'ordini', readTime: '2 min',
      excerpt: 'Il cliente vuole ordinare altro a metà pasto? Ecco come aggiungere ordini a un tavolo già attivo.',
      content: [
        'Lo stesso tavolo può effettuare più ordini nel corso del pasto. Il cliente scannerizza di nuovo il QR (o ricarica la pagina) e vede il proprio carrello precedente con l\'opzione "Aggiungi nuovo ordine".',
        'Tutti gli ordini dello stesso tavolo vengono raggruppati automaticamente nel conto finale. Il cameriere può vedere il totale cumulativo in qualsiasi momento dal pannello tavoli.',
        'Per evitare confusione in cucina, ogni ordine aggiuntivo viene numerato (Ordine 1, Ordine 2, ecc.) e mostrato come card separata sul Kitchen Display, con il timestamp esatto.',
        'Al momento del pagamento puoi scegliere se far pagare al cliente un ordine singolo, una selezione di ordini o l\'intero conto del tavolo.',
      ],
    },
    {
      id: 'a-ord-5', title: 'Come inviare una notifica al cameriere dal tavolo',
      category: 'ordini', readTime: '2 min', helpful: true,
      excerpt: 'Il cliente può chiamare il cameriere, chiedere il conto o segnalare un problema senza alzarsi.',
      content: [
        'Dal menù digitale, il cliente ha sempre a disposizione tre pulsanti di chiamata in alto: "Chiama cameriere", "Chiedi il conto" e "Segnala problema". Un tocco e il cameriere riceve una notifica push immediata con il numero del tavolo.',
        'Sul dispositivo del cameriere la notifica mostra il tipo di richiesta, l\'ora e il tavolo. Le richieste vengono accodate per ordine di arrivo. Il cameriere può toccare "Preso in carico" per confermare di aver visto la richiesta.',
        'Puoi personalizzare i pulsanti di chiamata (aggiungere "Altro pane", "Acqua", ecc.) dalle Impostazioni → Chiamate tavolo. Alcuni ristoranti li disabilitano nei momenti di punta per ridurre il carico di lavoro.',
        'Tutte le richieste vengono registrate nello storico. Se un tavolo chiama ripetutamente il cameriere, il sistema lo evidenzia per segnalare un possibile disservizio.',
      ],
    },
    {
      id: 'a-ord-6', title: 'Visualizzare e filtrare lo storico ordini',
      category: 'ordini', readTime: '3 min',
      excerpt: 'Come cercare un ordine passato per tavolo, data, piatto o cameriere.',
      content: [
        'La sezione "Storico ordini" registra ogni ordine effettuato nel tuo ristorante. Puoi filtrare per data, per tavolo, per cameriere che ha servito, o cercare per nome piatto.',
        'Ogni ordine nello storico mostra tutti i dettagli: ora, tavolo, piatti, varianti, prezzo, metodo di pagamento, cameriere, tempo di preparazione e eventuali note del cliente.',
        'Lo storico è utile per risolvere contestazioni con i clienti ("non avevamo ordinato questo piatto"), per verificare la velocità del servizio in una certa serata e per identificare piatti con molti annullamenti.',
        'Puoi esportare lo storico in CSV o PDF dall\'icona di condivisione. I dati vengono conservati per 24 mesi, dopo di che vengono anonimizzati per rispettare la normativa GDPR.',
      ],
    },

    /* ── Menu ── */
    {
      id: 'a-menu-1', title: 'Creare la prima categoria del menù',
      category: 'menu', readTime: '3 min', helpful: true,
      excerpt: 'Antipasti, primi, secondi, dolci: come strutturare il menù per partire col piede giusto.',
      content: [
        'Dalla dashboard vai su "Menu" → "Aggiungi categoria". Inserisci il nome (es. "Antipasti"), una breve descrizione opzionale e un\'immagine di copertina. L\'immagine aiuta i clienti a orientarsi ed è consigliata per le categorie principali.',
        'L\'ordine delle categorie determina l\'ordine in cui appaiono nel menù digitale. Puoi riordinarle in qualsiasi momento trascinandole. Le categorie vuote non vengono mostrate ai clienti.',
        'Per ogni categoria puoi impostare un orario di disponibilità (ad esempio "Brunch" disponibile solo dalle 10 alle 14). I piatti di categorie non disponibili vengono nascosti automaticamente dal menù.',
        'Consiglio: crea prima le categorie, poi aggiungi i piatti. Inizialmente limitati a 4-6 categorie per non disperdere l\'attenzione del cliente. Puoi sempre aggiungerne altre in seguito.',
      ],
    },
    {
      id: 'a-menu-2', title: 'Aggiungere un piatto con foto, prezzo e descrizione',
      category: 'menu', readTime: '4 min',
      excerpt: 'Tutto quello che serve per creare un piatto che il cliente non possa resistere a ordinare.',
      content: [
        'Dentro una categoria tocca "+" per aggiungere un piatto. Inserisci nome, descrizione (max 200 caratteri, sii sintetico ma evocativo), prezzo e foto. La foto è il fattore che influenza più di tutti la scelta del cliente.',
        'Per le foto usa immagini ben illuminate, con il piatto ben in vista su un fondo pulito. Il sistema ottimizza automaticamente le immagini per il mobile, ma carica sempre file di almeno 800x800 pixel per un risultato nitido.',
        'Il prezzo può essere inserito con decimali (es. 14,50). Se il prezzo è 0 o vuoto, il piatto viene mostrato come "su richiesta" e non può essere ordinato direttamente: il cliente dovrà chiamare il cameriere.',
        'La descrizione è il momento di vendere il piatto. Elenca gli ingredienti principali, il metodo di cottura e un dettaglio che lo renda unico ("tartufo nero pregiato di Norcia", "pasta fresca fatta a mano ogni mattina").',
      ],
    },
    {
      id: 'a-menu-3', title: 'Gestire varianti e personalizzazioni dei piatti',
      category: 'menu', readTime: '5 min', helpful: true,
      excerpt: 'Taglia di carne, cottura, aggiunte, salse: come far personalizzare il piatto al cliente.',
      content: [
        'Nella modifica del piatto trovi la sezione "Varianti". Qui puoi creare gruppi di opzioni: ad esempio "Cottura" (al sangue, media, ben cotta), "Aggiunte" (+ tartufo +3€, + burrata +2€), "Salsa" (classica, piccante, senza).',
        'Per ogni gruppo scegli se è a scelta singola (radio button, il cliente ne seleziona uno) o multipla (checkbox, può selezionarne più di uno). Puoi rendere un gruppo obbligatorio: il cliente non può ordinare senza averlo scelto.',
        'Le aggiunte a pagamento vengono sommate automaticamente al prezzo del piatto. Il cliente vede il totale aggiornato in tempo reale nel carrello.',
        'Consiglio: non esagerare con le varianti. Più di 3-4 gruppi per piatto rendono l\'ordinazione lenta e frustrante. Per piatti complessi, valuta invece di creare due voci separate nel menù.',
      ],
    },
    {
      id: 'a-menu-4', title: 'Segnalare gli allergeni su ogni piatto',
      category: 'menu', readTime: '3 min', helpful: true,
      excerpt: 'Glutine, lattosio, uova, frutta a guscio: come mostrare gli allergeni in modo conforme.',
      content: [
        'Nella modifica del piatto trovi la sezione "Allergeni". Seleziona dalla lista ufficiale europea (glutine, crostacei, uova, pesce, arachidi, soia, lattosio, frutta a guscio, sedano, senape, semi di sesamo, solfiti, lupini, molluschi).',
        'Gli allergeni selezionati appaiono automaticamente nel menù digitale del cliente come icone colorate accanto al piatto. Passando il dito sull\'icona, il cliente vede il nome dell\'allergene.',
        'La segnalazione degli allergeni è obbligatoria per legge (Regolamento UE 1169/2011). Se un piatto contiene un allergene non dichiarato e un cliente ha una reazione, la responsabilità è del ristorante.',
        'Per i piatti "senza" (senza glutine, senza lattosio) puoi anche aggiungere un badge positivo che evidenzia la caratteristica. Molti clienti cercano attivamente ristoranti con opzioni senza allergeni.',
      ],
    },
    {
      id: 'a-menu-5', title: 'Tradurre il menù in più lingue',
      category: 'menu', readTime: '3 min',
      excerpt: 'Come far vedere il menù in italiano, inglese, tedesco, francese e altre lingue ai clienti stranieri.',
      content: [
        'm2m supporta la traduzione automatica del menù in oltre 20 lingue. Dalle Impostazioni → Lingue, attiva le lingue che vuoi offrire. Il cliente, aprendo il menù, vedrà il selettore lingua in alto.',
        'La traduzione automatica usa l\'intelligenza artificiale ed è di buona qualità, ma per i piatti con nomi tipici (es. "Cacio e pepe", "Saltimbocca alla romana") ti consigliamo di inserire manualmente la traduzione per ogni lingua, per non perdere il senso del piatto.',
        'Per inserire una traduzione manuale, modifica il piatto e usa il selettore lingua in alto per passare da una lingua all\'altra. Il sistema ricorda quale lingua stavi editando.',
        'Le varianti e gli allergeni vengono tradotti automaticamente. Le foto e i prezzi restano gli stessi per tutte le lingue.',
      ],
    },
    {
      id: 'a-menu-6', title: 'Disattivare temporaneamente un piatto (esaurito)',
      category: 'menu', readTime: '2 min',
      excerpt: 'Un ingrediente è finito? Come nascondere un piatto dal menù senza cancellarlo.',
      content: [
        'Quando un piatto non è più disponibile (ingrediente esaurito, fine giornata, problema fornitore), puoi disattivarlo dalla dashboard con un singolo tocco. Il piatto sparisce immediatamente dal menù digitale dei clienti.',
        'Il piatto non viene cancellato: rimane nel tuo database con tutte le sue informazioni (foto, prezzo, descrizione, allergeni, varianti). Quando torni ad averlo disponibile, basta riattivarlo e riapparirà nel menù.',
        'Puoi anche programmare la disattivazione: ad esempio, disattivare automaticamente il pesce crudo dopo le 22 per normativa HACCP. La funzione si trova in "Disponibilità programmata" dentro la modifica del piatto.',
        'Se un cliente aveva già il piatto nel carrello quando lo disattivi, riceve un avviso al momento di confermare l\'ordine e deve rimuoverlo dal carrello.',
      ],
    },
    {
      id: 'a-menu-7', title: 'Creare codici sconto e promozioni',
      category: 'menu', readTime: '4 min',
      excerpt: 'Sconti percentuali, importo fisso, 2x1: come creare promozioni per attirare clienti.',
      content: [
        'Dalla dashboard vai su "Promozioni" → "Crea sconto". Scegli il tipo: percentuale (es. -10%), importo fisso (es. -5€), 2x1, o omaggio (un piatto gratis sopra una certa spesa).',
        'Puoi rendere lo sconto applicabile a tutto il menù, a una categoria specifica o a un singolo piatto. È anche possibile limitarlo a certi giorni della settimana o fasce orarie (es. happy hour dalle 18 alle 20).',
        'Il cliente inserisce il codice sconto nel carrello prima di confermare l\'ordine. Se lo sconto è automatico (senza codice), viene applicato non appena le condizioni sono soddisfatte.',
        'Tieni traccia delle promozioni dalle statistiche: puoi vedere quante volte è stato usato uno sconto, l\'incasso generato e lo scontrino medio con/senza sconto. Utile per capire se una promo è stata redditizia.',
      ],
    },

    /* ── Tavoli & QR ── */
    {
      id: 'a-tav-1', title: 'Come generare e stampare i QR code per i tavoli',
      category: 'tavoli', readTime: '3 min', helpful: true,
      excerpt: 'Creazione, download e stampa dei QR: formati, materiali e consigli pratici.',
      content: [
        'Dalla dashboard vai su "Tavoli" → "Aggiungi tavolo". Inserisci il numero (o nome) del tavolo e il numero di coperti. Il sistema genera automaticamente un QR code univoco associato a quel tavolo.',
        'Per stampare i QR, tocca "Scarica PDF" per ottenere un file pronto per la stampa con 6-12 QR per pagina, ognuno con il numero del tavolo scritto sotto. Usa supporti rigidi in PVC o legno per resistere all\'usura del tavolo.',
        'La dimensione minima consigliata per la stampa è 6x6 cm. Sotto questa dimensione alcuni telefoni faticano a scannerizzare. Lascia sempre un bordo bianco di almeno 5 mm attorno al QR.',
        'Consiglio materiali: evita la carta (si rovina in poche settimane). Il PVC è economico e durevole. Per ristoranti di fascia alta, il legno o il metallo inciso sono più eleganti e si abbinano al tavolo.',
      ],
    },
    {
      id: 'a-tav-2', title: 'Associare un QR a un tavolo diverso',
      category: 'tavoli', readTime: '2 min',
      excerpt: 'Hai cambiato la numerazione dei tavoli o vuoi riutilizzare un QR? Ecco come fare.',
      content: [
        'Se vuoi riassociare un QR esistente a un tavolo diverso (ad esempio perché hai rinumerato i tavoli), apri il tavolo di destinazione e scegli "Associa QR esistente". Inserisci il codice stampato sul QR o scannerizzalo con la fotocamera.',
        'Il QR viene scollegato automaticamente dal tavolo precedente e collegato a quello nuovo. Se il tavolo precedente era attivo (con un ordine in corso), il sistema ti chiede conferma prima di procedere.',
        'Se un QR è stato perso o rubato, puoi disattivarlo dal tavolo corrispondente e generarne uno nuovo. Il vecchio QR smette immediatamente di funzionare per motivi di sicurezza.',
        'Consiglio: stampa sempre qualche QR di scorta. Se un supporto si rovina, puoi sostituirlo in pochi secondi senza dover ristampare.',
      ],
    },
    {
      id: 'a-tav-3', title: 'Mappa tavoli: configurare la disposizione della sala',
      category: 'tavoli', readTime: '4 min',
      excerpt: 'Riprodurre la piantina della tua sala per visualizzare lo stato dei tavoli a colpo d\'occhio.',
      content: [
        'La funzione "Mappa tavoli" ti permette di posizionare i tavoli su una griglia che riproduce la disposizione della tua sala. Trascina i tavoli nella posizione corretta e aggiungi pareti per separare le zone.',
        'La mappa mostra in tempo reale lo stato di ogni tavolo: libero (verde), occupato con ordine in corso (giallo), in attesa di pagamento (arancione), da sparecchiare (rosso). È uno strumento prezioso per il caposala.',
        'Puoi creare più mappe se il tuo locale ha più sale (es. Sala interna, Dehors, Sala privata). Passa da una all\'altra con il selettore in alto.',
        'La mappa è particolarmente utile nei ristoranti di medie/grandi dimensioni (oltre 15 tavoli). Per locali piccoli, la vista a elenco potrebbe essere più rapida.',
      ],
    },
    {
      id: 'a-tav-4', title: 'Gestire tavoli condivisi e tavolate grandi',
      category: 'tavoli', readTime: '3 min',
      excerpt: 'Più clienti che ordinano separatamente dallo stesso tavolo: come non fare confusione.',
      content: [
        'Per i tavoli condivisi (es. 8 amici che vogliono pagare ognuno il proprio) puoi attivare la modalità "Conto diviso" dalle impostazioni del tavolo. Ogni cliente, scannerizzando il QR, vede la propria scheda personale.',
        'In modalità conto diviso, ogni cliente ordina separatamente e paga solo il proprio. Il cameriere vede il totale cumulativo del tavolo e i totali individuali, per verificare che tutto torni.',
        'Per tavolate molto grandi (oltre 10 persone), la modalità conto diviso può rallentare il servizio. In quei casi ti consigliamo di dividere il gruppo su due tavoli fisici vicini, anche se la sala li vede come uno.',
        'Se un cliente vuole pagare per altri (es. "offro io"), può selezionare i piatti degli amici nel proprio carrello prima di pagare. Il sistema aggiorna automaticamente i conti individuali.',
      ],
    },
    {
      id: 'a-tav-5', title: 'Sicurezza: perché i QR non sono copiabili o riutilizzabili',
      category: 'tavoli', readTime: '4 min', helpful: true,
      excerpt: 'Il sistema di sessioni temporanee crittografate che protegge il tuo ristorante dagli ordini falsi.',
      content: [
        'm2m non usa semplici URL per i tavoli. Ogni QR contiene un token statico (es. TAV1-X9Z2) che non è un link diretto al menù, ma una richiesta di accesso al server sicuro.',
        'Quando il cliente scannerizza il QR, il server genera un link temporaneo univoco (UUID) valido solo per 10 minuti. L\'utente viene reindirizzato a questo link sicuro. Nessuno può copiare l\'URL e riutilizzarlo.',
        'Quando l\'ordine viene inviato, il server ignora qualsiasi parametro nell\'URL. Recupera il numero del tavolo direttamente dal database usando l\'ID della sessione. Anche se qualcuno modifica l\'URL in "&table=99", l\'ordine arriva comunque al tavolo giusto registrato nel DB.',
        'Questo sistema protegge il tuo ristorante da scherzi, ordini falsi e tentativi di frode. È lo stesso livello di sicurezza usato dalle piattaforme di home banking.',
      ],
    },
    {
      id: 'a-tav-6', title: 'Abilitare/disabilitare un tavolo per la sera',
      category: 'tavoli', readTime: '2 min',
      excerpt: 'Un tavolo è prenotato o chiuso per manutenzione? Come escluderlo temporaneamente.',
      content: [
        'Per disabilitare un tavolo senza cancellarlo, apri il tavolo e tocca "Disattiva". Il QR smette di funzionare e il tavolo sparisce dalla mappa della sala come "attivo". È utile per tavoli prenotati, in manutenzione o non utilizzati in certe sere.',
        'Un tavolo disattivato non accetta ordini. Se un cliente prova a scannerizzare il QR, vede un messaggio "Tavolo non disponibile, rivolgersi al personale".',
        'Puoi programmare la disattivazione: ad esempio, disattivare il tavolo 12 ogni lunedì per una settimana se sai che è prenotato per un evento fisso. La funzione si trova in "Disponibilità programmata".',
        'Per riattivare il tavolo, basta toccare "Attiva". Il QR torna immediatamente funzionante.',
      ],
    },

    /* ── Pagamenti ── */
    {
      id: 'a-pag-1', title: 'Configurare i metodi di pagamento accettati',
      category: 'pagamenti', readTime: '3 min', helpful: true,
      excerpt: 'Contanti, carta di credito, Satispay, Apple Pay: come attivare ogni metodo.',
      content: [
        'Dalle Impostazioni → Pagamenti puoi attivare i metodi che vuoi accettare: contanti (sempre attivo di default), carta di credito (richiede un account Stripe o un POS compatibile), Satispay, Apple Pay, Google Pay.',
        'Per la carta di credito e i pagamenti digitali devi collegare il tuo account Stripe. Se non ne hai uno, il sistema ti guida nella procedura di registrazione (è gratuita, Stripe trattiene una percentuale del 1.5-2.5% per transazione).',
        'Per Satispay devi avere un account business attivo. La connessione avviene tramite API key che trovi nel tuo pannello Satispay. Il sistema verifica automaticamente la connessione.',
        'Puoi scegliere per ogni tavolo quali metodi accettare: ad esempio, accettare solo contanti al banco bar ma tutti i metodi ai tavoli seduti.',
      ],
    },
    {
      id: 'a-pag-2', title: 'Come funziona il pagamento diretto dal telefono',
      category: 'pagamenti', readTime: '3 min',
      excerpt: 'Il cliente paga con Apple Pay o carta senza aspettare il cameriere: tutti i passaggi.',
      content: [
        'Quando il cliente è pronto a pagare, tocca "Paga conto" nel menù digitale. Vede il totale e può scegliere il metodo di pagamento tra quelli che hai attivato.',
        'Se sceglie Apple Pay o Google Pay, il sistema apre direttamente l\'interfaccia di pagamento del telefono. Il cliente conferma con Face ID/Touch ID e il pagamento viene processato in pochi secondi.',
        'Se sceglie carta di credito, inserisce i dati su un form sicuro (gestito da Stripe, in piena conformità PCI-DSS). I dati della carta non transitano mai sui server di m2m, sono gestiti direttamente da Stripe.',
        'Una volta pagato, il cameriere riceve una notifica "Pagamento ricevuto - Tavolo X - €YY". La ricevuta viene generata automaticamente e inviata via email al cliente se lo desidera.',
      ],
    },
    {
      id: 'a-pag-3', title: 'Stampare ricevute e scontrini fiscali',
      category: 'pagamenti', readTime: '3 min',
      excerpt: 'Integrazione con stampanti termiche e registratori di cassa per la conformità fiscale italiana.',
      content: [
        'm2m si integra con i principali registratori di cassa telematici italiani (Epson, Custom, Olivetti, Exaltis). Dalle Impostazioni → Stampanti puoi collegare la tua stampante via WiFi o USB.',
        'Ad ogni pagamento confermato, il sistema invia automaticamente lo scontrino alla stampante collegata. Lo scontrino include tutti gli elementi richiesti dalla normativa italiana: numero progressivo, data, ora, descrizione piatti, totale, IVA scorporata.',
        'Per i pagamenti in contanti, il cameriere deve confermare l\'incasso manualmente per stampare lo scontrino. Questo passaggio garantisce che lo scontrino venga emesso solo quando il denaro è effettivamente arrivato.',
        'Puoi anche stampare ricevute non fiscali (per coperti, per la cucina, per il cliente) se la tua stampante lo supporta.',
      ],
    },
    {
      id: 'a-pag-4', title: 'Riconciliazione: verificare gli incassi della serata',
      category: 'pagamenti', readTime: '4 min',
      excerpt: 'Come confrontare gli incassi digitali con i contanti e preparare la chiusura giornaliera.',
      content: [
        'Alla fine della serata, vai su "Analytics" → "Chiusura giornaliera". Il sistema mostra il totale incassato diviso per metodo di pagamento: contanti, carta, Satispay, Apple Pay, ecc.',
        'Confronta il totale contanti mostrato con quello effettivamente presente in cassa. Eventuali differenze vanno investigate: possono essere dovute a scontrini annullati, mance non registrate, o errori del cameriere.',
        'I pagamenti digitali (carta, Satispay, Apple Pay) vengono accreditati sul tuo conto bancario entro 2-3 giorni lavorativi. Le commissioni di Stripe e Satispay sono visibili nel dettaglio transazione.',
        'Puoi esportare la chiusura giornaliera in PDF o CSV per il tuo commercialista. Il formato è compatibile con i principali software di contabilità italiani.',
      ],
    },
    {
      id: 'a-pag-5', title: 'Gestire i rimborsi e gli storni',
      category: 'pagamenti', readTime: '3 min',
      excerpt: 'Il cliente vuole indietro i soldi per un disservizio? Come fare un rimborso corretto.',
      content: [
        'Per rimborsare un pagamento digitale (carta, Satispay, Apple Pay), apri l\'ordine nello storico e tocca "Rimborsa". Il sistema restituisce l\'importo sulla carta o sul conto originale del cliente entro 5-10 giorni lavorativi.',
        'I rimborsi totali annullano la transazione. I rimborsi parziali (ad esempio sconto per disservizio) riducono l\'importo addebitato. In entrambi i casi, le commissioni di transazione non vengono rimborsate.',
        'Per i pagamenti in contanti, il rimborso è manuale: il cameriere restituisce il denaro e segna l\'ordine come "rimborsato" nel sistema per le statistiche. Non viene generato uno scontrino di storno, ma una ricevuta manuale.',
        'Tutti i rimborsi vengono registrati nelle statistiche. Un alto numero di rimborsi in una certa categoria di piatti può indicare un problema di qualità o di descrizione fuorviante nel menù.',
      ],
    },
    {
      id: 'a-pag-6', title: 'Mance e coperto: come gestirli',
      category: 'pagamenti', readTime: '2 min',
      excerpt: 'Aggiungere il coperto al conto e far lasciare la mancia al cliente con un tap.',
      content: [
        'Il coperto può essere configurato nelle Impostazioni → Menù. Inserisci l\'importo (es. 2€ a persona) e il sistema lo aggiunge automaticamente al conto in base al numero di coperti del tavolo.',
        'Per la mancia, puoi attivare la funzione "Suggerisci mancia" nelle Impostazioni → Pagamenti. Il cliente, prima di pagare, vede tre suggerimenti (5%, 10%, 15%) e un\'opzione "Nessuna mancia". È discretamente proposto, non imposto.',
        'Le mance digitali vengono accreditate insieme all\'importo dell\'ordine. Puoi scegliere se tenerle separate nelle statistiche (per distribuirle al personale) o unirle all\'incasso.',
        'Alcuni ristoranti usano le mance digitali per finanziare la "cassetta della solidarietà" (pasti per persone in difficoltà). Puoi dedicare una percentuale delle mance a questa causa e comunicarlo ai clienti.',
      ],
    },

    /* ── Staff & Ruoli ── */
    {
      id: 'a-sta-1', title: 'Invitare un nuovo membro dello staff',
      category: 'staff', readTime: '3 min', helpful: true,
      excerpt: 'Aggiungere camerieri, cuochi o amministratori al tuo account ristorante.',
      content: [
        'Dalla dashboard vai su "Staff" → "Invita membro". Inserisci nome, email e scegli il ruolo: Admin (accesso completo a tutto), Cameriere (solo ordini e tavoli), Cuoco (solo Kitchen Display), Caposala (tavoli, ordini, statistiche).',
        'Il nuovo membro riceve un\'email con un link per completare la registrazione. Deve inserire una password e scaricare l\'app (o usare la versione web). Il primo accesso va fatto entro 7 giorni dall\'invito.',
        'Per ogni ruolo puoi personalizzare i permessi in modo granulare. Ad esempio, un cameriere può vedere i tavoli ma non le statistiche di vendita. Un caposala può modificare il menù ma non gestire i pagamenti.',
        'Il numero di membri staff dipende dal tuo piano: il piano base include fino a 5 membri, i piani superiori 10 o illimitati. Puoi vedere quanti membri hai attivi in "Staff" → "Riepilogo".',
      ],
    },
    {
      id: 'a-sta-2', title: 'Differenza tra i ruoli: Admin, Cameriere, Cuoco, Caposala',
      category: 'staff', readTime: '4 min',
      excerpt: 'Cosa può e non può fare ogni ruolo: la guida completa ai permessi.',
      content: [
        'Admin: accesso completo a tutto — menù, tavoli, ordini, pagamenti, statistiche, staff, impostazioni. Può invitare e rimuovere altri membri, cambiare il piano, gestire i pagamenti dell\'abbonamento. Di solito è il titolare del ristorante.',
        'Caposala: vede e gestisce tavoli e ordini, può modificare il menù (attivare/disattivare piatti, cambiare prezzi), vede le statistiche, ma non può gestire lo staff o le impostazioni dell\'account. Ideale per il responsabile di sala.',
        'Cameriere: vede i tavoli assegnati, riceve le chiamate dei clienti, può creare e modificare ordini, vedere lo stato della cucina. Non vede le statistiche né può modificare il menù. Non vede i pagamenti dettagliati, solo se un ordine è stato pagato.',
        'Cuoco: vede solo il Kitchen Display con gli ordini in arrivo. Può cambiare lo stato degli ordini (in preparazione, pronto) ma non può creare ordini né vedere i tavoli. Non vede prezzi né dettagli dei clienti.',
      ],
    },
    {
      id: 'a-sta-3', title: 'Assegnare tavoli specifici a un cameriere',
      category: 'staff', readTime: '2 min',
      excerpt: 'Come creare zone di sala e assegnare ogni cameriere a determinati tavoli.',
      content: [
        'Dalla sezione "Staff" → "Zones", puoi creare zone della sala (es. Zona 1: tavoli 1-8, Zona 2: tavoli 9-16, Dehors: tavoli 17-20) e assegnare ogni zona a un cameriere specifico.',
        'Il cameriere riceve le chiamate solo dai tavoli della propria zona. Sul Kitchen Display, gli ordini mostrano anche il cameriere assegnato, in modo che la cucina sappia a chi consegnare i piatti.',
        'Le assegnazioni possono essere fisse (lo stesso cameriere ha sempre la stessa zona) o variabili (cambiano ogni sera in base al turno). Per le assegnazioni variabili, usa il planning settimanale.',
        'Se un cameriere si ammala o non si presenta, puoi riassegnare temporaneamente la sua zona a un altro cameriere con un singolo tocco, senza dover riconfigurare tutto.',
      ],
    },
    {
      id: 'a-sta-4', title: 'Revocare l\'accesso di un ex dipendente',
      category: 'staff', readTime: '2 min', helpful: true,
      excerpt: 'Uno chef se n\'è andato? Come togliergli immediatamente l\'accesso al sistema.',
      content: [
        'Apri la scheda del membro staff in "Staff" e tocca "Rimuovi accesso". Il sistema disattiva immediatamente l\'account: l\'ex dipendente non può più accedere con le sue credenziali, né dall\'app né dal web.',
        'Se in futuro riassumi la stessa persona, puoi riattivare l\'account senza doverlo reinserire da zero. Lo storico dei suoi ordini viene conservato per le statistiche.',
        'Per maggiore sicurezza, ti consigliamo di cambiare le password admin dopo la partenza di un dipendente che aveva accesso a dati sensibili (pagamenti, statistiche, liste clienti). Lo si fa da "Impostazioni" → "Sicurezza".',
        'Tutte le azioni compiute da un membro dello staff rimangono tracciate nel log audit (chi ha annullato un ordine, chi ha modificato un prezzo, ecc.). Questo rende ogni operazione tracciabile.',
      ],
    },
    {
      id: 'a-sta-5', title: 'Attivare l\'autenticazione a due fattori (2FA)',
      category: 'staff', readTime: '3 min',
      excerpt: 'Proteggere gli account admin con un secondo fattore di sicurezza.',
      content: [
        'L\'autenticazione a due fattori aggiunge un livello di sicurezza: oltre alla password, chi accede deve inserire un codice generato dall\'app Google Authenticator o inviato via SMS. Anche se qualcuno ruba la password, non può entrare.',
        'Per attivarla, vai sul tuo profilo → "Sicurezza" → "Attiva 2FA". Scansiona il QR code con Google Authenticator (o Authy, 1Password) e inserisci il codice generato per confermare. Salva i codici di backup in un posto sicuro.',
        'Ti consigliamo di rendere obbligatoria la 2FA per tutti gli account admin. La funzione si attiva in "Impostazioni" → "Sicurezza" → "Richiedi 2FA per admin".',
        'Se perdi il telefono e non hai i codici di backup, contatta il supporto per sbloccare l\'account. Ti verrà chiesto di verificare la tua identità con documenti.',
      ],
    },

    /* ── Branding ── */
    {
      id: 'a-bra-1', title: 'Caricare il logo e personalizzare i colori',
      category: 'branding', readTime: '3 min', helpful: true,
      excerpt: 'Rendere il menù digitale coerente con l\'identità del tuo ristorante.',
      content: [
        'Dalle Impostazioni → Branding puoi caricare il tuo logo (formato PNG o SVG, sfondo trasparente consigliato). Il logo appare in alto nel menù digitale e in tutte le comunicazioni al cliente (notifiche, ricevute email).',
        'Scegli i colori principali del tuo brand: un colore primario (per pulsanti e accenti) e uno secondario (per sfondi e dettagli). Puoi inserire i codici hex o usare il selettore colori. Il sistema genera automaticamente le varianti chiare/scurite.',
        'La preview in tempo reale ti mostra come apparirà il menù con le tue personalizzazioni. Puoi cambiare branding in qualsiasi momento: il menù si aggiorna immediatamente per i clienti che lo stanno consultando.',
        'Consiglio: usa gli stessi colori del tuo sito web e dell\'insegna, per un\'esperienza coerente. Se non hai un brand definito, parti dalla palette "m2m caldo" (ambra/terracotta) e personalizza da lì.',
      ],
    },
    {
      id: 'a-bra-2', title: 'Scegliere il font del menù',
      category: 'branding', readTime: '2 min',
      excerpt: 'Tra i font disponibili, quale scegliere per trasmettere l\'atmosfera del locale.',
      content: [
        'm2m offre una selezione di font curati per il menù digitale: Serif eleganti (Playfair Display, Cormorant) per ristoranti di fascia alta, Sans-serif moderni (Inter, DM Sans) per locali informali, Display caratteristici (Bebas Neue, Pacifico) per cocktail bar.',
        'Puoi scegliere un font per i titoli (più grande, decorativo) e uno per il corpo del testo (più leggibile). La combinazione è importante: evita di usare lo stesso font per tutto, o di mischiare troppi font (massimo 2).',
        'Il font viene caricato da Google Fonts, quindi è ottimizzato per il web. Tutti i font scelti supportano l\'italiano, l\'inglese e le principali lingue europee.',
        'Consiglio: prova il menù sul tuo telefono dopo aver cambiato font. Quello che sul computer sembra elegante, sul mobile a volte è poco leggibile, soprattutto i prezzi.',
      ],
    },
    {
      id: 'a-bra-3', title: 'Aggiungere una foto di copertina del ristorante',
      category: 'branding', readTime: '2 min',
      excerpt: 'La prima immagine che il cliente vede aprendo il menù: come sceglierla e caricarla.',
      content: [
        'La foto di copertina appare in alto nel menù digitale, sopra il logo. È la prima cosa che il cliente vede dopo aver scannerizzato il QR, quindi è importante che sia di qualità e rappresenti bene il locale.',
        'Carica un\'immagine orizzontale (rapporto 16:9 o 3:2) di almeno 1600 pixel di larghezza. Foto di interni del ristorante, piatti signature, o dettagli del cibo sono tutte buone scelte. Evita foto generiche trovate su internet.',
        'Puoi anche caricare più copertine e impostarle per girare casualmente ad ogni apertura del menù. Utile se hai più sale o più piatti signature.',
        'Se la foto è troppo scura o troppo chiara, il sistema applica automaticamente un overlay per migliorare la leggibilità del testo sovrastante. Puoi comunque regolare l\'intensità dell\'overlay nelle impostazioni.',
      ],
    },
    {
      id: 'a-bra-4', title: 'Personalizzare il messaggio di benvenuto',
      category: 'branding', readTime: '2 min',
      excerpt: 'Una frase di accoglienza che il cliente vede appena apre il menù.',
      content: [
        'Nelle Impostazioni → Branding → Messaggio di benvenuto, puoi inserire una frase che appare sotto il logo nella home del menù. Esempi: "Benvenuti alla Trattoria da Mario", "Stasera vi consiglia lo chef Luca".',
        'Il messaggio può essere personalizzato in ogni lingua attivata. Per i clienti stranieri, una buona traduzione fa la differenza: non affidarti solo alla traduzione automatica per il messaggio di benvenuto.',
        'Puoi anche programmare messaggi diversi per giorni o orari: ad esempio "Buon pranzo!" a mezzogiorno e "Buona serata!" dopo le 19. La funzione si trova in "Messaggi programmati".',
        'Il messaggio di benvenuto contribuisce a creare un\'atmosfera personale e curata, anche se il cliente ordina in autonomia dal telefono senza parlare con il personale.',
      ],
    },
    {
      id: 'a-bra-5', title: 'Creare un menù per eventi speciali',
      category: 'branding', readTime: '3 min',
      excerpt: 'Menù di San Valentino, menu di Natale, degustazione: come gestire occasioni speciali.',
      content: [
        'Dalla dashboard puoi creare "Menù eventi" separati dal menù principale. Ad esempio, per San Valentino puoi creare un menù degustazione a prezzo fisso, disponibile solo il 14 febbraio.',
        'Per ogni evento imposti le date di disponibilità, il prezzo (se fisso), i piatti inclusi e il QR dedicato (puoi stampare QR diversi per il menù eventi, o usare lo stesso QR del tavolo e far scegliere al cliente).',
        'Il menù eventi può avere un branding diverso dal menù principale: colori, font e foto di copertina dedicate. Questo aiuta a creare l\'atmosfera dell\'occasione speciale.',
        'Dopo l\'evento, il menù viene automaticamente disattivato ma rimane salvato. Puoi riutilizzarlo l\'anno successivo o per occasioni simili, modificando solo le date.',
      ],
    },

    /* ── Analytics ── */
    {
      id: 'a-ana-1', title: 'Leggere la dashboard delle vendite giornaliere',
      category: 'analytics', readTime: '4 min', helpful: true,
      excerpt: 'Incasso, numero ordini, scontrino medio, piatto top: come interpretare i numeri della giornata.',
      content: [
        'La dashboard principale mostra in tempo reale i numeri della giornata: incasso totale, numero di ordini, scontrino medio (incasso diviso ordini), numero di coperti, piatto più venduto.',
        'Confronta questi numeri con la stessa giornata della settimana precedente (es. questo sabato vs sabato scorso). Il sistema evidenzia automaticamente le variazioni positive (verde) o negative (rosso).',
        'Lo scontrino medio è il KPI più importante: se scende, può significare che i prezzi sono troppo bassi, che i camerieri non propongono abbastanza i secondi o i dolci, o che il menù è poco chiaro.',
        'Il grafico orario mostra quando arrivano più ordini. Identifica i "buchi" (fasce orarie con pochi ordini) per pianificare promozioni mirate (es. happy hour dalle 18 alle 19).',
      ],
    },
    {
      id: 'a-ana-2', title: 'Capire quali piatti vendono di più',
      category: 'analytics', readTime: '3 min', helpful: true,
      excerpt: 'Classifica piatti per vendite, incasso e margine: cosa tenere e cosa togliere dal menù.',
      content: [
        'Nella sezione "Analytics" → "Piatti" trovi la classifica dei tuoi piatti per numero di ordinazioni, per incasso generato e per margine (incasso meno costo ingredienti, se hai inserito i costi).',
        'La matrice "vendite vs margine" è preziosa: piatti con alte vendite e alto margine sono i tuoi cavalli da battaglia (da promuovere). Piatti con basse vendite e basso margine sono candidati alla rimozione.',
        'I piatti con molte visualizzazioni nel menù ma poche ordinazioni possono avere un problema di prezzo, di foto o di descrizione. Prova a cambiare uno di questi elementi e misura l\'impatto nelle settimane successive.',
        'Stagionalità: alcuni piatti vendono bene in certi periodi (es. zuppe d\'inverno, insalate d\'estate). Il sistema mostra l\'andamento storico per aiutarti a programmare il menù stagionale.',
      ],
    },
    {
      id: 'a-ana-3', title: 'Identificare gli orari di punta e gestire i carichi',
      category: 'analytics', readTime: '3 min',
      excerpt: 'Quando arriva il rush? Come usare i dati per organizzare la cucina e il personale.',
      content: [
        'Il grafico "Ordini per ora" mostra esattamente quando arrivano più ordini durante la giornata. Per i ristoranti, tipicamente ci sono due picchi: 12:30-13:30 a pranzo e 20:00-21:30 a cena.',
        'Conoscere i picchi ti permette di: (1) programmare il personale in modo da avere più camerieri e cuochi nei momenti di punta, (2) preparare in anticipo i piatti più richiesti, (3) attivare promozioni nelle fasce morte.',
        'Puoi confrontare gli orari di punta di giorni diversi: ad esempio, il venerdì sera potrebbe avere il picco alle 21, il sabato alle 20. Questo ti aiuta a personalizzare i turni del personale.',
        'L\'allerta "sovraccarico cucina" ti avvisa quando il Kitchen Display ha più di X ordini in attesa. Puoi impostare la soglia in base alla capacità della tua cucina.',
      ],
    },
    {
      id: 'a-ana-4', title: 'Esportare report per il commercialista',
      category: 'analytics', readTime: '3 min',
      excerpt: 'Corrispettivi giornalieri, IVA, ripartizione per categoria: report pronti per la contabilità.',
      content: [
        'Dalla sezione "Analytics" → "Report" puoi generare report mensili o personalizzati con tutti i dati necessari per il commercialista: corrispettivi giornalieri, totale IVA, ripartizione per aliquota (4%, 10%, 22%).',
        'Il report è disponibile in formato PDF (leggibile) e CSV (importabile nei software di contabilità come Menu24, Distinta, Danea Easyfatt). Scegli il formato in base a cosa usa il tuo commercialista.',
        'Puoi anche generare un report separato per ogni metodo di pagamento (contanti, carta, Satispay), utile per la riconciliazione bancaria. I pagamenti digitali sono tracciati con riferimento transazione univoco.',
        'Tutti i report vengono firmati elettronicamente e conservati per 10 anni, in conformità con le normative italiane sulla conservazione dei documenti fiscali.',
      ],
    },
    {
      id: 'a-ana-5', title: 'Previsione della domanda con l\'AI',
      category: 'analytics', readTime: '4 min',
      excerpt: 'Il sistema prevede quanti ordini arriveranno domani: come usarlo per gli acquisti.',
      content: [
        'm2m usa l\'intelligenza artificiale per prevedere la domanda dei prossimi giorni, basandosi su: storico degli ordini, giorno della settimana, stagionalità, eventi locali (se collegati al calendario), meteo.',
        'La previsione mostra per ogni piatto quante porzioni è probabile venderai domani, dopodomani e nei prossimi 7 giorni. Ti aiuta a programmare gli acquisti di ingredienti in modo da non finire le scorte né sprecare.',
        'L\'affidabilità della previsione cresce con il tempo: dopo 3-4 settimane di utilizzo, il sistema ha abbastanza dati per dare stime accurate (margine di errore del 10-15%).',
        'Puoi attivare allerta automatiche: ad esempio, "previsto esaurimento tartufo nero entro 2 giorni" in modo da poter ordinare il rifornimento in anticipo.',
      ],
    },
    {
      id: 'a-ana-6', title: 'Analizzare le recensioni dei clienti',
      category: 'analytics', readTime: '3 min',
      excerpt: 'Recensioni lasciate dai clienti dopo il pasto: come leggerle e rispondere.',
      content: [
        'Dopo aver pagato, il cliente può lasciare una recensione (voto da 1 a 5 stelle e commento facoltativo). Le recensioni vengono raccolte nella sezione "Analytics" → "Recensioni".',
        'Puoi filtrare le recensioni per voto, per data, per piatto ordinato. Le recensioni negative (1-2 stelle) vengono evidenziate per permetterti di intervenire rapidamente.',
        'Ti consigliamo di rispondere a tutte le recensioni, specialmente a quelle negative. Una risposta cortese e professionale può trasformare un cliente scontento in un cliente fedele. Usa la funzione "Rispondi" sotto ogni recensione.',
        'Le recensioni positive possono essere pubblicate (con il permesso del cliente) sul tuo sito web o sui social. Il sistema genera automaticamente un\'immagine con la recensione pronta per essere condivisa.',
      ],
    },

    /* ── Impostazioni ── */
    {
      id: 'a-imp-1', title: 'Setup iniziale: configurare il ristorante in 5 minuti',
      category: 'impostazioni', readTime: '5 min', helpful: true,
      excerpt: 'La checklist completa per partire: dal nome del locale al primo ordine ricevuto.',
      content: [
        '1. Inserisci i dati del ristorante: nome, indirizzo, partita IVA, telefono, email. Questi dati appaiono sulle ricevute e nei documenti fiscali.',
        '2. Carica logo e imposta i colori del brand (vedi articolo "Caricare il logo" in Branding).',
        '3. Crea le categorie del menù (Antipasti, Primi, ecc.) e aggiungi almeno i piatti principali (vedi "Creare la prima categoria").',
        '4. Crea i tavoli e scarica i QR code da stampare (vedi "Come generare i QR code").',
        '5. Configura i metodi di pagamento accettati (vedi "Configurare i metodi di pagamento").',
        '6. Invita il personale e assegna i ruoli (vedi "Invitare un nuovo membro dello staff").',
        '7. Fai un test: scannerizza un QR con il tuo telefono, effettua un ordine di prova e verifica che arrivi in cucina. Pagalo per testare il flusso completo.',
        '8. Forma il personale: 15 minuti di training sono sufficienti per camerieri e cucina. Lascia che facciano qualche ordine di prova prima di aprire al pubblico.',
      ],
    },
    {
      id: 'a-imp-2', title: 'Cambiare lingua dell\'interfaccia admin',
      category: 'impostazioni', readTime: '2 min',
      excerpt: 'La dashboard in italiano, inglese o altre lingue per staff internazionale.',
      content: [
        'Il pannello admin è disponibile in italiano e inglese. Per cambiare lingua, vai sul tuo profilo (icona in alto a destra) → "Lingua interfaccia" e scegli.',
        'Ogni membro dello staff può scegliere la propria lingua indipendentemente. Ad esempio, un cuoco filippino può avere l\'interfaccia in inglese mentre il titolare in italiano.',
        'La lingua del menù digitale (quella che vedono i clienti) è separata e dipende dalla lingua del telefono del cliente, con fallback sull\'italiano. Non puoi forzare una lingua specifica al cliente.',
        'I documenti fiscali (scontrini, ricevute) vengono emessi sempre in italiano per conformità normativa, indipendentemente dalla lingua dell\'interfaccia admin.',
      ],
    },
    {
      id: 'a-imp-3', title: 'Configurare le notifiche push e email',
      category: 'impostazioni', readTime: '3 min',
      excerpt: 'Quali notifiche ricevere, su quale dispositivo e in quali orari.',
      content: [
        'Ogni membro dello staff può personalizzare le proprie notifiche. Vai sul tuo profilo → "Notifiche". Scegli quali eventi vuoi ricevere (nuovo ordine, ordine in ritardo, chiamata cameriere, recensione negativa, ecc.).',
        'Per ogni evento puoi scegliere il canale: notifica push (sul telefono), email, o entrambi. Le notifiche push sono immediate, le email possono avere un ritardo di qualche minuto.',
        'Le notifiche sonore possono essere personalizzate: un suono per i nuovi ordini, un altro per le chiamate del cliente, un terzo per gli ordini in ritardo. Ti aiuta a riconoscere l\'evento senza guardare lo schermo.',
        'Puoi impostare orari di silenzioso (es. dalle 23 alle 8 non ricevere notifiche push tranne che per emergenze). Utile per i titolari che non vogliono essere disturbati di notte.',
      ],
    },
    {
      id: 'a-imp-4', title: 'Gestire multi-sede: più ristoranti con un account',
      category: 'impostazioni', readTime: '4 min', helpful: true,
      excerpt: 'Hai due locali? Come gestirli dallo stesso account con dati separati.',
      content: [
        'Dalle Impostazioni → Sedi puoi aggiungere più ristoranti al tuo account. Ogni sede ha il proprio menù, i propri tavoli, il proprio brand e le proprie statistiche, ma le gestisci tutte dallo stesso login.',
        'Il selettore sede in alto ti permette di passare da un locale all\'altro con un clic. Lo staff può essere assegnato a una o più sedi: ad esempio, un cuoco che lavora in entrambi i locali vedrà i Kitchen Display di entrambi.',
        'Le statistiche possono essere visualizzate per singola sede o aggregate (utile per confrontare le performance dei locali). I report fiscali sono sempre separati per sede, per correttezza contabile.',
        'Il costo di ogni sede aggiuntiva dipende dal tuo piano. Il piano base include 1 sede, i piani superiori 3 o illimitate. Puoi aggiungere o rimuovere sedi in qualsiasi momento.',
      ],
    },
    {
      id: 'a-imp-5', title: 'Backup dei dati e privacy',
      category: 'impostazioni', readTime: '3 min',
      excerpt: 'I tuoi dati sono al sicuro? Come funzionano i backup e cosa dice la normativa GDPR.',
      content: [
        'm2m effettua backup giornalieri cifrati di tutti i tuoi dati (menù, ordini, statistiche, clienti). I backup vengono conservati per 30 giorni con retention, e sono ospitati su server in UE per conformità GDPR.',
        'In caso di problemi (errore tuo, problema tecnico, attacco informatico) puoi ripristinare un backup delle ultime 24 ore contattando il supporto. Per backup più vecchi, il ripristino richiede qualche ora.',
        'I dati dei clienti (nomi, email, telefono se inseriti) vengono trattati in conformità al GDPR. Puoi scaricare un export di tutti i dati di un cliente specifico, o cancellarli completamente, su sua richiesta.',
        'Puoi anche attivare la "modalità privacy massima" che non salva alcun dato personale del cliente (ordina anonimamente tramite QR). Utile se vuoi andare sul sicuro con la privacy, ma perdi la possibilità di mandare promozioni.',
      ],
    },
    {
      id: 'a-imp-6', title: 'Cambiare piano o disdire l\'abbonamento',
      category: 'impostazioni', readTime: '3 min',
      excerpt: 'Passare da free a paid, da mensile ad annuale, o disdire: tutte le opzioni.',
      content: [
        'Dalle Impostazioni → Abbonamento puoi vedere il tuo piano attuale, la data di rinnovo e il costo. Per cambiare piano, scegli quello nuovo e conferma: il sistema ricalcola il costo prorata e lo addebita al prossimo rinnovo.',
        'Passando da mensile ad annuale risparmi circa 2 mesi. Il passaggio da annuale a mensile è possibile solo alla scadenza del periodo annuale.',
        'Per disdire, vai su "Abbonamento" → "Disdici". La disdetta ha effetto alla scadenza del periodo pagato: fino ad allora mantieni tutte le funzionalità. Dopo la scadenza, il tuo account passa in modalità sola lettura per 90 giorni (puoi esportare i dati), poi viene disattivato.',
        'I piani paid possono essere provati gratis per 14 giorni senza carta di credito. Al termine della prova, l\'account torna automaticamente al piano free (se disponibile) o viene sospeso.',
      ],
    },
    {
      id: 'a-imp-7', title: 'Collegare account esterni (Google, Instagram)',
      category: 'impostazioni', readTime: '2 min',
      excerpt: 'Importa foto da Instagram, recensioni da Google: integrazioni utili per il marketing.',
      content: [
        'Dalle Impostazioni → Integrazioni puoi collegare il tuo account Instagram aziendale per importare automaticamente le foto dei piatti nel menù. Quando pubblichi su Instagram, le foto vengono sincronizzate entro un\'ora.',
        'Collegando il tuo Google Business Profile puoi importare le recensioni di Google direttamente nella dashboard, insieme a quelle lasciate dai clienti nel menù digitale. Hai così una vista unificata della reputazione.',
        'L\'integrazione con Facebook permette di pubblicare automaticamente i nuovi piatti o le promozioni sulla tua pagina Facebook. Risparmi tempo e mantieni i social aggiornati.',
        'Tutte le integrazioni usano OAuth: non condividi mai la tua password con m2m. Puoi revocare l\'accesso in qualsiasi momento dalle impostazioni dell\'account esterno.',
      ],
    },
  ],

  en: [
    /* ── Orders ── */
    {
      id: 'a-ord-1', title: 'How the order flow works from table to kitchen',
      category: 'ordini', readTime: '4 min', helpful: true,
      excerpt: 'From the moment the customer scans the QR to when the dish is served: all the steps of an order.',
      content: [
        'When a customer scans the QR code on the table, the system automatically creates a temporary session associated with that table. The customer sees the digital menu customized with your brand and can add dishes to the cart.',
        'Once the order is confirmed, it appears in real time on the Kitchen Display, with the table number, exact time, ordered dishes, selected variants and any special notes from the customer.',
        'The kitchen can change the order status (In preparation, Ready, Served) with a single tap. Each status change automatically updates the waiter\'s view and, if configured, sends a push notification to the customer.',
        'All orders are recorded in the history and contribute to sales statistics. You can review any order at any time from the "Order history" section.',
      ],
    },
    {
      id: 'a-ord-2', title: 'Modify or cancel an order after sending it to the kitchen',
      category: 'ordini', readTime: '2 min',
      excerpt: 'Customer changed their mind or ordered by mistake? Here\'s how to handle changes and cancellations.',
      content: [
        'If the order was just sent and the kitchen hasn\'t started preparing yet, the waiter can cancel it from the orders panel. Just open the order, tap "Cancel order" and confirm. The customer receives a cancellation notification.',
        'For minor changes (add a dish, change a variant) it\'s simpler to add a new separate order to the same table rather than editing the existing one. The system will automatically group orders from the same table.',
        'If the kitchen has already started preparing a dish, it can no longer be removed from the order. In that case you can mark the dish as "removed" for statistics, but it will still be prepared.',
        'Cancellations are tracked in statistics. A high number of cancellations may indicate communication issues between front of house and kitchen, or an unclear menu for customers.',
      ],
    },
    {
      id: 'a-ord-3', title: 'Order statuses: what they mean and how to change them',
      category: 'ordini', readTime: '3 min',
      excerpt: 'Pending, In preparation, Ready, Served, Paid: the complete guide to order statuses.',
      content: [
        'Each order goes through five main statuses: "Pending" (just received, not yet picked up by the kitchen), "In preparation" (the kitchen is cooking), "Ready" (the dish is ready to be served), "Served" (the waiter has delivered the dish to the table) and "Paid" (the order has been settled).',
        'The kitchen changes statuses from the Kitchen Display. The waiter sees updates in real time on their device. When a dish switches to "Ready", the waiter receives a push notification.',
        'You can customize status names and add new ones (for example "Waiting for ingredients") from Settings → Order flow. Some restaurants add a "To plate" status between preparation and ready.',
        'Late orders (pending for too long) are highlighted in red on the Kitchen Display so the kitchen can prioritize them.',
      ],
    },
    {
      id: 'a-ord-4', title: 'Handle multiple orders from the same table',
      category: 'ordini', readTime: '2 min',
      excerpt: 'Customer wants to order more mid-meal? Here\'s how to add orders to an already active table.',
      content: [
        'The same table can place multiple orders during the meal. The customer scans the QR again (or reloads the page) and sees their previous cart with the "Add new order" option.',
        'All orders from the same table are automatically grouped in the final bill. The waiter can see the cumulative total at any time from the tables panel.',
        'To avoid kitchen confusion, each additional order is numbered (Order 1, Order 2, etc.) and shown as a separate card on the Kitchen Display, with the exact timestamp.',
        'At checkout you can choose whether to charge the customer for a single order, a selection of orders, or the entire table bill.',
      ],
    },
    {
      id: 'a-ord-5', title: 'How to send a notification to the waiter from the table',
      category: 'ordini', readTime: '2 min', helpful: true,
      excerpt: 'The customer can call the waiter, ask for the bill or report a problem without getting up.',
      content: [
        'From the digital menu, the customer always has three call buttons at the top: "Call waiter", "Ask for bill" and "Report problem". One tap and the waiter receives an immediate push notification with the table number.',
        'On the waiter\'s device, the notification shows the request type, time and table. Requests are queued in order of arrival. The waiter can tap "Acknowledged" to confirm they\'ve seen the request.',
        'You can customize the call buttons (add "More bread", "Water", etc.) from Settings → Table calls. Some restaurants disable them during peak times to reduce workload.',
        'All requests are recorded in the history. If a table repeatedly calls the waiter, the system highlights it to flag a possible service issue.',
      ],
    },
    {
      id: 'a-ord-6', title: 'View and filter the order history',
      category: 'ordini', readTime: '3 min',
      excerpt: 'How to search a past order by table, date, dish or waiter.',
      content: [
        'The "Order history" section records every order placed in your restaurant. You can filter by date, by table, by waiter who served, or search by dish name.',
        'Each order in the history shows all details: time, table, dishes, variants, price, payment method, waiter, preparation time and any customer notes.',
        'The history is useful to resolve disputes with customers ("we didn\'t order this dish"), to check service speed on a given evening and to identify dishes with many cancellations.',
        'You can export the history to CSV or PDF from the share icon. Data is kept for 24 months, after which it is anonymized to comply with GDPR regulations.',
      ],
    },

    /* ── Menu ── */
    {
      id: 'a-menu-1', title: 'Create the first menu category',
      category: 'menu', readTime: '3 min', helpful: true,
      excerpt: 'Starters, first courses, mains, desserts: how to structure the menu to start off on the right foot.',
      content: [
        'From the dashboard go to "Menu" → "Add category". Enter the name (e.g. "Starters"), an optional short description and a cover image. The image helps customers navigate and is recommended for main categories.',
        'The order of categories determines the order in which they appear in the digital menu. You can reorder them at any time by dragging. Empty categories are not shown to customers.',
        'For each category you can set an availability time (for example "Brunch" available only from 10 to 14). Dishes in unavailable categories are automatically hidden from the menu.',
        'Tip: create categories first, then add dishes. Initially limit yourself to 4-6 categories so you don\'t disperse the customer\'s attention. You can always add more later.',
      ],
    },
    {
      id: 'a-menu-2', title: 'Add a dish with photo, price and description',
      category: 'menu', readTime: '4 min',
      excerpt: 'Everything you need to create a dish the customer can\'t resist ordering.',
      content: [
        'Inside a category tap "+" to add a dish. Enter name, description (max 200 characters, be concise but evocative), price and photo. The photo is the single biggest factor influencing customer choice.',
        'For photos use well-lit images, with the dish clearly visible on a clean background. The system automatically optimizes images for mobile, but always upload files of at least 800x800 pixels for a sharp result.',
        'The price can be entered with decimals (e.g. 14.50). If the price is 0 or empty, the dish is shown as "on request" and cannot be ordered directly: the customer will have to call the waiter.',
        'The description is the moment to sell the dish. List the main ingredients, cooking method and a detail that makes it unique ("prized black truffle from Norcia", "fresh pasta made by hand every morning").',
      ],
    },
    {
      id: 'a-menu-3', title: 'Manage dish variants and customizations',
      category: 'menu', readTime: '5 min', helpful: true,
      excerpt: 'Steak doneness, cooking, add-ons, sauces: how to let the customer personalize the dish.',
      content: [
        'In the dish editor you\'ll find the "Variants" section. Here you can create option groups: for example "Doneness" (rare, medium, well done), "Add-ons" (+ truffle +€3, + burrata +€2), "Sauce" (classic, spicy, none).',
        'For each group choose whether it\'s single-choice (radio button, the customer selects one) or multiple (checkbox, can select more than one). You can make a group mandatory: the customer can\'t order without choosing it.',
        'Paid add-ons are automatically added to the dish price. The customer sees the updated total in real time in the cart.',
        'Tip: don\'t overdo variants. More than 3-4 groups per dish makes ordering slow and frustrating. For complex dishes, consider creating two separate entries on the menu instead.',
      ],
    },
    {
      id: 'a-menu-4', title: 'Flag allergens on each dish',
      category: 'menu', readTime: '3 min', helpful: true,
      excerpt: 'Gluten, lactose, eggs, tree nuts: how to display allergens in a compliant way.',
      content: [
        'In the dish editor you\'ll find the "Allergens" section. Select from the official European list (gluten, crustaceans, eggs, fish, peanuts, soy, lactose, tree nuts, celery, mustard, sesame seeds, sulfites, lupins, molluscs).',
        'Selected allergens automatically appear in the customer\'s digital menu as colored icons next to the dish. Tapping the icon shows the allergen name.',
        'Allergen disclosure is mandatory by law (EU Regulation 1169/2011). If a dish contains an undeclared allergen and a customer has a reaction, the restaurant is liable.',
        'For "free-from" dishes (gluten-free, lactose-free) you can also add a positive badge highlighting the feature. Many customers actively search for restaurants with allergen-free options.',
      ],
    },
    {
      id: 'a-menu-5', title: 'Translate the menu into multiple languages',
      category: 'menu', readTime: '3 min',
      excerpt: 'How to show the menu in Italian, English, German, French and other languages to foreign customers.',
      content: [
        'm2m supports automatic menu translation into over 20 languages. From Settings → Languages, enable the languages you want to offer. When opening the menu, the customer will see the language selector at the top.',
        'Automatic translation uses AI and is of good quality, but for dishes with typical names (e.g. "Cacio e pepe", "Saltimbocca alla romana") we recommend entering the translation manually for each language, so as not to lose the dish\'s meaning.',
        'To enter a manual translation, edit the dish and use the language selector at the top to switch between languages. The system remembers which language you were editing.',
        'Variants and allergens are translated automatically. Photos and prices stay the same across all languages.',
      ],
    },
    {
      id: 'a-menu-6', title: 'Temporarily deactivate a dish (sold out)',
      category: 'menu', readTime: '2 min',
      excerpt: 'An ingredient ran out? How to hide a dish from the menu without deleting it.',
      content: [
        'When a dish is no longer available (ingredient sold out, end of day, supplier issue), you can deactivate it from the dashboard with a single tap. The dish immediately disappears from the customer-facing digital menu.',
        'The dish is not deleted: it stays in your database with all its information (photo, price, description, allergens, variants). When it\'s available again, just reactivate it and it will reappear on the menu.',
        'You can also schedule deactivation: for example, automatically deactivate raw fish after 10 PM for HACCP compliance. The feature is in "Scheduled availability" inside the dish editor.',
        'If a customer already had the dish in their cart when you deactivate it, they get a warning when confirming the order and must remove it from the cart.',
      ],
    },
    {
      id: 'a-menu-7', title: 'Create discount codes and promotions',
      category: 'menu', readTime: '4 min',
      excerpt: 'Percentage discounts, fixed amount, 2-for-1: how to create promotions to attract customers.',
      content: [
        'From the dashboard go to "Promotions" → "Create discount". Choose the type: percentage (e.g. -10%), fixed amount (e.g. -€5), 2-for-1, or giveaway (a free dish above a certain spend).',
        'You can make the discount applicable to the whole menu, a specific category, or a single dish. You can also limit it to certain days of the week or time slots (e.g. happy hour from 18 to 20).',
        'The customer enters the discount code in the cart before confirming the order. If the discount is automatic (no code), it\'s applied as soon as the conditions are met.',
        'Track promotions from statistics: you can see how many times a discount was used, the revenue generated and the average ticket with/without discount. Useful to understand if a promo was profitable.',
      ],
    },

    /* ── Tables & QR ── */
    {
      id: 'a-tav-1', title: 'How to generate and print QR codes for tables',
      category: 'tavoli', readTime: '3 min', helpful: true,
      excerpt: 'Creation, download and printing of QR codes: formats, materials and practical tips.',
      content: [
        'From the dashboard go to "Tables" → "Add table". Enter the table number (or name) and the number of covers. The system automatically generates a unique QR code associated with that table.',
        'To print the QR codes, tap "Download PDF" to get a print-ready file with 6-12 QR codes per page, each with the table number written below. Use rigid PVC or wood supports to withstand table wear.',
        'The recommended minimum print size is 6x6 cm. Below this size some phones struggle to scan. Always leave a white border of at least 5 mm around the QR.',
        'Material tip: avoid paper (it wears out in a few weeks). PVC is cheap and durable. For high-end restaurants, engraved wood or metal is more elegant and matches the table.',
      ],
    },
    {
      id: 'a-tav-2', title: 'Associate a QR with a different table',
      category: 'tavoli', readTime: '2 min',
      excerpt: 'Changed the table numbering or want to reuse a QR? Here\'s how.',
      content: [
        'If you want to reassign an existing QR to a different table (for example because you renumbered tables), open the destination table and choose "Associate existing QR". Enter the code printed on the QR or scan it with the camera.',
        'The QR is automatically detached from the previous table and linked to the new one. If the previous table was active (with an in-progress order), the system asks for confirmation before proceeding.',
        'If a QR has been lost or stolen, you can deactivate it from the corresponding table and generate a new one. The old QR immediately stops working for security reasons.',
        'Tip: always print a few spare QR codes. If a support gets damaged, you can replace it in seconds without having to reprint.',
      ],
    },
    {
      id: 'a-tav-3', title: 'Table map: configure the dining room layout',
      category: 'tavoli', readTime: '4 min',
      excerpt: 'Reproduce your dining room floor plan to see table status at a glance.',
      content: [
        'The "Table map" feature lets you place tables on a grid that reproduces your dining room layout. Drag tables to the correct position and add walls to separate zones.',
        'The map shows each table\'s status in real time: free (green), occupied with an in-progress order (yellow), waiting for payment (orange), to be cleared (red). It\'s a precious tool for the floor manager.',
        'You can create multiple maps if your venue has multiple rooms (e.g. Main dining room, Outdoor patio, Private room). Switch between them with the selector at the top.',
        'The map is particularly useful in medium/large restaurants (over 15 tables). For small venues, the list view might be quicker.',
      ],
    },
    {
      id: 'a-tav-4', title: 'Handle shared tables and large groups',
      category: 'tavoli', readTime: '3 min',
      excerpt: 'Multiple customers ordering separately from the same table: how to avoid confusion.',
      content: [
        'For shared tables (e.g. 8 friends who want to pay individually) you can activate "Split bill" mode from the table settings. Each customer, by scanning the QR, sees their own personal tab.',
        'In split-bill mode, each customer orders separately and pays only their share. The waiter sees the cumulative total of the table and the individual totals, to verify everything adds up.',
        'For very large groups (over 10 people), split-bill mode can slow down service. In those cases we recommend splitting the group across two nearby physical tables, even if the dining room sees them as one.',
        'If a customer wants to pay for others (e.g. "it\'s on me"), they can select their friends\' dishes in their cart before paying. The system automatically updates individual bills.',
      ],
    },
    {
      id: 'a-tav-5', title: 'Security: why QR codes can\'t be copied or reused',
      category: 'tavoli', readTime: '4 min', helpful: true,
      excerpt: 'The encrypted temporary session system that protects your restaurant from fake orders.',
      content: [
        'm2m doesn\'t use simple URLs for tables. Each QR contains a static token (e.g. TAV1-X9Z2) that isn\'t a direct link to the menu, but a request for access to the secure server.',
        'When the customer scans the QR, the server generates a unique temporary link (UUID) valid for only 10 minutes. The user is redirected to this secure link. No one can copy the URL and reuse it.',
        'When the order is sent, the server ignores any parameter in the URL. It retrieves the table number directly from the database using the session ID. Even if someone modifies the URL to "&table=99", the order still arrives at the correct table registered in the DB.',
        'This system protects your restaurant from pranks, fake orders and fraud attempts. It\'s the same level of security used by home banking platforms.',
      ],
    },
    {
      id: 'a-tav-6', title: 'Enable/disable a table for the evening',
      category: 'tavoli', readTime: '2 min',
      excerpt: 'A table is reserved or closed for maintenance? How to exclude it temporarily.',
      content: [
        'To disable a table without deleting it, open the table and tap "Deactivate". The QR stops working and the table disappears from the dining room map as "active". Useful for reserved tables, maintenance, or unused tables on certain evenings.',
        'A deactivated table doesn\'t accept orders. If a customer tries to scan the QR, they see a "Table not available, please ask the staff" message.',
        'You can schedule deactivation: for example, deactivate table 12 every Monday for a week if you know it\'s booked for a fixed event. The feature is in "Scheduled availability".',
        'To reactivate the table, just tap "Activate". The QR immediately works again.',
      ],
    },

    /* ── Payments ── */
    {
      id: 'a-pag-1', title: 'Configure accepted payment methods',
      category: 'pagamenti', readTime: '3 min', helpful: true,
      excerpt: 'Cash, credit card, Satispay, Apple Pay: how to activate each method.',
      content: [
        'From Settings → Payments you can activate the methods you want to accept: cash (always active by default), credit card (requires a Stripe account or a compatible POS), Satispay, Apple Pay, Google Pay.',
        'For credit card and digital payments you need to link your Stripe account. If you don\'t have one, the system guides you through the registration (it\'s free, Stripe retains a percentage of 1.5-2.5% per transaction).',
        'For Satispay you need an active business account. The connection happens via API key that you\'ll find in your Satispay dashboard. The system automatically verifies the connection.',
        'You can choose which methods to accept for each table: for example, accept only cash at the bar counter but all methods at seated tables.',
      ],
    },
    {
      id: 'a-pag-2', title: 'How direct payment from the phone works',
      category: 'pagamenti', readTime: '3 min',
      excerpt: 'The customer pays with Apple Pay or card without waiting for the waiter: all the steps.',
      content: [
        'When the customer is ready to pay, they tap "Pay bill" in the digital menu. They see the total and can choose the payment method among those you\'ve activated.',
        'If they choose Apple Pay or Google Pay, the system directly opens the phone\'s payment interface. The customer confirms with Face ID/Touch ID and the payment is processed in seconds.',
        'If they choose credit card, they enter the details on a secure form (managed by Stripe, in full PCI-DSS compliance). Card details never transit on m2m\'s servers, they\'re handled directly by Stripe.',
        'Once paid, the waiter receives a "Payment received - Table X - €YY" notification. The receipt is automatically generated and emailed to the customer if they wish.',
      ],
    },
    {
      id: 'a-pag-3', title: 'Print receipts and fiscal receipts',
      category: 'pagamenti', readTime: '3 min',
      excerpt: 'Integration with thermal printers and POS systems for Italian fiscal compliance.',
      content: [
        'm2m integrates with the main Italian electronic POS systems (Epson, Custom, Olivetti, Exaltis). From Settings → Printers you can connect your printer via WiFi or USB.',
        'For each confirmed payment, the system automatically sends the receipt to the connected printer. The receipt includes all elements required by Italian regulation: progressive number, date, time, dish descriptions, total, VAT breakdown.',
        'For cash payments, the waiter must manually confirm the cash intake to print the receipt. This step ensures the receipt is issued only when the money has actually arrived.',
        'You can also print non-fiscal receipts (for covers, for the kitchen, for the customer) if your printer supports it.',
      ],
    },
    {
      id: 'a-pag-4', title: 'Reconciliation: verify the evening\'s takings',
      category: 'pagamenti', readTime: '4 min',
      excerpt: 'How to compare digital takings with cash and prepare the daily close.',
      content: [
        'At the end of the evening, go to "Analytics" → "Daily close". The system shows the total takings broken down by payment method: cash, card, Satispay, Apple Pay, etc.',
        'Compare the cash total shown with what\'s actually in the register. Any differences need to be investigated: they may be due to cancelled receipts, unrecorded tips, or waiter errors.',
        'Digital payments (card, Satispay, Apple Pay) are credited to your bank account within 2-3 business days. Stripe and Satispay fees are visible in the transaction details.',
        'You can export the daily close in PDF or CSV for your accountant. The format is compatible with the main Italian accounting software.',
      ],
    },
    {
      id: 'a-pag-5', title: 'Handle refunds and reversals',
      category: 'pagamenti', readTime: '3 min',
      excerpt: 'Customer wants their money back for a service issue? How to issue a proper refund.',
      content: [
        'To refund a digital payment (card, Satispay, Apple Pay), open the order in the history and tap "Refund". The system returns the amount to the customer\'s original card or account within 5-10 business days.',
        'Full refunds cancel the transaction. Partial refunds (for example a discount for a service issue) reduce the charged amount. In both cases, transaction fees are not refunded.',
        'For cash payments, the refund is manual: the waiter returns the money and marks the order as "refunded" in the system for statistics. No reversal receipt is generated, but a manual receipt.',
        'All refunds are recorded in statistics. A high number of refunds in a certain dish category may indicate a quality issue or a misleading description on the menu.',
      ],
    },
    {
      id: 'a-pag-6', title: 'Tips and cover charge: how to manage them',
      category: 'pagamenti', readTime: '2 min',
      excerpt: 'Add the cover charge to the bill and let the customer leave a tip with one tap.',
      content: [
        'The cover charge can be configured in Settings → Menu. Enter the amount (e.g. €2 per person) and the system automatically adds it to the bill based on the number of covers at the table.',
        'For tips, you can activate the "Suggest tip" feature in Settings → Payments. The customer, before paying, sees three suggestions (5%, 10%, 15%) and a "No tip" option. It\'s discreetly proposed, not imposed.',
        'Digital tips are credited together with the order amount. You can choose whether to keep them separate in statistics (to distribute them to staff) or merge them with the takings.',
        'Some restaurants use digital tips to fund a "solidarity box" (meals for people in difficulty). You can dedicate a percentage of tips to this cause and communicate it to customers.',
      ],
    },

    /* ── Staff & Roles ── */
    {
      id: 'a-sta-1', title: 'Invite a new staff member',
      category: 'staff', readTime: '3 min', helpful: true,
      excerpt: 'Add waiters, cooks or administrators to your restaurant account.',
      content: [
        'From the dashboard go to "Staff" → "Invite member". Enter name, email and choose the role: Admin (full access to everything), Waiter (orders and tables only), Cook (Kitchen Display only), Floor Manager (tables, orders, statistics).',
        'The new member receives an email with a link to complete registration. They must enter a password and download the app (or use the web version). First login must happen within 7 days of the invite.',
        'For each role you can customize permissions granularly. For example, a waiter can see tables but not sales statistics. A floor manager can edit the menu but not handle payments.',
        'The number of staff members depends on your plan: the basic plan includes up to 5 members, higher plans 10 or unlimited. You can see how many members you have active in "Staff" → "Summary".',
      ],
    },
    {
      id: 'a-sta-2', title: 'Differences between roles: Admin, Waiter, Cook, Floor Manager',
      category: 'staff', readTime: '4 min',
      excerpt: 'What each role can and can\'t do: the complete permissions guide.',
      content: [
        'Admin: full access to everything — menu, tables, orders, payments, statistics, staff, settings. Can invite and remove other members, change the plan, manage subscription payments. Usually the restaurant owner.',
        'Floor Manager: views and manages tables and orders, can edit the menu (activate/deactivate dishes, change prices), sees statistics, but can\'t manage staff or account settings. Ideal for the front-of-house manager.',
        'Waiter: sees assigned tables, receives customer calls, can create and edit orders, see kitchen status. Can\'t see statistics or edit the menu. Can\'t see detailed payments, only whether an order has been paid.',
        'Cook: sees only the Kitchen Display with incoming orders. Can change order statuses (in preparation, ready) but can\'t create orders or see tables. Doesn\'t see prices or customer details.',
      ],
    },
    {
      id: 'a-sta-3', title: 'Assign specific tables to a waiter',
      category: 'staff', readTime: '2 min',
      excerpt: 'How to create dining room zones and assign each waiter to specific tables.',
      content: [
        'From the "Staff" → "Zones" section, you can create dining room zones (e.g. Zone 1: tables 1-8, Zone 2: tables 9-16, Outdoor: tables 17-20) and assign each zone to a specific waiter.',
        'The waiter receives calls only from tables in their zone. On the Kitchen Display, orders also show the assigned waiter, so the kitchen knows who to deliver the dishes to.',
        'Assignments can be fixed (the same waiter always has the same zone) or variable (they change every evening based on the shift). For variable assignments, use the weekly schedule.',
        'If a waiter gets sick or doesn\'t show up, you can temporarily reassign their zone to another waiter with a single tap, without having to reconfigure everything.',
      ],
    },
    {
      id: 'a-sta-4', title: 'Revoke a former employee\'s access',
      category: 'staff', readTime: '2 min', helpful: true,
      excerpt: 'A chef left? How to immediately remove their access to the system.',
      content: [
        'Open the staff member\'s profile in "Staff" and tap "Remove access". The system immediately deactivates the account: the former employee can no longer log in with their credentials, neither from the app nor from the web.',
        'If you rehire the same person in the future, you can reactivate the account without having to re-enter it from scratch. Their order history is preserved for statistics.',
        'For greater security, we recommend changing admin passwords after an employee with access to sensitive data (payments, statistics, customer lists) leaves. Do it from "Settings" → "Security".',
        'All actions performed by a staff member remain tracked in the audit log (who cancelled an order, who changed a price, etc.). This makes every operation traceable.',
      ],
    },
    {
      id: 'a-sta-5', title: 'Activate two-factor authentication (2FA)',
      category: 'staff', readTime: '3 min',
      excerpt: 'Protect admin accounts with a second security factor.',
      content: [
        'Two-factor authentication adds a layer of security: in addition to the password, anyone logging in must enter a code generated by the Google Authenticator app or sent via SMS. Even if someone steals the password, they can\'t get in.',
        'To activate it, go to your profile → "Security" → "Enable 2FA". Scan the QR code with Google Authenticator (or Authy, 1Password) and enter the generated code to confirm. Save the backup codes in a safe place.',
        'We recommend making 2FA mandatory for all admin accounts. The feature is enabled in "Settings" → "Security" → "Require 2FA for admins".',
        'If you lose your phone and don\'t have backup codes, contact support to unlock the account. You\'ll be asked to verify your identity with documents.',
      ],
    },

    /* ── Branding ── */
    {
      id: 'a-bra-1', title: 'Upload your logo and customize colors',
      category: 'branding', readTime: '3 min', helpful: true,
      excerpt: 'Make the digital menu consistent with your restaurant\'s identity.',
      content: [
        'From Settings → Branding you can upload your logo (PNG or SVG format, transparent background recommended). The logo appears at the top of the digital menu and in all customer communications (notifications, email receipts).',
        'Choose your brand\'s main colors: a primary color (for buttons and accents) and a secondary color (for backgrounds and details). You can enter hex codes or use the color picker. The system automatically generates light/dark variants.',
        'The real-time preview shows you how the menu will look with your customizations. You can change branding at any time: the menu updates immediately for customers who are browsing it.',
        'Tip: use the same colors as your website and sign, for a consistent experience. If you don\'t have a defined brand, start from the "warm m2m" palette (amber/terracotta) and customize from there.',
      ],
    },
    {
      id: 'a-bra-2', title: 'Choose the menu font',
      category: 'branding', readTime: '2 min',
      excerpt: 'Among the available fonts, which one to choose to convey the venue\'s atmosphere.',
      content: [
        'm2m offers a curated selection of fonts for the digital menu: elegant Serif (Playfair Display, Cormorant) for high-end restaurants, modern Sans-serif (Inter, DM Sans) for casual venues, distinctive Display (Bebas Neue, Pacifico) for cocktail bars.',
        'You can choose one font for titles (larger, decorative) and one for body text (more readable). The combination matters: avoid using the same font for everything, or mixing too many fonts (maximum 2).',
        'The font is loaded from Google Fonts, so it\'s optimized for the web. All chosen fonts support Italian, English and the main European languages.',
        'Tip: try the menu on your phone after changing the font. What looks elegant on a computer is sometimes hard to read on mobile, especially prices.',
      ],
    },
    {
      id: 'a-bra-3', title: 'Add a restaurant cover photo',
      category: 'branding', readTime: '2 min',
      excerpt: 'The first image the customer sees when opening the menu: how to choose and upload it.',
      content: [
        'The cover photo appears at the top of the digital menu, above the logo. It\'s the first thing the customer sees after scanning the QR, so it\'s important that it\'s high quality and represents the venue well.',
        'Upload a horizontal image (16:9 or 3:2 ratio) of at least 1600 pixels wide. Photos of restaurant interiors, signature dishes, or food details are all good choices. Avoid generic photos found on the internet.',
        'You can also upload multiple covers and set them to rotate randomly on each menu opening. Useful if you have multiple rooms or multiple signature dishes.',
        'If the photo is too dark or too light, the system automatically applies an overlay to improve the legibility of the text above it. You can still adjust the overlay intensity in the settings.',
      ],
    },
    {
      id: 'a-bra-4', title: 'Customize the welcome message',
      category: 'branding', readTime: '2 min',
      excerpt: 'A greeting that the customer sees as soon as they open the menu.',
      content: [
        'In Settings → Branding → Welcome message, you can enter a sentence that appears under the logo in the menu home. Examples: "Welcome to Trattoria da Mario", "Tonight chef Luca recommends".',
        'The message can be customized in each enabled language. For foreign customers, a good translation makes the difference: don\'t rely solely on automatic translation for the welcome message.',
        'You can also schedule different messages for days or times: for example "Good lunch!" at noon and "Good evening!" after 7 PM. The feature is in "Scheduled messages".',
        'The welcome message helps create a personal and curated atmosphere, even if the customer orders independently from their phone without speaking to the staff.',
      ],
    },
    {
      id: 'a-bra-5', title: 'Create a menu for special events',
      category: 'branding', readTime: '3 min',
      excerpt: 'Valentine\'s Day menu, Christmas menu, tasting menu: how to handle special occasions.',
      content: [
        'From the dashboard you can create "Event menus" separate from the main menu. For example, for Valentine\'s Day you can create a fixed-price tasting menu, available only on February 14.',
        'For each event you set the availability dates, the price (if fixed), the included dishes and the dedicated QR (you can print different QR codes for the event menu, or use the same table QR and let the customer choose).',
        'The event menu can have different branding from the main menu: dedicated colors, fonts and cover photo. This helps create the atmosphere of the special occasion.',
        'After the event, the menu is automatically deactivated but stays saved. You can reuse it the following year or for similar occasions, just modifying the dates.',
      ],
    },

    /* ── Analytics ── */
    {
      id: 'a-ana-1', title: 'Read the daily sales dashboard',
      category: 'analytics', readTime: '4 min', helpful: true,
      excerpt: 'Revenue, order count, average ticket, top dish: how to interpret the day\'s numbers.',
      content: [
        'The main dashboard shows the day\'s numbers in real time: total revenue, number of orders, average ticket (revenue divided by orders), number of covers, best-selling dish.',
        'Compare these numbers with the same day of the previous week (e.g. this Saturday vs last Saturday). The system automatically highlights positive (green) or negative (red) variations.',
        'The average ticket is the most important KPI: if it drops, it may mean prices are too low, waiters aren\'t upselling mains or desserts enough, or the menu is unclear.',
        'The hourly chart shows when more orders arrive. Identify "dead slots" (time slots with few orders) to plan targeted promotions (e.g. happy hour from 18 to 19).',
      ],
    },
    {
      id: 'a-ana-2', title: 'Understand which dishes sell the most',
      category: 'analytics', readTime: '3 min', helpful: true,
      excerpt: 'Rank dishes by sales, revenue and margin: what to keep and what to remove from the menu.',
      content: [
        'In the "Analytics" → "Dishes" section you\'ll find the ranking of your dishes by number of orders, by revenue generated and by margin (revenue minus ingredient cost, if you\'ve entered costs).',
        'The "sales vs margin" matrix is precious: dishes with high sales and high margin are your workhorses (to promote). Dishes with low sales and low margin are removal candidates.',
        'Dishes with many views in the menu but few orders may have a price, photo or description issue. Try changing one of these elements and measure the impact in the following weeks.',
        'Seasonality: some dishes sell well in certain periods (e.g. soups in winter, salads in summer). The system shows historical trends to help you plan the seasonal menu.',
      ],
    },
    {
      id: 'a-ana-3', title: 'Identify peak hours and manage workloads',
      category: 'analytics', readTime: '3 min',
      excerpt: 'When does the rush arrive? How to use data to organize kitchen and staff.',
      content: [
        'The "Orders per hour" chart shows exactly when more orders arrive during the day. For restaurants, there are typically two peaks: 12:30-13:30 at lunch and 20:00-21:30 at dinner.',
        'Knowing the peaks lets you: (1) schedule staff to have more waiters and cooks at peak times, (2) prepare the most requested dishes in advance, (3) activate promotions in dead slots.',
        'You can compare peak hours of different days: for example, Friday evening might peak at 9 PM, Saturday at 8 PM. This helps you customize staff shifts.',
        'The "kitchen overload" alert warns you when the Kitchen Display has more than X pending orders. You can set the threshold based on your kitchen\'s capacity.',
      ],
    },
    {
      id: 'a-ana-4', title: 'Export reports for the accountant',
      category: 'analytics', readTime: '3 min',
      excerpt: 'Daily takings, VAT, breakdown by category: reports ready for accounting.',
      content: [
        'From the "Analytics" → "Reports" section you can generate monthly or custom reports with all the data needed for the accountant: daily takings, total VAT, breakdown by rate (4%, 10%, 22%).',
        'The report is available in PDF (readable) and CSV (importable into accounting software like Menu24, Distinta, Danea Easyfatt). Choose the format based on what your accountant uses.',
        'You can also generate a separate report for each payment method (cash, card, Satispay), useful for bank reconciliation. Digital payments are tracked with a unique transaction reference.',
        'All reports are electronically signed and kept for 10 years, in compliance with Italian regulations on the retention of fiscal documents.',
      ],
    },
    {
      id: 'a-ana-5', title: 'Demand forecasting with AI',
      category: 'analytics', readTime: '4 min',
      excerpt: 'The system predicts how many orders will arrive tomorrow: how to use it for purchasing.',
      content: [
        'm2m uses artificial intelligence to forecast demand for the coming days, based on: order history, day of the week, seasonality, local events (if linked to the calendar), weather.',
        'The forecast shows for each dish how many portions you\'re likely to sell tomorrow, the day after, and in the next 7 days. It helps you plan ingredient purchases so you don\'t run out of stock or waste.',
        'Forecast reliability grows over time: after 3-4 weeks of use, the system has enough data to give accurate estimates (10-15% margin of error).',
        'You can activate automatic alerts: for example, "black truffle expected to run out within 2 days" so you can order the supply in advance.',
      ],
    },
    {
      id: 'a-ana-6', title: 'Analyze customer reviews',
      category: 'analytics', readTime: '3 min',
      excerpt: 'Reviews left by customers after the meal: how to read and respond to them.',
      content: [
        'After paying, the customer can leave a review (1 to 5 star rating and optional comment). Reviews are collected in the "Analytics" → "Reviews" section.',
        'You can filter reviews by rating, by date, by ordered dish. Negative reviews (1-2 stars) are highlighted so you can act quickly.',
        'We recommend responding to all reviews, especially negative ones. A polite and professional response can turn an unhappy customer into a loyal one. Use the "Reply" function under each review.',
        'Positive reviews can be published (with the customer\'s permission) on your website or social media. The system automatically generates an image with the review ready to be shared.',
      ],
    },

    /* ── Settings ── */
    {
      id: 'a-imp-1', title: 'Initial setup: configure the restaurant in 5 minutes',
      category: 'impostazioni', readTime: '5 min', helpful: true,
      excerpt: 'The complete checklist to get started: from venue name to the first order received.',
      content: [
        '1. Enter the restaurant data: name, address, VAT number, phone, email. This data appears on receipts and fiscal documents.',
        '2. Upload your logo and set brand colors (see the "Upload your logo" article in Branding).',
        '3. Create menu categories (Starters, First courses, etc.) and add at least the main dishes (see "Create the first menu category").',
        '4. Create tables and download the QR codes to print (see "How to generate QR codes").',
        '5. Configure accepted payment methods (see "Configure accepted payment methods").',
        '6. Invite staff and assign roles (see "Invite a new staff member").',
        '7. Do a test: scan a QR with your phone, place a test order and verify it arrives in the kitchen. Pay for it to test the full flow.',
        '8. Train the staff: 15 minutes of training is enough for waiters and kitchen. Let them place a few test orders before opening to the public.',
      ],
    },
    {
      id: 'a-imp-2', title: 'Change the admin interface language',
      category: 'impostazioni', readTime: '2 min',
      excerpt: 'The dashboard in Italian, English or other languages for international staff.',
      content: [
        'The admin panel is available in Italian and English. To change language, go to your profile (icon at the top right) → "Interface language" and choose.',
        'Each staff member can choose their own language independently. For example, a Filipino cook can have the interface in English while the owner has it in Italian.',
        'The digital menu language (what customers see) is separate and depends on the customer\'s phone language, with fallback to Italian. You can\'t force a specific language on the customer.',
        'Fiscal documents (receipts, invoices) are always issued in Italian for regulatory compliance, regardless of the admin interface language.',
      ],
    },
    {
      id: 'a-imp-3', title: 'Configure push and email notifications',
      category: 'impostazioni', readTime: '3 min',
      excerpt: 'Which notifications to receive, on which device and at what times.',
      content: [
        'Each staff member can customize their notifications. Go to your profile → "Notifications". Choose which events you want to receive (new order, late order, waiter call, negative review, etc.).',
        'For each event you can choose the channel: push notification (on the phone), email, or both. Push notifications are immediate, emails may have a few minutes delay.',
        'Sound notifications can be customized: one sound for new orders, another for customer calls, a third for late orders. It helps you recognize the event without looking at the screen.',
        'You can set silent hours (e.g. from 11 PM to 8 AM don\'t receive push notifications except for emergencies). Useful for owners who don\'t want to be disturbed at night.',
      ],
    },
    {
      id: 'a-imp-4', title: 'Manage multi-location: multiple restaurants with one account',
      category: 'impostazioni', readTime: '4 min', helpful: true,
      excerpt: 'Have two venues? How to manage them from the same account with separate data.',
      content: [
        'From Settings → Locations you can add multiple restaurants to your account. Each location has its own menu, its own tables, its own brand and its own statistics, but you manage them all from the same login.',
        'The location selector at the top lets you switch between venues with one click. Staff can be assigned to one or more locations: for example, a cook who works in both venues will see both Kitchen Displays.',
        'Statistics can be viewed per single location or aggregated (useful to compare venue performance). Fiscal reports are always separate per location, for accounting correctness.',
        'The cost of each additional location depends on your plan. The basic plan includes 1 location, higher plans 3 or unlimited. You can add or remove locations at any time.',
      ],
    },
    {
      id: 'a-imp-5', title: 'Data backup and privacy',
      category: 'impostazioni', readTime: '3 min',
      excerpt: 'Is your data safe? How backups work and what the GDPR regulation says.',
      content: [
        'm2m performs daily encrypted backups of all your data (menu, orders, statistics, customers). Backups are kept for 30 days with retention, and are hosted on EU servers for GDPR compliance.',
        'In case of issues (your error, technical problem, cyberattack) you can restore a backup from the last 24 hours by contacting support. For older backups, restoration takes a few hours.',
        'Customer data (names, emails, phone numbers if entered) is processed in compliance with GDPR. You can download an export of all data of a specific customer, or delete it completely, at their request.',
        'You can also activate "maximum privacy mode" which doesn\'t save any customer personal data (they order anonymously via QR). Useful if you want to be safe on privacy, but you lose the ability to send promotions.',
      ],
    },
    {
      id: 'a-imp-6', title: 'Change plan or cancel the subscription',
      category: 'impostazioni', readTime: '3 min',
      excerpt: 'Switch from free to paid, from monthly to annual, or cancel: all the options.',
      content: [
        'From Settings → Subscription you can see your current plan, the renewal date and the cost. To change plan, choose the new one and confirm: the system recalculates the prorated cost and charges it at the next renewal.',
        'Switching from monthly to annual saves about 2 months. Switching from annual to monthly is only possible at the end of the annual period.',
        'To cancel, go to "Subscription" → "Cancel". Cancellation takes effect at the end of the paid period: until then you keep all features. After expiry, your account switches to read-only mode for 90 days (you can export data), then is deactivated.',
        'Paid plans can be tried free for 14 days without a credit card. At the end of the trial, the account automatically reverts to the free plan (if available) or is suspended.',
      ],
    },
    {
      id: 'a-imp-7', title: 'Connect external accounts (Google, Instagram)',
      category: 'impostazioni', readTime: '2 min',
      excerpt: 'Import photos from Instagram, reviews from Google: integrations useful for marketing.',
      content: [
        'From Settings → Integrations you can link your business Instagram account to automatically import dish photos into the menu. When you post on Instagram, photos are synced within an hour.',
        'By linking your Google Business Profile you can import Google reviews directly into the dashboard, alongside those left by customers in the digital menu. You thus have a unified view of reputation.',
        'The Facebook integration lets you automatically publish new dishes or promotions on your Facebook page. You save time and keep social media updated.',
        'All integrations use OAuth: you never share your password with m2m. You can revoke access at any time from the external account\'s settings.',
      ],
    },
  ],
}

/* ─── Sub-components ────────────────────────────────────────────── */

function CategoryCard({ category, onSelect }: { category: Category; onSelect: (id: string) => void }) {
  const { lang } = useI18n()
  const ui = UI[lang]
  const Icon = category.icon
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.button
        whileHover={{ y: -3, scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onSelect(category.id)}
        className="noise-overlay group relative overflow-hidden rounded-3xl border border-ink/5 bg-white/80 p-6 shadow-sm backdrop-blur lift-hover text-left w-full cursor-pointer"
      >
        {/* Gradient top border on hover */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-amber/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-brand-amber/15 text-brand-amber shadow-md transition-transform duration-300 group-hover:scale-110">
            <Icon size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-sm text-ink">{category.title}</h3>
              <ChevronRight
                size={16}
                className="text-brand-amber opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-[-4px] group-hover:translate-x-0"
              />
            </div>
            <p className="text-xs leading-relaxed mb-2 text-ink/60">
              {category.description}
            </p>
            <span className="text-[0.65rem] font-semibold text-brand-amber">
              {category.articleCount} {ui.categories.articles}
            </span>
          </div>
        </div>
      </motion.button>
    </motion.div>
  )
}

function FAQAccordion({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-ink/5 last:border-b-0 transition-colors duration-200">
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

function GuideCard({ guide }: { guide: Guide; index: number }) {
  const { lang } = useI18n()
  const ui = UI[lang]
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        whileHover={{ y: -2 }}
        className="noise-overlay group relative overflow-hidden rounded-3xl border border-ink/5 bg-white/80 p-6 shadow-sm backdrop-blur lift-hover cursor-pointer"
      >
        {/* Gradient top border on hover */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-amber/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {guide.featured && (
          <div className="absolute top-3 right-3 z-10">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.6rem] font-bold bg-gradient-to-r from-brand-amber to-brand-terra text-white shadow-glow-amber">
              <Star size={9} fill="white" />
              {ui.guides.featured}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full bg-brand-amber/15 text-brand-amber">
            {guide.category}
          </span>
          <span className="flex items-center gap-1 text-[0.65rem] text-ink/60">
            <Clock size={10} />
            {guide.readTime}
          </span>
        </div>
        <h4 className="font-bold text-sm mb-2 leading-snug text-ink">
          {guide.title}
        </h4>
        <p className="text-xs leading-relaxed mb-3 text-ink/60">
          {guide.description}
        </p>
        <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-amber transition-colors duration-200">
          <span>{ui.guides.readGuide}</span>
          <ArrowRight
            size={13}
            className="transition-transform duration-200 group-hover:translate-x-1"
          />
        </div>
      </motion.div>
    </motion.div>
  )
}

function QuickStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-brand-amber">{icon}</div>
      <div className="text-left">
        <div className="text-sm font-black leading-none text-ink">{value}</div>
        <div className="text-[0.6rem] font-semibold text-ink/60">{label}</div>
      </div>
    </div>
  )
}

function ContactOption({ icon: Icon, title, description, action }: {
  icon: React.ElementType; title: string; description: string; action: string
}) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      className="noise-overlay group relative overflow-hidden rounded-3xl border border-ink/5 bg-white/80 p-6 shadow-sm backdrop-blur lift-hover flex flex-col items-center text-center cursor-pointer transition-all duration-200"
    >
      {/* Gradient top border on hover */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-amber/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-brand-amber/15 text-brand-amber mb-3 shadow-md transition-transform duration-300 group-hover:scale-110">
        <Icon size={22} />
      </div>
      <h4 className="font-bold text-sm mb-1 text-ink">{title}</h4>
      <p className="text-xs mb-3 text-ink/60">{description}</p>
      <span className="flex items-center gap-1 text-xs font-semibold text-brand-amber">
        {action}
        <ArrowUpRight size={12} />
      </span>
    </motion.button>
  )
}

function QuickLink({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.96 }}
      className="flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold cursor-pointer transition-all duration-200 border-ink/15 bg-white/70 text-ink backdrop-blur lift-hover"
    >
      {icon}
      {label}
    </motion.button>
  )
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function HelpCenterPage() {
  const { lang } = useI18n()
  const ui = UI[lang]
  const CATEGORIES = CATEGORIES_BY_LANG[lang]
  const FAQS = FAQS_BY_LANG[lang]
  const GUIDES = GUIDES_BY_LANG[lang]
  const ARTICLES = ARTICLES_BY_LANG[lang]

  const [searchQuery, setSearchQuery] = useState('')
  const [openFAQ, setOpenFAQ] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [openArticle, setOpenArticle] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<'faq' | 'guides' | 'contact'>('faq')

  const heroRef = useRef<HTMLElement>(null)
  const gridRef = useRef<HTMLElement>(null)
  const heroInView = useInView(heroRef, { once: true })
  const gridInView = useInView(gridRef, { once: true })

  // Filter data by search
  const filteredCategories = searchQuery
    ? CATEGORIES.filter((c) =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : CATEGORIES

  const filteredFAQs = searchQuery
    ? FAQS.filter(
        (f) =>
          f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : FAQS

  const filteredGuides = searchQuery
    ? GUIDES.filter(
        (g) =>
          g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          g.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : GUIDES

  // Articles belonging to the selected category
  const selectedCategoryArticles = selectedCategory
    ? ARTICLES.filter((a) => a.category === selectedCategory)
    : []

  // Articles matching the search query (across all categories)
  const filteredArticles = searchQuery
    ? ARTICLES.filter(
        (a) =>
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.content.some((p) => p.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : []

  const hasNoResults =
    searchQuery &&
    filteredCategories.length === 0 &&
    filteredFAQs.length === 0 &&
    filteredGuides.length === 0 &&
    filteredArticles.length === 0

  const sectionTabs = [
    { key: 'faq' as const, label: ui.tabs.faq, icon: HelpCircle },
    { key: 'guides' as const, label: ui.tabs.guides, icon: BookOpen },
    { key: 'contact' as const, label: ui.tabs.contact, icon: Headphones },
  ]

  return (
    <PageShell>
    <div className="flex flex-col relative overflow-x-clip">
      {/* ─── Animated background orbs ─────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-brand-amber/5 blur-3xl animate-float-soft" />
        <div className="absolute top-1/4 -right-24 w-[400px] h-[400px] rounded-full bg-brand-emerald/5 blur-3xl animate-blob" />
        <div className="absolute -bottom-20 left-1/4 w-[450px] h-[450px] rounded-full bg-brand-rose/5 blur-3xl animate-float-soft" />
      </div>

      {/* ─── Hero Section ───────────────────────────────────────── */}
      <section className="relative pt-28 sm:pt-36 pb-10 sm:pb-14 px-4" ref={heroRef}>
        <div className="max-w-3xl mx-auto text-center">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="flex justify-center mb-5"
          >
            <span className="eyebrow border border-brand-amber/30 bg-brand-amber/10 text-brand-amber">
              <Headphones size={16} />
              <span>{ui.hero.eyebrow}</span>
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="font-serif text-4xl font-black tracking-tight text-ink sm:text-5xl leading-[1.1] mb-4"
          >
            <span className="bg-gradient-to-r from-brand-amber to-brand-terra bg-clip-text text-transparent">{ui.hero.title1}</span>
            <br />
            <span className="text-ink">{ui.hero.title2}</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.3, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="text-base sm:text-lg max-w-xl mx-auto mb-8 leading-relaxed text-ink/60"
          >
            {ui.hero.subtitle1}
            <br className="hidden sm:block" />
            {ui.hero.subtitle2}
          </motion.p>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-w-lg mx-auto"
          >
            <div className="noise-overlay relative overflow-hidden rounded-2xl border border-ink/5 bg-white/80 shadow-sm backdrop-blur">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/60"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={ui.search.placeholder}
                className="w-full bg-transparent pl-11 pr-10 py-3.5 text-base text-ink placeholder:text-ink/40 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink/60 hover:text-ink transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </motion.div>

          {/* Quick stats */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.5, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center justify-center gap-6 mt-6"
          >
            <QuickStat icon={<BookOpen size={14} />} value={`${ARTICLES.length}`} label={ui.stats.articles} />
            <div className="w-px h-6 bg-ink/10" />
            <QuickStat icon={<Lightbulb size={14} />} value={String(GUIDES.length)} label={ui.stats.guides} />
            <div className="w-px h-6 bg-ink/10" />
            <QuickStat icon={<MessageCircle size={14} />} value="24/7" label={ui.stats.support} />
          </motion.div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-4 mb-8">
        <div className="h-px bg-gradient-to-r from-transparent via-ink/10 to-transparent" />
      </div>

      {/* ─── No results ─────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {hasNoResults ? (
          <motion.div
            key="no-results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="max-w-md mx-auto px-4 py-16 text-center"
          >
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 bg-ink/5">
              <Search size={30} className="text-ink/40" />
            </div>
            <h3 className="text-xl font-bold mb-2 text-ink">
              {ui.noResults.title} &quot;{searchQuery}&quot;
            </h3>
            <p className="text-sm mb-5 text-ink/60">
              {ui.noResults.description}
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="border-ink/15 bg-white/70 text-ink backdrop-blur rounded-full lift-hover px-5 py-2.5 text-sm font-semibold cursor-pointer transition-all duration-200"
            >
              {ui.noResults.clear}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            ref={gridRef}
            className="contents"
          >
            {/* ─── Categories Grid ─────────────────────────────── */}
            {!searchQuery && (
              <section className="max-w-6xl mx-auto px-4 mb-12">
                <motion.h2
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="font-serif text-2xl font-bold tracking-tight text-ink mb-4"
                >
                  {ui.categories.title}
                </motion.h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredCategories.map((cat) => (
                    <CategoryCard
                      key={cat.id}
                      category={cat}
                      onSelect={(id) => {
                        setSelectedCategory(selectedCategory === id ? null : id)
                        setOpenArticle(null)
                        // Scroll to the articles panel so the user sees the articles
                        setTimeout(() => {
                          document.getElementById('category-articles')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }, 50)
                      }}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ─── Category Articles Panel ─────────────────────── */}
            {!searchQuery && selectedCategory && (
              <section id="category-articles" className="max-w-4xl mx-auto px-4 mb-12 scroll-mt-24">
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="bg-white/80 backdrop-blur rounded-3xl border border-ink/5 shadow-sm overflow-hidden"
                >
                  {/* Category header */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-brand-amber/10 via-brand-terra/5 to-brand-rose/10 p-6 sm:p-8 border-b border-ink/5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        {(() => {
                          const cat = CATEGORIES.find((c) => c.id === selectedCategory)
                          if (!cat) return null
                          const Icon = cat.icon
                          return (
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-r from-brand-amber to-brand-terra text-white shadow-glow-amber flex-shrink-0">
                              <Icon size={26} />
                            </div>
                          )
                        })()}
                        <div className="min-w-0">
                          <h3 className="font-serif text-2xl font-black tracking-tight text-ink leading-tight">
                            {CATEGORIES.find((c) => c.id === selectedCategory)?.title}
                          </h3>
                          <p className="text-sm text-ink/60 mt-0.5">
                            {selectedCategoryArticles.length} {ui.articlePanel.articlesInCategory}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedCategory(null)
                          setOpenArticle(null)
                        }}
                        className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border-ink/15 bg-white/70 text-ink backdrop-blur lift-hover cursor-pointer transition-all duration-200"
                      >
                        <X size={15} />
                        <span className="hidden sm:inline">{ui.articlePanel.close}</span>
                      </button>
                    </div>
                  </div>

                  {/* Articles list */}
                  <div className="divide-y divide-ink/5">
                    {selectedCategoryArticles.map((article) => {
                      const isOpen = openArticle === article.id
                      return (
                        <div key={article.id} className="transition-colors duration-200">
                          <button
                            onClick={() => setOpenArticle(isOpen ? null : article.id)}
                            className="w-full flex items-start justify-between gap-4 p-5 sm:p-6 text-left cursor-pointer group"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                <span className="flex items-center gap-1 text-[0.65rem] text-ink/55">
                                  <Clock size={10} />
                                  {article.readTime}
                                </span>
                                {article.helpful && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6rem] font-bold bg-brand-emerald/15 text-brand-emerald">
                                    <Star size={8} fill="currentColor" />
                                    {ui.articlePanel.recommended}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-bold text-sm sm:text-base text-ink leading-snug transition-colors duration-200 group-hover:text-brand-amber">
                                {article.title}
                              </h4>
                              {!isOpen && (
                                <p className="text-xs sm:text-sm leading-relaxed mt-1.5 text-ink/60 line-clamp-2">
                                  {article.excerpt}
                                </p>
                              )}
                            </div>
                            <motion.div
                              animate={{ rotate: isOpen ? 180 : 0 }}
                              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                              className="flex-shrink-0 mt-1"
                            >
                              <ChevronDown size={18} className="text-ink/50" />
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
                                <div className="px-5 sm:px-6 pb-6">
                                  <div className="pl-0 sm:pl-1 space-y-3">
                                    {article.content.map((para, idx) => (
                                      <p key={idx} className="text-sm leading-relaxed text-ink/70">
                                        {para}
                                      </p>
                                    ))}
                                  </div>
                                  {/* Article footer */}
                                  <div className="mt-5 pt-4 border-t border-ink/5 flex items-center justify-between gap-3">
                                    <span className="text-xs text-ink/45">
                                      {ui.articlePanel.category}: {CATEGORIES.find((c) => c.id === article.category)?.title}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={(e) => { e.stopPropagation() }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-brand-emerald/10 text-brand-emerald hover:bg-brand-emerald/20 transition-colors cursor-pointer"
                                      >
                                        <CircleCheckBig size={12} />
                                        {ui.articlePanel.helpful}
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation() }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-ink/5 text-ink/60 hover:bg-ink/10 transition-colors cursor-pointer"
                                      >
                                        <MessageCircle size={12} />
                                        {ui.articlePanel.comment}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              </section>
            )}

            {/* ─── Sections Area ───────────────────────────────── */}
            <div id="sections-area" className="max-w-6xl mx-auto px-4 pb-16">

              {/* Section tabs */}
              <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {sectionTabs.map((tab) => {
                  const TabIcon = tab.icon
                  const isActive = activeSection === tab.key
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveSection(tab.key)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-250 cursor-pointer ${
                        isActive
                          ? 'bg-gradient-to-r from-brand-amber to-brand-terra text-white shadow-glow-amber'
                          : 'bg-white/70 text-ink/60 border border-ink/10'
                      }`}
                    >
                      <TabIcon size={15} />
                      {tab.label}
                    </button>
                  )
                })}
              </div>

              <AnimatePresence mode="wait">
                {/* ─── FAQ Section ─────────────────────────────── */}
                {activeSection === 'faq' && (
                  <motion.section
                    key="faq"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="bg-white/80 backdrop-blur rounded-3xl border border-ink/5 shadow-sm">
                      <div className="p-5 sm:p-6">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-r from-brand-amber to-brand-terra text-white shadow-glow-amber">
                            <HelpCircle size={20} />
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-ink">
                              {ui.faq.title}
                            </h3>
                            <p className="text-xs text-ink/60">
                              {ui.faq.subtitle}
                            </p>
                          </div>
                        </div>

                        <div className="divide-y divide-ink/5">
                          {filteredFAQs.map((faq) => (
                            <FAQAccordion
                              key={faq.question}
                              item={faq}
                              isOpen={openFAQ === faq.question}
                              onToggle={() =>
                                setOpenFAQ(openFAQ === faq.question ? null : faq.question)
                              }
                            />
                          ))}
                        </div>

                        {filteredFAQs.length === 0 && searchQuery && (
                          <div className="py-8 text-center">
                            <p className="text-sm text-ink/60">
                              {ui.faq.noResults}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.section>
                )}

                {/* ─── Article search results (only when searching) ── */}
                {activeSection === 'faq' && searchQuery && filteredArticles.length > 0 && (
                  <motion.section
                    key="articles-search"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-6"
                  >
                    <div className="bg-white/80 backdrop-blur rounded-3xl border border-ink/5 shadow-sm">
                      <div className="p-5 sm:p-6">
                        <div className="flex items-center gap-3 mb-5">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-r from-brand-emerald to-brand-sky text-white shadow-glow-emerald">
                            <FileText size={20} />
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-ink">
                              {ui.articleSearch.title}
                            </h3>
                            <p className="text-xs text-ink/60">
                              {filteredArticles.length} {filteredArticles.length === 1 ? ui.articleSearch.foundSingular : ui.articleSearch.foundPlural} {ui.articleSearch.forSearch}
                            </p>
                          </div>
                        </div>
                        <div className="divide-y divide-ink/5">
                          {filteredArticles.map((article) => {
                            const isOpen = openArticle === article.id
                            const cat = CATEGORIES.find((c) => c.id === article.category)
                            return (
                              <div key={article.id}>
                                <button
                                  onClick={() => setOpenArticle(isOpen ? null : article.id)}
                                  className="w-full flex items-start justify-between gap-4 py-4 px-1 text-left cursor-pointer group"
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full bg-brand-amber/15 text-brand-amber">
                                        {cat?.title}
                                      </span>
                                      <span className="flex items-center gap-1 text-[0.65rem] text-ink/55">
                                        <Clock size={10} />
                                        {article.readTime}
                                      </span>
                                      {article.helpful && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.6rem] font-bold bg-brand-emerald/15 text-brand-emerald">
                                          <Star size={8} fill="currentColor" />
                                          {ui.articlePanel.recommended}
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="font-semibold text-sm text-ink leading-snug transition-colors duration-200 group-hover:text-brand-amber">
                                      {article.title}
                                    </h4>
                                    {!isOpen && (
                                      <p className="text-xs leading-relaxed mt-1 text-ink/60 line-clamp-2">
                                        {article.excerpt}
                                      </p>
                                    )}
                                  </div>
                                  <motion.div
                                    animate={{ rotate: isOpen ? 180 : 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="flex-shrink-0 mt-1"
                                  >
                                    <ChevronDown size={18} className="text-ink/50" />
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
                                      <div className="pb-4 px-1 space-y-3">
                                        {article.content.map((para, idx) => (
                                          <p key={idx} className="text-sm leading-relaxed text-ink/70">
                                            {para}
                                          </p>
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.section>
                )}

                {/* ─── Guides Section ──────────────────────────── */}
                {activeSection === 'guides' && (
                  <motion.section
                    key="guides"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {/* Featured guides */}
                    {filteredGuides.some((g) => g.featured) && (
                      <div className="mb-8">
                        <motion.h3
                          initial={{ opacity: 0, y: 24 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                          className="font-serif text-2xl font-bold tracking-tight text-ink mb-4"
                        >
                          {ui.guides.featuredTitle}
                        </motion.h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {filteredGuides
                            .filter((g) => g.featured)
                            .map((guide, i) => (
                              <GuideCard key={guide.id} guide={guide} index={i} />
                            ))}
                        </div>
                      </div>
                    )}

                    {/* All guides */}
                    <motion.h3
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className="font-serif text-2xl font-bold tracking-tight text-ink mb-4"
                    >
                      {ui.guides.allTitle}
                    </motion.h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {filteredGuides.map((guide, i) => (
                        <GuideCard key={guide.id} guide={guide} index={i} />
                      ))}
                    </div>

                    {filteredGuides.length === 0 && searchQuery && (
                      <div className="py-8 text-center">
                        <p className="text-sm text-ink/60">
                          {ui.guides.noResults}
                        </p>
                      </div>
                    )}
                  </motion.section>
                )}

                {/* ─── Contact Section ─────────────────────────── */}
                {activeSection === 'contact' && (
                  <motion.section
                    key="contact"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="max-w-3xl mx-auto"
                  >
                    <div className="bg-white/80 backdrop-blur rounded-3xl border border-ink/5 shadow-sm">
                      <div className="p-6 sm:p-8">
                        <div className="text-center mb-8">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.15 }}
                            className="w-14 h-14 rounded-2xl bg-gradient-to-r from-brand-amber to-brand-terra flex items-center justify-center text-white mx-auto mb-4 shadow-glow-amber"
                          >
                            <Headphones size={26} />
                          </motion.div>
                          <h3 className="text-xl font-bold mb-2 text-ink">
                            {ui.contact.title}
                          </h3>
                          <p className="text-sm text-ink/60">
                            {ui.contact.subtitle}
                          </p>
                        </div>

                        {/* Contact options */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <ContactOption
                            icon={MessageCircle}
                            title={ui.contact.liveChat.title}
                            description={ui.contact.liveChat.description}
                            action={ui.contact.liveChat.action}
                          />
                          <ContactOption
                            icon={Mail}
                            title={ui.contact.email.title}
                            description={ui.contact.email.description}
                            action={ui.contact.email.action}
                          />
                          <ContactOption
                            icon={Phone}
                            title={ui.contact.phone.title}
                            description={ui.contact.phone.description}
                            action={ui.contact.phone.action}
                          />
                        </div>

                        {/* Response time promise */}
                        <div className="mt-8 flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-brand-emerald/10 border border-brand-emerald/20">
                          <CircleCheckBig size={18} className="text-brand-emerald" />
                          <span className="text-sm font-medium text-brand-emerald">
                            {ui.contact.responseTime}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.section>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Quick Links Bar ────────────────────────────────────── */}
      {!hasNoResults && (
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="max-w-6xl mx-auto px-4 pb-16"
        >
          <div className="noise-overlay relative overflow-hidden rounded-3xl border border-ink/5 bg-white/80 shadow-sm backdrop-blur">
            <div className="p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div>
                  <h3 className="font-bold text-base mb-1 text-ink">
                    {ui.quickLinks.title}
                  </h3>
                  <p className="text-sm text-ink/60">
                    {ui.quickLinks.subtitle}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <QuickLink icon={<Video size={15} />} label={ui.quickLinks.video} />
                  <QuickLink icon={<FileText size={15} />} label={ui.quickLinks.changelog} />
                  <QuickLink icon={<Shield size={15} />} label={ui.quickLinks.privacy} />
                  <QuickLink icon={<ExternalLink size={15} />} label={ui.quickLinks.api} />
                </div>
              </div>
            </div>
          </div>
        </motion.section>
      )}

      {/* ─── Footer CTA ─────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: 0.6 }}
        className="mt-auto"
      >
        <div className="max-w-6xl mx-auto px-4 pb-12">
          <div className="relative overflow-hidden bg-gradient-to-br from-brand-terra via-brand-amber to-brand-rose rounded-[2.5rem] noise-overlay">
            {/* Sparkle dots */}
            <div className="absolute top-8 left-[15%] w-2 h-2 rounded-full bg-white/30 animate-pulse" />
            <div className="absolute top-16 right-[20%] w-1.5 h-1.5 rounded-full bg-white/25 animate-pulse" style={{ animationDelay: '0.5s' }} />
            <div className="absolute bottom-12 left-[25%] w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute bottom-8 right-[30%] w-2 h-2 rounded-full bg-white/30 animate-pulse" style={{ animationDelay: '1.5s' }} />

            {/* Sheen effect */}
            <div className="absolute inset-0 sheen" />

            <div className="max-w-4xl mx-auto px-6 py-14 sm:py-18 text-center relative z-10">
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.15 }}
                className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white mx-auto mb-5"
              >
                <Zap size={24} />
              </motion.div>

              <h2 className="font-serif text-2xl sm:text-3xl font-black text-white mb-3 leading-tight text-lift-strong">
                {ui.cta.title}
              </h2>
              <p className="max-w-lg mx-auto mb-7 text-sm sm:text-base leading-relaxed text-white/80">
                {ui.cta.body}
              </p>

              <motion.button
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 bg-white text-brand-terra font-semibold rounded-full px-8 py-3.5 shadow-lg cursor-pointer transition-all duration-200 hover:shadow-xl group"
              >
                <MessageCircle size={18} />
                <span>{ui.cta.button}</span>
                <ArrowRight
                  size={16}
                  className="transition-transform duration-200 group-hover:translate-x-1"
                />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.section>
    </div>
    </PageShell>
  )
}
