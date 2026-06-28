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
  it: `Sei l'assistente virtuale di m2m...`,
  en: `You are the virtual assistant of m2m...`,
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