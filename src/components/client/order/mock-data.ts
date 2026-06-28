import type { MenuItem } from '@/components/client/order/MenuItemCard'

export interface MockCategory {
  id: string
  name: string
  emoji?: string
  is_drink?: boolean
}

export interface MockRestaurant {
  id: string
  name: string
  brand_color: string
  logo_url: string | null
  address: string | null
  phone: string | null
  instagram: string | null
  facebook: string | null
  tripadvisor: string | null
  website: string | null
  tableNumber: number
  tableCode: string | null
}

export const MOCK_RESTAURANT: MockRestaurant = {
  id: 'rest-casa-bistro',
  name: 'La Casa Bistro',
  brand_color: '#d97706',
  logo_url: null,
  address: 'Via del Gusto 12, Firenze',
  phone: '+39 055 123 4567',
  instagram: 'lacasa.bistro',
  facebook: 'lacasa.bistro',
  tripadvisor: null,
  website: 'https://lacasa.example',
  tableNumber: 7,
  tableCode: 'TERR-HRVU',
}

export const MOCK_CATEGORIES: MockCategory[] = [
  { id: 'antipasti', name: 'Antipasti', emoji: '🥗' },
  { id: 'primi', name: 'Primi', emoji: '🍝' },
  { id: 'secondi', name: 'Secondi', emoji: '🥩' },
  { id: 'dolci', name: 'Dolci', emoji: '🍰' },
  { id: 'bevande', name: 'Bevande', emoji: '🍷', is_drink: true },
]

export const MOCK_ITEMS: MenuItem[] = [
  {
    id: 'burrata',
    name: 'Burrata Pugliese',
    description: 'Burrata cremosa, pomodorini confit, basilico e olio EVO',
    price_cents: 1200,
    is_vegetarian: true,
    is_gluten_free: true,
    ingredients: ['Burrata', 'Pomodorini', 'Basilico', 'Olio EVO', 'Sale di Maldon'],
    allergens: ['Latte'],
    story: 'La nostra burrata arriva ogni mattina direttamente da Andria, in Puglia. La serviamo semplicemente con pomodorini confit e basilico dell\'orto per esaltarne la freschezza.',
    category_id: 'antipasti',
  },
  {
    id: 'tartare',
    name: 'Tartare di Manzo',
    description: 'Manzo Piemontese al coltello, tuorlo, capperi, senape',
    price_cents: 1600,
    is_gluten_free: true,
    ingredients: ['Manzo Fassona', 'Tuorlo', 'Capperi', 'Senape di Digione', 'Scalogno'],
    allergens: ['Uova', 'Senape'],
    story: 'Prepariamo la tartare al momento, tagliando a coltello il manzo Fassona Piemontese. La condiscono tuorlo biologico, capperi di Pantelleria e senape di Digione.',
    category_id: 'antipasti',
  },
  {
    id: 'tagliatelle',
    name: 'Tagliatelle al Tartufo',
    description: 'Pasta fresca all\'uovo, tartufo nero, burro, parmigiano',
    price_cents: 1600,
    is_vegetarian: true,
    ingredients: ['Tagliatelle all\'uovo', 'Tartufo nero', 'Burro', 'Parmigiano Reggiano 24m'],
    allergens: ['Glutine', 'Uova', 'Latte'],
    story: 'Le tagliatelle sono tirate a mano ogni mattina. D\'inverno le serviamo con tartufo nero pregiato dei nostri boschi, d\'estate con un ragù lento di 8 ore.',
    category_id: 'primi',
  },
  {
    id: 'carbonara',
    name: 'Carbonara Romana',
    description: 'Guanciale, pecorino romano, tuorlo, pepe nero',
    price_cents: 1400,
    ingredients: ['Spaghetti', 'Guanciale', 'Pecorino Romano', 'Tuorlo', 'Pepe nero'],
    allergens: ['Glutine', 'Uova', 'Latte'],
    story: 'La ricetta della tradizione romana, senza panna: solo guanciale croccante, pecorino DOP, tuorlo e abbondante pepe nero macinato al momento.',
    category_id: 'primi',
  },
  {
    id: 'tagliata',
    name: 'Tagliata di Manzo',
    description: 'Rucola, scaglie di grana, riduzione al balsamico',
    price_cents: 2000,
    is_gluten_free: true,
    ingredients: ['Controfiletto', 'Rucola', 'Grana 24m', 'Balsamico invecchiato'],
    allergens: ['Latte'],
    story: 'Controfiletto di manzo italiano fiammeggiato alla brace, affettato sottile e servito su un letto di rucola con scaglie di grana e riduzione di balsamico 10 anni.',
    category_id: 'secondi',
  },
  {
    id: 'branzino',
    name: 'Branzino al Sale',
    description: 'Branzino selvaggio, patate al rosmarino',
    price_cents: 2400,
    is_gluten_free: true,
    ingredients: ['Branzino selvaggio', 'Patate', 'Rosmarino', 'Aglio', 'Olio EVO'],
    allergens: ['Pesce'],
    story: 'Branzino pescato nel Tirreno, cotto in crosta di sale marino per mantenere tutta la morbidezza delle carni. Servito con patate al forno al rosmarino.',
    category_id: 'secondi',
  },
  {
    id: 'tiramisu',
    name: 'Tiramisù della Nonna',
    description: 'Savoiardi, mascarpone, caffè, cacao',
    price_cents: 700,
    is_vegetarian: true,
    ingredients: ['Savoiardi', 'Mascarpone', 'Uova', 'Caffè', 'Cacao'],
    allergens: ['Glutine', 'Uova', 'Latte'],
    story: 'La ricetta segreta della nonna del nostro chef: crema al mascarpone montata a mano, savoiardi inzuppati nel caffè e una spolverata di cacao amaro.',
    category_id: 'dolci',
  },
  {
    id: 'pannacotta',
    name: 'Panna Cotta',
    description: 'Coulis di frutti di bosco, vaniglia Bourbon',
    price_cents: 600,
    is_vegetarian: true,
    is_gluten_free: true,
    ingredients: ['Panna', 'Zucchero', 'Vaniglia Bourbon', 'Frutti di bosco'],
    allergens: ['Latte'],
    story: 'Panna cotta leggera profumata alla vaniglia Bourbon del Madagascar, servuta con coulis di frutti di bosco freschi.',
    category_id: 'dolci',
  },
  {
    id: 'chianti',
    name: 'Chianti Classico DOCG',
    description: 'Bicchiere 15cl — Sangiovese in purezza',
    price_cents: 800,
    is_vegan: true,
    is_gluten_free: true,
    ingredients: ['Sangiovese 100%'],
    allergens: ['Solfiti'],
    story: 'Dal vigneto a pochi chilometri da noi, un Chianti Classico DOCG affinato in botte. Profumo di viola e ciliegia, tannini setosi.',
    category_id: 'bevande',
  },
  {
    id: 'acqua',
    name: 'Acqua Naturale 75cl',
    description: 'Oligominerale, fresca',
    price_cents: 300,
    is_vegan: true,
    is_gluten_free: true,
    ingredients: ['Acqua oligominerale'],
    category_id: 'bevande',
  },
]
