/** Etiquetas en español para la UI operativa. */

export const ACTIVITY = {
  MEMBER_CHECKIN: "Acceso",
  CARRITO_COMPRAS: "Carrito de compras",
  MEMBERSHIP_PAYMENT: "Pago de membresía",
} as const;

export function formatActivityType(action: string): string {
  if (action in ACTIVITY) return ACTIVITY[action as keyof typeof ACTIVITY];
  return action.replace(/_/g, " ");
}

export const PAYMENT_METHOD: Record<string, string> = {
  CARD: "Tarjeta",
  CASH: "Efectivo",
  QR: "QR",
};

export const MEMBERSHIP_CONCEPT: Record<string, string> = {
  MEMBERSHIP: "Membresía",
  RENEWAL: "Renovación",
  OTHER: "Otro",
};

export const ACCESS_RESULT: Record<string, string> = {
  GRANTED: "Permitido",
  DENIED: "Denegado",
};

export const PRODUCT_CATEGORY: Record<string, string> = {
  ALL: "Todos",
  SUPPLEMENTS: "Suplementos",
  GEAR: "Ropa",
  ACCESSORIES: "Accesorios",
};

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function startOfMonthIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function isIsoInRange(iso: string, fromDate: string, toDate: string): boolean {
  const t = new Date(iso).getTime();
  const from = new Date(`${fromDate}T00:00:00`).getTime();
  const to = new Date(`${toDate}T23:59:59.999`).getTime();
  return t >= from && t <= to;
}
