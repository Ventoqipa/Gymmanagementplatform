import {
  getPosSalesInRange as queryPosSalesInRange,
  loadPosSales,
} from "@/features/pos";
import type { PosSale } from "@/features/pos";
import { getAccessLog, getMembershipPayments } from "./demoStore";
import { ACTIVITY, isIsoInRange } from "./labels";
import { getActiveMembersCount, loadMembers } from "./membersStore";

export function getPosSalesInRange(fromDate: string, toDate: string): PosSale[] {
  return queryPosSalesInRange(fromDate, toDate);
}

export function getPosSalesTodaySync(): PosSale[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return loadPosSales()
    .filter((s) => new Date(s.dateIso) >= start)
    .sort((a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime());
}

function membershipRevenueToday(): { total: number; transactions: number } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const payments = getMembershipPayments().filter(
    (p) => new Date(p.dateIso) >= start,
  );
  return {
    total: payments.reduce((a, p) => a + p.amount, 0),
    transactions: payments.length,
  };
}

/** Ingresos del día: pagos de membresía (local) + ventas POS (API o caché). */
export function buildRevenueToday(posSales: PosSale[]): {
  total: number;
  transactions: number;
} {
  const membership = membershipRevenueToday();
  const posTotal = posSales.reduce((a, s) => a + s.total, 0);
  return {
    total: membership.total + posTotal,
    transactions: membership.transactions + posSales.length,
  };
}

/** @deprecated Usar buildRevenueToday con ventas del POS API. */
export function getRevenueToday(): { total: number; transactions: number } {
  return buildRevenueToday(getPosSalesTodaySync());
}

export function getDailyCheckIns(): number {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return getAccessLog().filter(
    (e) =>
      e.result === "GRANTED" && new Date(e.timestampIso) >= start,
  ).length;
}

export function getPeakHoursSlots(): { time: string; value: number; label: string }[] {
  const buckets = [
    { time: "05:00-07:00", label: "Mañana", start: 5, end: 7 },
    { time: "12:00-14:00", label: "Mediodía", start: 12, end: 14 },
    { time: "17:00-20:00", label: "Tarde-noche", start: 17, end: 20 },
    { time: "20:00-22:00", label: "Noche", start: 20, end: 22 },
  ];
  const granted = getAccessLog().filter((e) => e.result === "GRANTED");
  const maxInBucket = Math.max(
    1,
    ...buckets.map((b) => {
      return granted.filter((e) => {
        const h = new Date(e.timestampIso).getHours();
        return h >= b.start && h < b.end;
      }).length;
    }),
  );
  return buckets.map((b) => {
    const count = granted.filter((e) => {
      const h = new Date(e.timestampIso).getHours();
      return h >= b.start && h < b.end;
    }).length;
    return {
      time: b.time,
      label: b.label,
      value: Math.round((count / maxInBucket) * 100),
    };
  });
}

export type ActivityRow = {
  action: string;
  name: string;
  time: string;
  tier: string;
  sortKey: number;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days} d`;
}

export function buildRecentActivity(
  posSales: PosSale[],
  limit = 8,
): ActivityRow[] {
  const rows: ActivityRow[] = [];

  for (const e of getAccessLog().slice(0, 20)) {
    if (e.result !== "GRANTED") continue;
    rows.push({
      action: ACTIVITY.MEMBER_CHECKIN,
      name: e.memberName,
      tier: e.tier,
      time: relativeTime(e.timestampIso),
      sortKey: new Date(e.timestampIso).getTime(),
    });
  }

  for (const s of posSales.slice(0, 10)) {
    rows.push({
      action: ACTIVITY.CARRITO_COMPRAS,
      name: s.memberName ?? s.linesSummary.slice(0, 40),
      tier: s.method,
      time: relativeTime(s.dateIso),
      sortKey: new Date(s.dateIso).getTime(),
    });
  }

  const payments = getMembershipPayments().slice(0, 10);
  for (const p of payments) {
    rows.push({
      action: ACTIVITY.MEMBERSHIP_PAYMENT,
      name: p.memberId,
      tier: p.concept,
      time: relativeTime(p.dateIso),
      sortKey: new Date(p.dateIso).getTime(),
    });
  }

  return rows
    .sort((a, b) => b.sortKey - a.sortKey)
    .slice(0, limit);
}

/** @deprecated Usar buildRecentActivity con ventas del POS API. */
export function getRecentActivity(limit = 8): ActivityRow[] {
  return buildRecentActivity(getPosSalesTodaySync(), limit);
}

export function computeTopProducts(
  limit = 5,
  fromDate?: string,
  toDate?: string,
  salesSource?: PosSale[],
): {
  name: string;
  sales: number;
  units: number;
}[] {
  const sales =
    salesSource ??
    (fromDate && toDate
      ? getPosSalesInRange(fromDate, toDate)
      : loadPosSales());
  const map = new Map<string, { name: string; sales: number; units: number }>();
  for (const sale of sales) {
    for (const line of sale.lines ?? []) {
      const prev = map.get(line.productId) ?? {
        name: line.name,
        sales: 0,
        units: 0,
      };
      map.set(line.productId, {
        name: line.name,
        sales: prev.sales + line.lineTotal,
        units: prev.units + line.quantity,
      });
    }
  }
  return [...map.values()]
    .sort((a, b) => b.sales - a.sales)
    .slice(0, limit);
}

export function getActiveMembersCountFromStore(): number {
  return getActiveMembersCount(loadMembers());
}
