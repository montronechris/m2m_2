import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Lang } from '@/lib/i18n/dictionary'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { message, lang, history, sessionId } = body as {
      message?: string
      lang?: Lang
      history?: ChatMessage[]
      sessionId?: string
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const detectedLang: Lang = lang === 'en' ? 'en' : 'it'
    const sid = sessionId || crypto.randomUUID()

    const messages: ChatMessage[] = [
      ...(Array.isArray(history) ? history.slice(-8) : []),
      { role: 'user', content: message.slice(0, 1000) },
    ]

    // Salva messaggio utente
    await supabase.from('chat_logs').insert({
      session_id: sid,
      role: 'user',
      content: message.slice(0, 1000),
      lang: detectedLang,
    })

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS[detectedLang] },
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