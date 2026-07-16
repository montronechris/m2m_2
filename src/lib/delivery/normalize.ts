// Normalizzazione ordini in arrivo dalle piattaforme delivery.
// Ogni piattaforma invia un payload diverso: qui lo mappiamo in uno schema
// canonico unico (external_orders) usato da tutto il resto dell'app.

export type DeliveryPlatform =
  | "glovo"
  | "deliveroo"
  | "ubereats"
  | "justeat"
  | "other";

export const DELIVERY_PLATFORMS: DeliveryPlatform[] = [
  "glovo",
  "deliveroo",
  "ubereats",
  "justeat",
  "other",
];

export interface NormalizedOrderItem {
  name: string;
  quantity: number;
  price: number | null;
  notes?: string | null;
  options?: string[];
}

export interface NormalizedOrder {
  platform: DeliveryPlatform;
  externalId: string | null;
  orderType: "delivery" | "pickup";
  customerName: string | null;
  customerPhone: string | null;
  deliveryAddress: string | null;
  items: NormalizedOrderItem[];
  subtotal: number | null;
  deliveryFee: number | null;
  total: number | null;
  currency: string;
  notes: string | null;
  placedAt: string; // ISO
  estimatedAt: string | null; // ISO
}

function num(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  return Number.isFinite(n) ? n : null;
}

function str(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

function firstDefined<T>(...vals: T[]): T | undefined {
  return vals.find((v) => v !== undefined && v !== null);
}

// Estrae gli item da forme diverse (array di oggetti con chiavi variabili).
function normalizeItems(raw: unknown): NormalizedOrderItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((it: Record<string, unknown>) => {
    const options = Array.isArray(it.options)
      ? (it.options as unknown[])
          .map((o) =>
            typeof o === "string"
              ? o
              : str((o as Record<string, unknown>)?.name),
          )
          .filter((o): o is string => !!o)
      : undefined;
    return {
      name:
        str(firstDefined(it.name, it.title, it.product_name, it.item_name)) ??
        "Articolo",
      quantity: num(firstDefined(it.quantity, it.qty, it.count)) ?? 1,
      price: num(firstDefined(it.price, it.unit_price, it.amount, it.total)),
      notes: str(firstDefined(it.notes, it.note, it.special_instructions)),
      options,
    };
  });
}

// Adapter generico: gestisce le forme più comuni dei payload reali.
// Le piattaforme reali richiedono accordi partner; questo mapping copre
// i campi tipici e degrada in modo sicuro su chiavi mancanti.
export function normalizeOrder(
  platform: DeliveryPlatform,
  payload: Record<string, unknown>,
): NormalizedOrder {
  const p = payload ?? {};
  const customer = (p.customer ?? p.client ?? {}) as Record<string, unknown>;
  const delivery = (p.delivery ?? p.dropoff ?? {}) as Record<string, unknown>;
  const totals = (p.totals ?? p.pricing ?? p) as Record<string, unknown>;

  const orderTypeRaw = str(
    firstDefined(p.order_type, p.type, p.fulfilment_type),
  )?.toLowerCase();
  const orderType: "delivery" | "pickup" =
    orderTypeRaw === "pickup" || orderTypeRaw === "collection"
      ? "pickup"
      : "delivery";

  return {
    platform,
    externalId: str(
      firstDefined(p.id, p.order_id, p.orderId, p.reference, p.code),
    ),
    orderType,
    customerName: str(
      firstDefined(customer.name, customer.full_name, p.customer_name),
    ),
    customerPhone: str(
      firstDefined(customer.phone, customer.phone_number, p.customer_phone),
    ),
    deliveryAddress: str(
      firstDefined(
        delivery.address,
        delivery.formatted_address,
        p.delivery_address,
        p.address,
      ),
    ),
    items: normalizeItems(firstDefined(p.items, p.products, p.lines) ?? []),
    subtotal: num(firstDefined(totals.subtotal, totals.sub_total, p.subtotal)),
    deliveryFee: num(
      firstDefined(totals.delivery_fee, totals.deliveryFee, p.delivery_fee),
    ),
    total: num(firstDefined(totals.total, totals.grand_total, p.total)),
    currency: str(firstDefined(p.currency, totals.currency)) ?? "EUR",
    notes: str(firstDefined(p.notes, p.note, p.comment, p.instructions)),
    placedAt:
      str(firstDefined(p.placed_at, p.created_at, p.time)) ??
      new Date().toISOString(),
    estimatedAt: str(
      firstDefined(p.estimated_at, p.estimated_delivery_time, p.eta),
    ),
  };
}

// ── Simulatore: genera un ordine finto realistico per piattaforma ────────────

const SAMPLE_NAMES = [
  "Marco Rossi",
  "Giulia Bianchi",
  "Luca Verdi",
  "Sara Conti",
  "Andrea Ferrari",
  "Elena Greco",
];
const SAMPLE_STREETS = [
  "Via Roma 12",
  "Corso Italia 45",
  "Via Garibaldi 8",
  "Piazza Duomo 3",
  "Via Milano 27",
];
const SAMPLE_CITIES = ["Milano", "Roma", "Torino", "Bologna", "Firenze"];
const SAMPLE_DISHES = [
  { name: "Margherita", price: 7.5 },
  { name: "Diavola", price: 9.0 },
  { name: "Carbonara", price: 11.0 },
  { name: "Insalata Caesar", price: 8.5 },
  { name: "Tiramisù", price: 5.0 },
  { name: "Coca-Cola 33cl", price: 3.0 },
  { name: "Acqua 50cl", price: 1.5 },
  { name: "Patatine fritte", price: 4.5 },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Produce un payload "grezzo" nello stile di una piattaforma: verrà spedito
// al webhook reale e quindi ripassato dentro normalizeOrder — così il
// simulatore esercita l'intera pipeline di ingestione.
export function buildSamplePayload(
  platform: DeliveryPlatform,
): Record<string, unknown> {
  const nItems = randInt(1, 4);
  const items = Array.from({ length: nItems }).map(() => {
    const dish = pick(SAMPLE_DISHES);
    const qty = randInt(1, 3);
    return {
      name: dish.name,
      quantity: qty,
      price: dish.price,
      total: round2(dish.price * qty),
    };
  });
  const subtotal = round2(
    items.reduce((s, it) => s + (it.total as number), 0),
  );
  const deliveryFee = pick([0, 1.5, 2.5, 2.9]);
  const total = round2(subtotal + deliveryFee);
  const isPickup = Math.random() < 0.2;
  const now = Date.now();

  return {
    id: `${platform.toUpperCase()}-${now.toString(36)}-${randInt(100, 999)}`,
    order_type: isPickup ? "pickup" : "delivery",
    customer: {
      name: pick(SAMPLE_NAMES),
      phone: `+39 3${randInt(10, 99)} ${randInt(100, 999)}${randInt(1000, 9999)}`,
    },
    delivery: isPickup
      ? {}
      : { address: `${pick(SAMPLE_STREETS)}, ${pick(SAMPLE_CITIES)}` },
    items,
    totals: { subtotal, delivery_fee: deliveryFee, total, currency: "EUR" },
    notes: Math.random() < 0.4 ? "Citofonare, senza cipolla" : null,
    placed_at: new Date(now).toISOString(),
    estimated_at: new Date(now + randInt(20, 45) * 60000).toISOString(),
  };
}
