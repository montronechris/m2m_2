// src/app/admin/dashboard/types.ts
// Shared types for the m2m admin dashboard (mock, no Supabase).

export type SectionId =
  | 'dashboard'
  | 'orders'
  | 'menu'
  | 'tables'
  | 'analytics'
  | 'reviews'
  | 'staff'
  | 'branding'
  | 'waiter'
  | 'history'
  | 'calendar'
  | 'delivery'
  | 'settings'

export type ThemeMode = 'light' | 'dark'

export interface RolePermissions {
  sections: SectionId[]
  ai: boolean
}

export interface RestaurantCtx {
  restaurantId: string
  restaurantName: string
  logoUrl: string | null
  plan: string | null
  accessExpiresAt: string | null
  maxStaff: number | null
  userId: string
  userFirstName: string
  userLastName: string
  userAvatarUrl: string | null
  userEmail: string
  role: string
  rolePermissions: RolePermissions | null
}
