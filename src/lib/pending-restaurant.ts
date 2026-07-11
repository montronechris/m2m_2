// Holds the restaurant form data filled on /create while the user has no
// account yet. Persisted in sessionStorage only — lost if the tab closes
// or the browser session ends without completing signup, by design.

const KEY = 'tt-pending-restaurant'

export type PendingRestaurant = {
  name: string
  city: string
  logoIcon: string
  establishmentType: string
  establishmentTypeCustom: string
}

export function savePendingRestaurant(data: PendingRestaurant) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data))
  } catch {
    // sessionStorage unavailable — nothing we can do, form data just won't persist
  }
}

export function loadPendingRestaurant(): PendingRestaurant | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as PendingRestaurant
  } catch {
    return null
  }
}

export function clearPendingRestaurant() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

// ─── Menu file caricato allo step 2 di /create ───────────────────────────────
//
// Il file del menu (PDF/immagine, fino a 15MB) va conservato mentre l'utente
// senza account passa per la registrazione, così da importarlo dopo il login.
// sessionStorage non basta (limite ~5MB, e il base64 gonfia i dati del 33%):
// usiamo IndexedDB che memorizza il Blob nativamente e regge file grandi.

const DB_NAME = 'tt-pending'
const STORE_NAME = 'menu-file'
const FILE_KEY = 'pending-menu-file'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function savePendingMenuFile(file: File): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).put(file, FILE_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // IndexedDB non disponibile — il menu semplicemente non verrà importato in automatico.
  }
}

export async function loadPendingMenuFile(): Promise<File | null> {
  try {
    const db = await openDb()
    const file = await new Promise<File | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const getReq = tx.objectStore(STORE_NAME).get(FILE_KEY)
      getReq.onsuccess = () => resolve((getReq.result as File) ?? null)
      getReq.onerror = () => reject(getReq.error)
    })
    db.close()
    return file
  } catch {
    return null
  }
}

export async function clearPendingMenuFile(): Promise<void> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      tx.objectStore(STORE_NAME).delete(FILE_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => resolve()
    })
    db.close()
  } catch {
    // ignore
  }
}
