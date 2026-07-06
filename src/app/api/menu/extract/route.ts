import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const runtime = 'nodejs'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 15 * 1024 * 1024

const PROMPT = `Sei un estrattore di dati per menu di ristoranti. Ti verrà fornito un file (PDF o foto) contenente un menu.
Estrai OGNI piatto/bevanda elencato e restituisci SOLO un JSON array valido, senza testo aggiuntivo, markdown o commenti, nel seguente formato esatto:
[
  {
    "name": "string, obbligatorio",
    "description": "string, può essere vuota",
    "price": number in euro (es. 8.5), obbligatorio,
    "category": "string, nome categoria/sezione del menu (es. Antipasti, Primi, Pizze, Bevande), può essere vuota",
    "is_vegetarian": boolean,
    "is_gluten_free": boolean,
    "allergens": ["array di stringhe, allergeni o parole chiave se indicati nel menu, altrimenti array vuoto"]
  }
]
Se un prezzo non è leggibile o mancante per un piatto, ometti quel piatto dall'array invece di inventare un prezzo.
Non includere spiegazioni, solo il JSON array.`

function extractJsonArray(text: string): unknown {
  const cleaned = text.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim()
  return JSON.parse(cleaned)
}

async function extractWithGemini(bytes: Buffer, mimeType: string): Promise<unknown[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw Object.assign(new Error('GEMINI_NOT_CONFIGURED'), { code: 'GEMINI_NOT_CONFIGURED' })

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const result = await model.generateContent([
    PROMPT,
    { inlineData: { data: bytes.toString('base64'), mimeType } },
  ])

  const items = extractJsonArray(result.response.text())
  if (!Array.isArray(items)) throw new Error('NOT_AN_ARRAY')
  return items
}

async function extractWithGroq(bytes: Buffer, mimeType: string): Promise<unknown[]> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw Object.assign(new Error('GROQ_NOT_CONFIGURED'), { code: 'GROQ_NOT_CONFIGURED' })

  const dataUrl = `data:${mimeType};base64,${bytes.toString('base64')}`

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 4096,
    }),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw Object.assign(new Error(data?.error?.message ?? 'GROQ_REQUEST_FAILED'), { status: res.status })
  }
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('EMPTY_RESPONSE')

  const items = extractJsonArray(content)
  if (!Array.isArray(items)) throw new Error('NOT_AN_ARRAY')
  return items
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Nessun file ricevuto.' }, { status: 400 })
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Formato file non supportato. Usa PDF, JPG, PNG o WEBP.' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File troppo grande (massimo 15MB).' }, { status: 400 })
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  const isImage = file.type.startsWith('image/')

  try {
    const items = await extractWithGemini(bytes, file.type)
    return NextResponse.json({ items })
  } catch (geminiErr: any) {
    // Gemini free-tier quota exhausted (or unavailable in this region) — fall back to Groq vision, but only for images (Groq has no PDF support).
    if (isImage && process.env.GROQ_API_KEY) {
      try {
        const items = await extractWithGroq(bytes, file.type)
        return NextResponse.json({ items })
      } catch (groqErr: any) {
        return NextResponse.json(
          { error: groqErr.message ?? 'Errore durante l\'estrazione del menu (Groq).' },
          { status: 502 }
        )
      }
    }

    const status = geminiErr?.status === 429 || /429|quota/i.test(String(geminiErr?.message)) ? 429 : 502
    const msg =
      status === 429
        ? 'Quota Gemini esaurita per oggi/minuto. Riprova più tardi o attiva la fatturazione su Google AI Studio.'
        : geminiErr.message ?? 'Errore durante l\'estrazione del menu.'
    return NextResponse.json({ error: msg }, { status })
  }
}
