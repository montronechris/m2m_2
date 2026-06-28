// src/lib/check-access.ts

export function isRestaurantActive(restaurant: {
  status?: string | null
  access_expires_at?: string | null
} | null): boolean {
  if (!restaurant) return false
  if (restaurant.status === 'paused') return false
  if (restaurant.access_expires_at) {
    const expired = new Date(restaurant.access_expires_at) < new Date()
    if (expired) return false
  }
  return true
}
