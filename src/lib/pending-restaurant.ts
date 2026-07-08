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
