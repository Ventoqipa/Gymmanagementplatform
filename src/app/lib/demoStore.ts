/**
 * Demo-only in-memory store. Resets on full page reload.
 * Simulates persistence the client would get from a backend after integrations go live.
 */

export type MembershipPayment = {
  id: string;
  memberId: string;
  amount: number;
  concept: "MEMBERSHIP" | "RENEWAL" | "OTHER";
  method: "CASH" | "CARD" | "QR";
  dateIso: string;
};

export type AccessLogEntry = {
  id: string;
  timestampIso: string;
  memberName: string;
  memberId?: string;
  tier: string;
  result: "GRANTED" | "DENIED";
  reason?: string;
  terminalId: string;
  faceIdVendorRequestId: string;
  turnstileVendorCommandId: string;
};

export type TurnstileState = {
  terminalId: string;
  label: string;
  online: boolean;
  lastAction: "IDLE" | "OPEN" | "CLOSED" | "ERROR";
  lastEventIso: string | null;
};

const initialPayments: MembershipPayment[] = [
  {
    id: "PAY-DEMO-001",
    memberId: "MEM-1247",
    amount: 89.99,
    concept: "MEMBERSHIP",
    method: "CARD",
    dateIso: new Date(Date.now() - 86400000 * 12).toISOString(),
  },
  {
    id: "PAY-DEMO-002",
    memberId: "MEM-1247",
    amount: 89.99,
    concept: "RENEWAL",
    method: "QR",
    dateIso: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

const initialAccess: AccessLogEntry[] = [
  {
    id: "ACC-001",
    timestampIso: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    memberName: "Marcus Chen",
    memberId: "MEM-1247",
    tier: "ELITE_BLK",
    result: "GRANTED",
    terminalId: "TRN-MAIN-01",
    faceIdVendorRequestId: "fv_req_mock_8f2a",
    turnstileVendorCommandId: "ts_cmd_mock_91bc",
  },
  {
    id: "ACC-002",
    timestampIso: new Date(Date.now() - 1000 * 60 * 22).toISOString(),
    memberName: "Sarah Williams",
    memberId: "MEM-1246",
    tier: "GOLD",
    result: "GRANTED",
    terminalId: "TRN-MAIN-01",
    faceIdVendorRequestId: "fv_req_mock_77d1",
    turnstileVendorCommandId: "ts_cmd_mock_44aa",
  },
  {
    id: "ACC-003",
    timestampIso: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    memberName: "Unknown",
    tier: "N/A",
    result: "DENIED",
    reason: "NO_MATCH",
    terminalId: "TRN-MAIN-02",
    faceIdVendorRequestId: "fv_req_mock_fail_01",
    turnstileVendorCommandId: "ts_cmd_mock_hold",
  },
];

let payments = [...initialPayments];
let accessLog = [...initialAccess];

export type PosSale = {
  id: string;
  total: number;
  method: string;
  dateIso: string;
  memberId?: string;
  memberName?: string;
  linesSummary: string;
};

const initialPosSales: PosSale[] = [
  {
    id: "POS-DEMO-1",
    total: 64.98,
    method: "CARD",
    dateIso: new Date().toISOString(),
    linesSummary: "ISO WHEY + SHAKER",
  },
  {
    id: "POS-DEMO-2",
    total: 32.99,
    method: "QR",
    dateIso: new Date(Date.now() - 3600000).toISOString(),
    linesSummary: "PRE-WORKOUT RAGE",
  },
];

let posSales = [...initialPosSales];

let turnstiles: TurnstileState[] = [
  {
    terminalId: "TRN-MAIN-01",
    label: "Entrada principal",
    online: true,
    lastAction: "CLOSED",
    lastEventIso: new Date().toISOString(),
  },
  {
    terminalId: "TRN-MAIN-02",
    label: "Entrada lateral",
    online: true,
    lastAction: "CLOSED",
    lastEventIso: new Date().toISOString(),
  },
];

export function getMembershipPayments(): MembershipPayment[] {
  return [...payments].sort(
    (a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime()
  );
}

export function getPaymentsForMember(memberId: string): MembershipPayment[] {
  return getMembershipPayments().filter((p) => p.memberId === memberId);
}

export function addMembershipPayment(p: Omit<MembershipPayment, "id" | "dateIso"> & { dateIso?: string }) {
  const row: MembershipPayment = {
    ...p,
    id: `PAY-${Date.now()}`,
    dateIso: p.dateIso ?? new Date().toISOString(),
  };
  payments = [row, ...payments];
  return row;
}

export function getAccessLog(): AccessLogEntry[] {
  return [...accessLog].sort(
    (a, b) => new Date(b.timestampIso).getTime() - new Date(a.timestampIso).getTime()
  );
}

export function appendAccessLog(entry: Omit<AccessLogEntry, "id">) {
  const row: AccessLogEntry = {
    ...entry,
    id: `ACC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  };
  accessLog = [row, ...accessLog];
  return row;
}

export function addPosSale(sale: Omit<PosSale, "id" | "dateIso"> & { id?: string; dateIso?: string }) {
  const row: PosSale = {
    ...sale,
    id: sale.id ?? `POS-${Date.now()}`,
    dateIso: sale.dateIso ?? new Date().toISOString(),
  };
  posSales = [row, ...posSales];
  return row;
}

export function getPosSales(): PosSale[] {
  return [...posSales].sort(
    (a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime()
  );
}

export function getPosSalesToday(): PosSale[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return getPosSales().filter((s) => new Date(s.dateIso) >= start);
}

export function getMembershipIncomeTotal(): number {
  return payments.reduce((acc, p) => acc + p.amount, 0);
}

export function getTurnstileStates(): TurnstileState[] {
  return turnstiles.map((t) => ({ ...t }));
}

export function updateTurnstile(
  terminalId: string,
  patch: Partial<Pick<TurnstileState, "lastAction" | "lastEventIso" | "online">>
) {
  turnstiles = turnstiles.map((t) =>
    t.terminalId === terminalId ? { ...t, ...patch, lastEventIso: patch.lastEventIso ?? new Date().toISOString() } : t
  );
}
