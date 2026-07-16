import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Lang } from '@/lib/i18n/dictionary'
import { hitRateLimit, getClientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// H2: l'endpoint è pubblico e invoca un LLM a pagamento (Groq) scrivendo su DB con
// service-role. Rate-limit per IP per evitare abuso costi e spam su chat_logs.
const RATE_MAX = 20 // messaggi per finestra
const RATE_WINDOW_MS = 60 * 1000 // finestra di 1 minuto per IP

type ChatMessage = { role: 'user' | 'assistant'; content: string }

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SYSTEM_PROMPTS: Record<Lang, string> = {
  it: `Sei l'assistente virtuale del sito m2m, una piattaforma SaaS per la gestione digitale di ordini e menu dei ristoranti.
Rispondi SOLO a domande su m2m come prodotto: funzionalità, prezzi, come funziona, come iscriversi, supporto tecnico.
Non hai accesso ai dati di nessun ristorante specifico (menu, orari, prezzi dei piatti, ordini, informazioni di contatto).
Se ti viene chiesto qualcosa su un ristorante specifico (es. "che orari ha il ristorante X", "cosa c'è nel menu di X"), NON inventare una risposta: spiega chiaramente che non hai accesso ai dati di quel ristorante e invita l'utente a contattare direttamente il ristorante o a consultare la sua pagina/menu digitale.
Non fornire mai informazioni plausibili ma non verificate su ristoranti, persone o aziende.`,
  en: `You are the virtual assistant for the m2m website, a SaaS platform for digital restaurant order and menu management.
Only answer questions about m2m as a product: features, pricing, how it works, how to sign up, technical support.
You do not have access to any specific restaurant's data (menu, hours, dish prices, orders, contact info).
If asked about a specific restaurant (e.g. "what are X restaurant's hours", "what's on X's menu"), do NOT make up an answer: clearly state you don't have access to that restaurant's data and suggest contacting the restaurant directly or checking its digital menu page.
Never provide plausible-sounding but unverified information about restaurants, people, or companies.`,
}

function buildMenuSystemPrompt(lang: Lang, restaurantName: string, menuText: string): string {
  if (lang === 'en') {
    return `You are the virtual waiter/assistant of "${restaurantName}", available on its digital menu.
You have access to this restaurant's current menu below. Use ONLY the dishes listed there: never invent dishes, prices, or ingredients that are not present.
When a guest asks for advice on what to eat (based on mood, cravings, dietary preferences, allergies, budget, etc.), suggest 1-3 relevant dishes from the menu and briefly explain why they fit.
You can also answer general questions about the menu (prices, ingredients, allergens, vegetarian/vegan/gluten-free options).
If asked something unrelated to the restaurant's menu, answer briefly if you reasonably can, otherwise suggest asking the staff.
Keep answers short, warm and natural, like a knowledgeable waiter. Reply in the same language the guest writes in.

MENU:
${menuText}`
  }
  return `Sei il cameriere/assistente virtuale di "${restaurantName}", disponibile sul suo menu digitale.
Hai accesso al menu attuale del ristorante qui sotto. Usa SOLO i piatti elencati: non inventare mai piatti, prezzi o ingredienti non presenti nella lista.
Quando un cliente ti chiede un consiglio su cosa mangiare (in base all'umore, alla voglia del momento, a preferenze alimentari, allergie, budget, ecc.), suggerisci 1-3 piatti pertinenti presi dal menu, spiegando brevemente perché li consigli.
Puoi anche rispondere a domande generali sul menu (prezzi, ingredienti, allergeni, opzioni vegetariane/vegane/senza glutine).
Se ti viene chiesto qualcosa che non riguarda il menu del ristorante, rispondi brevemente se puoi ragionevolmente farlo, altrimenti invita a chiedere allo staff.
Rispondi in modo breve, cordiale e naturale, come un cameriere esperto e disponibile. Rispondi nella stessa lingua usata dal cliente.

MENU:
${menuText}`
}

async function fetchMenuContext(restaurantId: string): Promise<{ restaurantName: string; menuText: string } | null> {
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('name')
    .eq('id', restaurantId)
    .maybeSingle()

  const { data: categories } = await supabase
    .from('menu_categories')
    .select('id, name, sort_order')
    .eq('restaurant_id', restaurantId)
    .eq('is_visible', true)
    .order('sort_order')

  if (!categories || categories.length === 0) return null

  const categoryIds = categories.map((c) => c.id)
  const { data: items } = await supabase
    .from('menu_items')
    .select('category_id, name, description, price_cents, is_available, is_vegetarian, is_vegan, is_gluten_free, allergens')
    .in('category_id', categoryIds)
    .eq('is_available', true)

  if (!items || items.length === 0) return null

  const lines: string[] = []
  for (const cat of categories) {
    const catItems = items.filter((i) => i.category_id === cat.id)
    if (catItems.length === 0) continue
    lines.push(`\n${cat.name}:`)
    for (const item of catItems) {
      const price = typeof item.price_cents === 'number' ? `${(item.price_cents / 100).toFixed(2)}€` : ''
      const tags = [
        item.is_vegetarian && 'vegetariano',
        item.is_vegan && 'vegano',
        item.is_gluten_free && 'senza glutine',
      ].filter(Boolean).join(', ')
      const allergens = Array.isArray(item.allergens) && item.allergens.length > 0 ? ` [allergeni: ${item.allergens.join(', ')}]` : ''
      const desc = item.description ? ` - ${item.description}` : ''
      lines.push(`- ${item.name} (${price})${desc}${tags ? ` [${tags}]` : ''}${allergens}`)
    }
  }

  if (lines.length === 0) return null

  return {
    restaurantName: restaurant?.name ?? 'il ristorante',
    menuText: lines.join('\n'),
  }
}

export async function POST(req: NextRequest) {
  try {
    const rl = hitRateLimit(`chat:${getClientIp(req)}`, RATE_MAX, RATE_WINDOW_MS)
    if (rl.limited) {
      return NextResponse.json(
        { error: 'too_many_requests' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { message, lang, history, sessionId, restaurantId } = body as {
      message?: string
      lang?: Lang
      history?: ChatMessage[]
      sessionId?: string
      restaurantId?: string
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const detectedLang: Lang = lang === 'en' ? 'en' : 'it'
    const sid = sessionId || crypto.randomUUID()

    // Limitiamo sia il numero (ultimi 8) sia la lunghezza del contenuto di ogni
    // messaggio della cronologia, per non passare input arbitrariamente grandi all'LLM.
    const safeHistory: ChatMessage[] = (Array.isArray(history) ? history.slice(-8) : [])
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }))

    const messages: ChatMessage[] = [
      ...safeHistory,
      { role: 'user', content: message.slice(0, 1000) },
    ]

    // Salva messaggio utente
    await supabase.from('chat_logs').insert({
      session_id: sid,
      role: 'user',
      content: message.slice(0, 1000),
      lang: detectedLang,
    })

    let systemPrompt = SYSTEM_PROMPTS[detectedLang]
    if (restaurantId && typeof restaurantId === 'string') {
      try {
        const menuContext = await fetchMenuContext(restaurantId)
        if (menuContext) {
          systemPrompt = buildMenuSystemPrompt(detectedLang, menuContext.restaurantName, menuContext.menuText)
        }
      } catch (err) {
        console.error('[/api/chat] menu context fetch failed:', err)
      }
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        max_tokens: 512,
        temperature: 0.7,
      }),
    })

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content?.trim()

    if (!reply) {
      return NextResponse.json({ error: 'Empty response from model' }, { status: 502 })
    }

    // Salva risposta assistant
    await supabase.from('chat_logs').insert({
      session_id: sid,
      role: 'assistant',
      content: reply,
      lang: detectedLang,
    })

    return NextResponse.json({ reply, lang: detectedLang, sessionId: sid })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[/api/chat] error:', msg)
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
  }
}