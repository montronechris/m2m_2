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
} from 'react-iconly'
import type { SectionId } from './types'

function makeIcon(IconComponent: React.ComponentType<{ size?: number | string; set?: string; primaryColor?: string }>) {
  return function NavIcon({ isActive }: { isActive?: boolean }) {
    return (
      <IconComponent
        size={22}
        set={isActive ? 'bold' : 'light'}
        primaryColor={isActive ? '#1a1a1a' : '#9ca3af'}
      />
    )
  }
}

export const NAV_ITEMS: {
  id: SectionId
  label: string
  icon: React.ComponentType<{ isActive?: boolean; className?: string }>
}[] = [
  { id: 'dashboard', label: 'Home', icon: makeIcon(Home) },
  { id: 'menu', label: 'Menu', icon: makeIcon(Category) },
  { id: 'orders', label: 'Ordini', icon: makeIcon(Buy) },
  { id: 'tables', label: 'Tavoli', icon: makeIcon(Scan) },
  { id: 'waiter', label: 'Camerieri', icon: makeIcon(Work) },
  { id: 'analytics', label: 'Analytics', icon: makeIcon(Graph) },
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

export const WAITER_KITCHEN_GROUP_IDS: SectionId[] = [
  'waiter',
  'orders',
  'history',
]
export const OPERATIONS_GROUP_IDS: SectionId[] = [
  'analytics',
]
export const MANAGEMENT_GROUP_IDS: SectionId[] = [
  'tables',
  'menu',
  'staff',
  'branding',
]
