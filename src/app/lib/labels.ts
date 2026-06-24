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

/** YYYY-MM-DD en zona horaria local del navegador (nunca UTC). */
export function localDateIso(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function todayIso(): string {
  return localDateIso(new Date());
}

export function startOfMonthIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Inicio/fin del día local como ISO UTC (ventas del API guardan dateIso en UTC). */
export function localDayStartUtcIso(dateOnly: string): string {
  if (!DATE_ONLY_RE.test(dateOnly)) return dateOnly;
  return new Date(`${dateOnly}T00:00:00`).toISOString();
}

export function localDayEndUtcIso(dateOnly: string): string {
  if (!DATE_ONLY_RE.test(dateOnly)) return dateOnly;
  return new Date(`${dateOnly}T23:59:59.999`).toISOString();
}

export function isIsoInRange(iso: string, fromDate: string, toDate: string): boolean {
  const t = new Date(iso).getTime();
  const from = new Date(`${fromDate}T00:00:00`).getTime();
  const to = new Date(`${toDate}T23:59:59.999`).getTime();
  return t >= from && t <= to;
}
