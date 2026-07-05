/**
 * Almacén local de la plataforma (localStorage).
 * Inicia vacío; cada alta/venta/acceso se persiste en el navegador.
 */

import { isIsoInRange } from "./labels";
import { loadJson, saveJson } from "./storage";

const KEYS = {
  payments: "elite_gym_v1_payments",
  accessLog: "elite_gym_v1_access_log",
  turnstiles: "elite_gym_v1_turnstiles",
  accessEnrollments: "elite_gym_v1_access_enrollments",
} as const;

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
  /** Instantánea del intento en el lector (JPEG/PNG en CDN o /snapshots/{id}). */
  captureSnapshotUrl?: string;
  confidence?: number;
};

export type TurnstileState = {
  terminalId: string;
  label: string;
  online: boolean;
  lastAction: "IDLE" | "OPEN" | "CLOSED" | "ERROR";
  lastEventIso: string | null;
};

export type AccessEnrollmentRecord = {
  id: string;
  memberId: string;
  displayName: string;
  terminalId: string;
  templateId: string;
  qualityScore: number;
  atIso: string;
};

const DEFAULT_TURNSTILES: TurnstileState[] = [
  {
    terminalId: "TRN-MAIN-01",
    label: "Entrada principal",
    online: true,
    lastAction: "IDLE",
    lastEventIso: null,
  },
  {
    terminalId: "TRN-MAIN-02",
    label: "Entrada lateral",
    online: true,
    lastAction: "IDLE",
    lastEventIso: null,
  },
];

let payments = loadJson<MembershipPayment[]>(KEYS.payments, []);
let accessLog = loadJson<AccessLogEntry[]>(KEYS.accessLog, []);
let turnstiles = loadJson<TurnstileState[]>(KEYS.turnstiles, DEFAULT_TURNSTILES);
let accessEnrollments = loadJson<AccessEnrollmentRecord[]>(
  KEYS.accessEnrollments,
  [],
);

function persistPayments() {
  saveJson(KEYS.payments, payments);
}

function persistAccessLog() {
  saveJson(KEYS.accessLog, accessLog);
}

function persistTurnstiles() {
  saveJson(KEYS.turnstiles, turnstiles);
}

function persistAccessEnrollments() {
  saveJson(KEYS.accessEnrollments, accessEnrollments);
}

export function getMembershipPayments(): MembershipPayment[] {
  return [...payments].sort(
    (a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime(),
  );
}

export function getPaymentsForMember(memberId: string): MembershipPayment[] {
  return getMembershipPayments().filter((p) => p.memberId === memberId);
}

export function addMembershipPayment(
  p: Omit<MembershipPayment, "id" | "dateIso"> & { dateIso?: string },
) {
  const row: MembershipPayment = {
    ...p,
    id: `PAY-${Date.now()}`,
    dateIso: p.dateIso ?? new Date().toISOString(),
  };
  payments = [row, ...payments];
  persistPayments();
  return row;
}

export function getAccessLog(): AccessLogEntry[] {
  return [...accessLog].sort(
    (a, b) =>
      new Date(b.timestampIso).getTime() - new Date(a.timestampIso).getTime(),
  );
}

export function appendAccessLog(entry: Omit<AccessLogEntry, "id">) {
  const row: AccessLogEntry = {
    ...entry,
    id: `ACC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  };
  accessLog = [row, ...accessLog];
  persistAccessLog();
  return row;
}

export function getMembershipIncomeTotal(): number {
  return payments.reduce((acc, p) => acc + p.amount, 0);
}

export function getMembershipIncomeInRange(fromDate: string, toDate: string): number {
  return payments
    .filter((p) => isIsoInRange(p.dateIso, fromDate, toDate))
    .reduce((acc, p) => acc + p.amount, 0);
}

export function getMembershipPaymentsInRange(
  fromDate: string,
  toDate: string,
): MembershipPayment[] {
  return getMembershipPayments().filter((p) =>
    isIsoInRange(p.dateIso, fromDate, toDate),
  );
}

export function getAccessLogInRange(
  fromDate: string,
  toDate: string,
): AccessLogEntry[] {
  return getAccessLog().filter((e) =>
    isIsoInRange(e.timestampIso, fromDate, toDate),
  );
}

export function getTurnstileStates(): TurnstileState[] {
  return turnstiles.map((t) => ({ ...t }));
}

export function updateTurnstile(
  terminalId: string,
  patch: Partial<Pick<TurnstileState, "lastAction" | "lastEventIso" | "online">>,
) {
  turnstiles = turnstiles.map((t) =>
    t.terminalId === terminalId
      ? {
          ...t,
          ...patch,
          lastEventIso: patch.lastEventIso ?? new Date().toISOString(),
        }
      : t,
  );
  persistTurnstiles();
}

export function getAccessEnrollments(): AccessEnrollmentRecord[] {
  return [...accessEnrollments].sort(
    (a, b) => new Date(b.atIso).getTime() - new Date(a.atIso).getTime(),
  );
}

export function appendAccessEnrollment(
  entry: Omit<AccessEnrollmentRecord, "id" | "atIso"> & { atIso?: string },
) {
  const row: AccessEnrollmentRecord = {
    ...entry,
    id: `ENR-${Date.now()}`,
    atIso: entry.atIso ?? new Date().toISOString(),
  };
  accessEnrollments = [row, ...accessEnrollments];
  persistAccessEnrollments();
  return row;
}

/** Reinicia datos operativos locales (no cierra sesión). */
export function clearPlatformLocalData(): void {
  payments = [];
  accessLog = [];
  turnstiles = DEFAULT_TURNSTILES.map((t) => ({ ...t }));
  accessEnrollments = [];
  persistPayments();
  persistAccessLog();
  persistTurnstiles();
  persistAccessEnrollments();
}
