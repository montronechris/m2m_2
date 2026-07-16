import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hitRateLimit, getClientIp } from '@/lib/rate-limit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// H2: limiti anti-abuso su un endpoint pubblico che invoca un LLM a pagamento
// (Groq) e scrive su DB con service-role. Senza questi cap chiunque potrebbe
// generare costi arbitrari e inquinare `ingredient_translations`.
const MAX_TEXTS = 100 // stringhe per richiesta
const MAX_TEXT_LEN = 400 // caratteri per stringa
const RATE_MAX = 30 // richieste per finestra
const RATE_WINDOW_MS = 60 * 1000 // finestra di 1 minuto per IP

type Body = {
  texts: string[]
  sourceLang?: string
  targetLang: string
}

export async function POST(req: Request) {
  try {
    const rl = hitRateLimit(`translate:${getClientIp(req)}`, RATE_MAX, RATE_WINDOW_MS)
    if (rl.limited) {
      return NextResponse.json(
        { error: 'too_many_requests' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      )
    }

    const { texts, sourceLang = 'it', targetLang } = (await req.json()) as Body

    if (!Array.isArray(texts) || !targetLang) {
      return NextResponse.json({ error: 'invalid body' }, { status: 400 })
    }
    if (typeof targetLang !== 'string' || targetLang.length > 8 || sourceLang.length > 8) {
      return NextResponse.json({ error: 'invalid lang' }, { status: 400 })
    }
    if (texts.length > MAX_TEXTS) {
      return NextResponse.json({ error: 'too_many_texts', max: MAX_TEXTS }, { status: 413 })
    }
    if (texts.some((t) => typeof t === 'string' && t.length > MAX_TEXT_LEN)) {
      return NextResponse.json({ error: 'text_too_long', max: MAX_TEXT_LEN }, { status: 413 })
    }
    if (sourceLang === targetLang) {
      return NextResponse.json({ translations: Object.fromEntries(texts.map((t) => [t, t])) })
    }

    const unique = Array.from(new Set(texts.filter((t) => typeof t === 'string' && t.trim())))
    if (unique.length === 0) {
      return NextResponse.json({ translations: {} })
    }

    const { data: cached } = await supabase
      .from('ingredient_translations')
      .select('source_text, translated_text')
      .eq('source_lang', sourceLang)
      .eq('target_lang', targetLang)
      .in('source_text', unique)

    const map = new Map<string, string>()
    for (const row of cached ?? []) map.set(row.source_text, row.translated_text)

    const missing = unique.filter((t) => !map.has(t))

    if (missing.length > 0) {
      const prompt = `Translate the following restaurant-menu strings from ${sourceLang.toUpperCase()} to ${targetLang.toUpperCase()}.
They may be single ingredients ("pomodoro" -> "tomato"), dish names ("Amatriciana" -> "Amatriciana"; keep proper Italian dish names untranslated), or short descriptions ("Sugo di pomodoro e guanciale" -> "Tomato and guanciale sauce").
Rules:
- Preserve original for well-known Italian dish names (Amatriciana, Carbonara, Tiramisù, etc.).
- Natural, concise menu-style English. No quotes, no explanations.
- Output MUST be a JSON object of shape {"translations": string[]} matching input order and length.
Input: ${JSON.stringify(missing)}`

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'You are a culinary translator. Respond with a JSON object of shape {"translations": string[]} matching the input array order.',
            },
            { role: 'user', content: prompt },
          ],
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        return NextResponse.json(
          { error: 'translation provider failed', detail: errText },
          { status: 502 }
        )
      }

      const json = await res.json()
      const raw = json.choices?.[0]?.message?.content ?? '{}'
      let translated: string[] = []
      try {
        const parsed = JSON.parse(raw)
        translated = Array.isArray(parsed) ? parsed : parsed.translations ?? []
      } catch {
        translated = []
      }

      const rows: {
        source_lang: string
        target_lang: string
        source_text: string
        translated_text: string
      }[] = []
      missing.forEach((src, i) => {
        const tgt = translated[i]
        if (typeof tgt === 'string' && tgt.trim()) {
          map.set(src, tgt)
          rows.push({
            source_lang: sourceLang,
            target_lang: targetLang,
            source_text: src,
            translated_text: tgt,
          })
        } else {
          map.set(src, src)
        }
      })

      if (rows.length > 0) {
        await supabase
          .from('ingredient_translations')
          .upsert(rows, { onConflict: 'source_lang,target_lang,source_text' })
      }
    }

    const translations: Record<string, string> = {}
    for (const t of texts) translations[t] = map.get(t) ?? t

    return NextResponse.json({ translations })
  } catch (e) {
    return NextResponse.json({ error: 'internal', detail: String(e) }, { status: 500 })
  }
}
