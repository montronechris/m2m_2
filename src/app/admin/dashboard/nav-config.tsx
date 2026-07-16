// src/app/admin/dashboard/nav-config.ts
import {
  Home,
  Category,
  Buy,
  Scan,
  Work,
  Graph,
  TimeCircle,
  TwoUsers,
  EditSquare,
  Star,
  Send,
} from 'react-iconly'
import type { SectionId } from './types'

function makeIcon(IconComponent: React.ComponentType<{ size?: number | string; set?: string; primaryColor?: string }>) {
  return function NavIcon({ isActive, color }: { isActive?: boolean; color?: string }) {
    return (
      <IconComponent
        size={22}
        set={isActive ? 'bold' : 'light'}
        primaryColor={isActive ? '#1a1a1a' : color ?? '#9ca3af'}
      />
    )
  }
}

export const NAV_ITEMS: {
  id: SectionId
  label: string
  icon: React.ComponentType<{ isActive?: boolean; className?: string; color?: string }>
}[] = [
  { id: 'dashboard', label: 'Home', icon: makeIcon(Home) },
  { id: 'menu', label: 'Menu', icon: makeIcon(Category) },
  { id: 'orders', label: 'Ordini', icon: makeIcon(Buy) },
  { id: 'delivery', label: 'Delivery', icon: makeIcon(Send) },
  { id: 'tables', label: 'Tavoli', icon: makeIcon(Scan) },
  { id: 'waiter', label: 'Camerieri', icon: makeIcon(Work) },
  { id: 'analytics', label: 'Analytics', icon: makeIcon(Graph) },
  { id: 'reviews', label: 'Recensioni', icon: makeIcon(Star) },
  { id: 'history', label: 'Cronologia', icon: makeIcon(TimeCircle) },
  { id: 'staff', label: 'Staff', icon: makeIcon(TwoUsers) },
  { id: 'branding', label: 'Branding', icon: makeIcon(EditSquare) },
]

export const ASSIGNABLE_SECTIONS: SectionId[] = [
  'menu',
  'orders',
  'tables',
  'waiter',
  'analytics',
]

export const DEFAULT_ROLE_PERMISSIONS: Record<
  string,
  { sections: SectionId[]; ai: boolean }
> = {
  cameriere: { sections: ['waiter'], ai: false },
  cucina: { sections: ['orders'], ai: false },
}

// Sezioni accessibili ai ruoli operativi (cameriere / cucina): ordini,
// camerieri, cronologia, menu, tavoli e impostazioni.
// NB: la sezione 'calendar' ("Presenze") è riservata a manager/admin — dove si
// generano i codici e si consultano le presenze. I ruoli operativi NON la
// vedono: timbrano la loro presenza dal pulsante "Presenza" nella navbar.
export const OPERATIONAL_ROLE_SECTIONS: SectionId[] = [
  'orders',
  'delivery',
  'waiter',
  'history',
  'menu',
  'tables',
  'settings',
]

/**
 * Ritorna l'elenco di sezioni visibili per un ruolo, oppure `null` se il ruolo
 * ha accesso completo (admin, titolare, manager).
 */
export function sectionsForRole(role: string | null | undefined): SectionId[] | null {
  const r = (role ?? '').toLowerCase()
  // I ruoli operativi (staff generico, camerieri e cucina) vedono solo un
  // sottoinsieme; manager, admin e titolare hanno accesso completo.
  if (r === 'staff' || r === 'cameriere' || r === 'cucina') return OPERATIONAL_ROLE_SECTIONS
  return null
}

export const WAITER_KITCHEN_GROUP_IDS: SectionId[] = [
  'waiter',
  'orders',
  'delivery',
  'history',
]
export const OPERATIONS_GROUP_IDS: SectionId[] = [
  'analytics',
  'reviews',
]
export const MANAGEMENT_GROUP_IDS: SectionId[] = [
  'tables',
  'menu',
  'staff',
  'branding',
]

/**
 * Colore d'accento per ogni sezione, assegnato in base al *tipo di pagina*
 * (il gruppo di appartenenza), così le icone del menu "Tutte le sezioni"
 * rispettano la categoria. Tinte prese dalla palette warm dell'admin theme:
 *  - Principale        → oro   (#B6794C)
 *  - Cameriere/Cucina  → salvia(#7E9472)
 *  - Operazioni        → ambra (#E0A020)
 *  - Gestione          → terracotta (#A04030)
 *  - Sistema           → neutro caldo (#9B8C79)
 */
export const SECTION_COLORS: Record<SectionId, string> = {
  dashboard: '#B6794C',
  orders:    '#7E9472',
  waiter:    '#7E9472',
  history:   '#7E9472',
  analytics: '#E0A020',
  reviews:   '#E0A020',
  tables:    '#A04030',
  menu:      '#A04030',
  staff:     '#A04030',
  branding:  '#A04030',
  settings:  '#9B8C79',
  calendar:  '#9B8C79',
  delivery:  '#C2703D',
}
