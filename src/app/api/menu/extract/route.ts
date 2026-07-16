import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { extractText, getDocumentProxy, renderPageAsImage } from 'unpdf'
import { requireActiveStaff } from '@/lib/auth/requireActiveStaff'

export const runtime = 'nodejs'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 15 * 1024 * 1024
// Sotto questa soglia di testo estratto consideriamo il PDF "scansionato" (senza testo reale) e passiamo alla vision.
const MIN_PDF_TEXT_LENGTH = 40

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

/**
 * Estrae il primo JSON array valido dal testo di risposta di un LLM.
 * Tollera code fence markdown e testo "di contorno" attorno all'array.
 */
function extractJsonArray(text: string): unknown[] {
  const cleaned = text.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim()
  // Prova il parse diretto; se fallisce, isola il primo blocco [ ... ].
  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed)) return parsed
  } catch {
    /* continua con la ricerca del blocco array */
  }
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  if (start !== -1 && end > start) {
    const parsed = JSON.parse(cleaned.slice(start, end + 1))
    if (Array.isArray(parsed)) return parsed
  }
  throw new Error('NOT_AN_ARRAY')
}

/** Estrazione testo da PDF, in locale: gratuita e senza limiti (nessuna API esterna). */
async function extractPdfText(bytes: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes))
  const { text } = await extractText(pdf, { mergePages: true })
  return (Array.isArray(text) ? text.join('\n') : text).trim()
}

/** Groq – modello di TESTO (limiti free molto alti, velocissimo). Usato quando abbiamo già il testo del menu. */
async function extractWithGroqText(menuText: string): Promise<unknown[]> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw Object.assign(new Error('GROQ_NOT_CONFIGURED'), { code: 'GROQ_NOT_CONFIGURED' })

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: PROMPT },
        { role: 'user', content: `Ecco il testo del menu:\n\n${menuText}` },
      ],
      temperature: 0.1,
      max_tokens: 8192,
    }),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok) {
    throw Object.assign(new Error(data?.error?.message ?? 'GROQ_TEXT_REQUEST_FAILED'), { status: res.status })
  }
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('EMPTY_RESPONSE')
  return extractJsonArray(content)
}

/** Massimo di pagine PDF da rasterizzare come fallback vision (limita costi/tempo). */
const MAX_PDF_VISION_PAGES = 6

/** Groq – modello VISION su una singola immagine (data URL base64). */
async function groqVisionFromDataUrl(dataUrl: string): Promise<unknown[]> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw Object.assign(new Error('GROQ_NOT_CONFIGURED'), { code: 'GROQ_NOT_CONFIGURED' })

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
  return extractJsonArray(content)
}

/** Groq – modello VISION (per immagini/foto del menu). */
async function extractWithGroqVision(bytes: Buffer, mimeType: string): Promise<unknown[]> {
  const dataUrl = `data:${mimeType};base64,${bytes.toString('base64')}`
  return groqVisionFromDataUrl(dataUrl)
}

/**
 * Fallback per PDF scansionati quando Gemini non è disponibile: rasterizza le
 * pagine del PDF in PNG (unpdf + @napi-rs/canvas) e le passa a Groq vision,
 * unendo i piatti estratti da ogni pagina.
 */
async function extractWithGroqVisionFromPdf(bytes: Buffer): Promise<unknown[]> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw Object.assign(new Error('GROQ_NOT_CONFIGURED'), { code: 'GROQ_NOT_CONFIGURED' })

  const pdf = await getDocumentProxy(new Uint8Array(bytes))
  const pageCount = Math.min(pdf.numPages, MAX_PDF_VISION_PAGES)

  const all: unknown[] = []
  const pageErrors: string[] = []
  for (let page = 1; page <= pageCount; page++) {
    try {
      const dataUrl = (await renderPageAsImage(new Uint8Array(bytes), page, {
        scale: 2,
        canvasImport: () => import('@napi-rs/canvas'),
        toDataURL: true,
      })) as string
      const items = await groqVisionFromDataUrl(dataUrl)
      if (Array.isArray(items)) all.push(...items)
    } catch (e: any) {
      pageErrors.push(`p${page}: ${e?.message ?? 'errore'}`)
      // Se Groq è a sua volta a corto di quota, non ha senso insistere sulle altre pagine.
      if (isQuotaError(e)) throw e
    }
  }

  if (all.length === 0) {
    throw new Error(pageErrors.length ? `GROQ_PDF_VISION_EMPTY (${pageErrors.join('; ')})` : 'GROQ_PDF_VISION_EMPTY')
  }
  return all
}

