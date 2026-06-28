// src/components/admin/ui/StatusBadge.tsx

"use client";

type OrderStatus = "pending" | "confirmed" | "preparing" | "cooking" | "ready" | "served" | "delivered" | "cancelled" | "expired";


interface StatusBadgeProps {
  status: OrderStatus;
}

const styles: Record<OrderStatus, string> = {
  pending:   "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  confirmed: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  preparing: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  cooking:   "bg-blue-500/20 text-blue-400 border-blue-500/30",
  ready:     "bg-green-500/20 text-green-400 border-green-500/30",
  served:    "bg-green-500/20 text-green-400 border-green-500/30",
  delivered: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
  expired:   "bg-red-500/20 text-red-400 border-red-500/30",
};

const labels: Record<OrderStatus, string> = {
  pending:   "In attesa",
  confirmed: "Confermato",
  preparing: "In preparazione",
  cooking:   "In cottura",
  ready:     "Pronto",
  served:    "Servito",
  delivered: "Consegnato",
  cancelled: "Annullato",
  expired:   "Scaduto",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
