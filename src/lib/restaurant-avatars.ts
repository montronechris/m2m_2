import {
  ChefHat,
  UtensilsCrossed,
  Pizza,
  Coffee,
  Beer,
  IceCream,
  Soup,
  Cake,
  Wine,
  Sandwich,
  Fish,
  type LucideIcon,
} from 'lucide-react'

export interface RestaurantAvatarOption {
  id: string
  label: string
  Icon: LucideIcon
}

export const restaurantAvatars: RestaurantAvatarOption[] = [
  { id: 'chef-hat', label: 'Chef', Icon: ChefHat },
  { id: 'utensils', label: 'Posate', Icon: UtensilsCrossed },
  { id: 'pizza', label: 'Pizza', Icon: Pizza },
  { id: 'coffee', label: 'Caffè', Icon: Coffee },
  { id: 'beer', label: 'Birra', Icon: Beer },
  { id: 'ice-cream', label: 'Gelato', Icon: IceCream },
  { id: 'soup', label: 'Zuppa', Icon: Soup },
  { id: 'cake', label: 'Dolci', Icon: Cake },
  { id: 'wine', label: 'Vino', Icon: Wine },
  { id: 'sandwich', label: 'Panino', Icon: Sandwich },
  { id: 'fish', label: 'Pesce', Icon: Fish },
]