/** Gemini vision – accetta sia immagini che PDF nativamente. */
async function extractWithGemini(bytes: Buffer, mimeType: string): Promise<unknown[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw Object.assign(new Error('GEMINI_NOT_CONFIGURED'), { code: 'GEMINI_NOT_CONFIGURED' })

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const result = await model.generateContent([
    PROMPT,
    { inlineData: { data: bytes.toString('base64'), mimeType } },
  ])

  return extractJsonArray(result.response.text())
}

function isQuotaError(err: any): boolean {
  return err?.status === 429 || /429|quota|rate limit/i.test(String(err?.message))
}

export async function POST(req: NextRequest) {
  const auth = await requireActiveStaff()
  if ('error' in auth) {
    if (auth.error === 'inactive') {
      return NextResponse.json(
        { error: 'Abbonamento scaduto o account sospeso' },
        { status: 402 }
      )
    }
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 })
  }

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
  const isPdf = file.type === 'application/pdf'

  // Errori accumulati lungo la catena, per un messaggio finale utile.
  const errors: string[] = []

  // ---- PDF: prima estrazione testo locale (gratis/illimitata) + Groq testo, poi fallback Gemini vision ----
  if (isPdf) {
    let menuText = ''
    try {
      menuText = await extractPdfText(bytes)
    } catch (e: any) {
      errors.push(`PDF parsing: ${e?.message ?? 'errore'}`)
    }

    if (menuText.length >= MIN_PDF_TEXT_LENGTH) {
      // 1) Groq testo — nessun consumo di quota Gemini, limiti free alti.
      try {
        const items = await extractWithGroqText(menuText)
        return NextResponse.json({ items, source: 'groq-text' })
      } catch (e: any) {
        errors.push(`Groq testo: ${e?.message ?? 'errore'}`)
      }
    }

    // 2) Fallback: Gemini vision sul PDF (gestisce anche i PDF scansionati/immagine).
    try {
      const items = await extractWithGemini(bytes, file.type)
      return NextResponse.json({ items, source: 'gemini' })
    } catch (e: any) {
      errors.push(`Gemini: ${e?.message ?? 'errore'}`)
    }

    // 3) Fallback finale: rasterizza il PDF in immagini e usa Groq vision. Copre
    // i PDF scansionati anche quando la quota Gemini è esaurita.
    if (process.env.GROQ_API_KEY) {
      try {
        const items = await extractWithGroqVisionFromPdf(bytes)
        return NextResponse.json({ items, source: 'groq-pdf-vision' })
      } catch (e: any) {
        errors.push(`Groq PDF vision: ${e?.message ?? 'errore'}`)
      }
    }

    // Tutti i tentativi falliti: messaggio in base alla causa più probabile.
    const quota = errors.some((m) => /429|quota|rate limit/i.test(m))
    const msg = quota
      ? 'Quota AI temporaneamente esaurita. Riprova tra qualche minuto, oppure esporta il menu come immagine (JPG/PNG) e ricaricalo.'
      : 'Impossibile leggere questo PDF. Se è una scansione, prova a caricarlo come immagine (JPG/PNG).'
    return NextResponse.json({ error: msg, details: errors }, { status: quota ? 429 : 502 })
  }

  // ---- Immagini: Gemini vision, poi fallback Groq vision ----
  try {
    const items = await extractWithGemini(bytes, file.type)
    return NextResponse.json({ items, source: 'gemini' })
  } catch (geminiErr: any) {
    errors.push(`Gemini: ${geminiErr?.message ?? 'errore'}`)
    if (process.env.GROQ_API_KEY) {
      try {
        const items = await extractWithGroqVision(bytes, file.type)
        return NextResponse.json({ items, source: 'groq-vision' })
      } catch (groqErr: any) {
        errors.push(`Groq vision: ${groqErr?.message ?? 'errore'}`)
      }
    }

    const quota = isQuotaError(geminiErr)
    const msg = quota
      ? 'Quota AI temporaneamente esaurita. Riprova tra qualche minuto.'
      : "Errore durante l'estrazione del menu dall'immagine."
    return NextResponse.json({ error: msg, details: errors }, { status: quota ? 429 : 502 })
  }
}
