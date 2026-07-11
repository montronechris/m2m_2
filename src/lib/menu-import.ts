// Import condiviso del menu da un file (PDF/immagine).
//
// Stessa identica logica usata nella dashboard admin (MenuSection.tsx):
//   1) /api/menu/extract legge il file con l'AI e restituisce le voci;
//   2) createMenuCategory / createMenuItem salvano le voci sul ristorante.
//
// Centralizzata qui così i due punti d'ingresso — import inline alla creazione
// del ristorante (utente già loggato) e import differito dopo la registrazione
// (nuovo account) — si comportano esattamente allo stesso modo.

import { createMenuCategory, createMenuItem } from '@/lib/admin-service'

export type MenuImportResult = {
  /** Numero di piatti effettivamente salvati. */
  created: number
  /** Messaggio d'errore leggibile se l'import non è andato a buon fine. */
  error?: string
}

export async function importMenuFromFile(
  restaurantId: string,
  file: File,
): Promise<MenuImportResult> {
  try {
    const extractBody = new FormData()
    extractBody.append('file', file)
    const extractRes = await fetch('/api/menu/extract', { method: 'POST', body: extractBody })
    const extractData = await extractRes.json().catch(() => null)
    if (!extractRes.ok || !extractData) {
      return { created: 0, error: extractData?.error ?? 'Estrazione del menu non riuscita.' }
    }

    const rows: any[] = Array.isArray(extractData.items) ? extractData.items : []
    if (rows.length === 0) {
      return { created: 0, error: 'Nessun piatto leggibile trovato nel file.' }
    }
    if (rows.length > 500) rows.length = 500

    const categoryByName = new Map<string, any>()
    let created = 0
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] ?? {}
      const name = typeof row.name === 'string' ? row.name.trim() : ''
      if (!name) continue
      const priceValue = row.price_cents ?? row.price
      const priceCents =
        typeof row.price_cents === 'number'
          ? Math.round(row.price_cents)
          : Math.round(parseFloat(String(priceValue).replace(',', '.')) * 100)
      if (!priceValue || isNaN(priceCents) || priceCents < 0) continue

      let categoryId: string | null = null
      const categoryName = typeof row.category === 'string' ? row.category.trim() : ''
      if (categoryName) {
        const key = categoryName.toLowerCase()
        let cat = categoryByName.get(key)
        if (!cat) {
          try {
            cat = await createMenuCategory(restaurantId, categoryName, !!row.is_drink)
            categoryByName.set(key, cat)
          } catch (e) {
            console.error('[menu-import] Errore creazione categoria:', categoryName, e)
            cat = null
          }
        }
        categoryId = cat?.id ?? null
      }

      try {
        await createMenuItem({
          restaurant_id: restaurantId,
          category_id: categoryId as any,
          name,
          description: typeof row.description === 'string' ? row.description.trim() : '',
          price_cents: priceCents,
          is_available: true,
          is_vegetarian: !!row.is_vegetarian,
          is_gluten_free: !!row.is_gluten_free,
          allergens: Array.isArray(row.allergens)
            ? row.allergens.map((a: unknown) => String(a).trim()).filter(Boolean)
            : typeof row.allergens === 'string'
              ? row.allergens.split(',').map((a: string) => a.trim()).filter(Boolean)
              : [],
          image_url: null,
        } as any)
        created++
      } catch (e) {
        console.error('[menu-import] Errore creazione piatto:', name, e)
      }
    }

    if (created === 0) {
      return { created: 0, error: 'Il menu è stato letto ma nessun piatto è stato salvato correttamente. Riprova dalla dashboard.' }
    }
    return { created }
  } catch (e: any) {
    console.error('[menu-import] Estrazione/importazione fallita:', e)
    return { created: 0, error: e?.message ?? 'Non è stato possibile leggere il menu. Puoi caricarlo dalla dashboard.' }
  }
}
