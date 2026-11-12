import type { PosConfig } from "../config/types";
import { posGet, posPost } from "./posHttpClient";
import { POS_API_PATHS } from "./posEndpoints";

export type DirectDebitStatus =
  | "creating"
  | "pending"
  | "authorized"
  | "paused"
  | "cancelled"
  | "failed";

export type DirectDebitSubscription = {
  id: string;
  memberId: string;
  payerEmail: string;
  mpPreapprovalId: string | null;
  status: DirectDebitStatus;
  amount: number;
  months: number;
  periodKey: string | null;
  nextPaymentDate: number | null;
  endDate: number | null;
  lastError: string | null;
};

export type CreateDirectDebitInput = {
  memberId: string;
  memberName: string;
  payerEmail: string;
  cardTokenId: string;
  amount: number;
  months: number;
  periodKey?: string | null;
  priceBranchFrequencyId?: number;
};

/** Configuración del POS (URL, tenant, sucursal, API key) que usa el resto de la app. */
let resolveConfig: (() => PosConfig) | null = null;

export function setDirectDebitConfig(resolver: () => PosConfig): void {
  resolveConfig = resolver;
}

function config(): PosConfig {
  if (!resolveConfig) {
    throw new Error("Domiciliación sin configurar: falta setDirectDebitConfig().");
  }
  return resolveConfig();
}

export function createDirectDebit(input: CreateDirectDebitInput) {
  return posPost<DirectDebitSubscription>(config(), POS_API_PATHS.subscriptions, input);
}

export function getDirectDebit(id: string) {
  return posGet<DirectDebitSubscription>(config(), POS_API_PATHS.subscription(id));
}

export function getMemberDirectDebit(memberId: string) {
  return posGet<DirectDebitSubscription | null>(
    config(),
    POS_API_PATHS.memberSubscription(memberId),
  );
}

export function cancelDirectDebit(id: string) {
  return posPost<DirectDebitSubscription>(config(), POS_API_PATHS.subscriptionCancel(id), {});
}

/** N: cambia la tarjeta del domiciliado (no cobra en ese momento). */
export function updateDirectDebitCard(id: string, cardTokenId: string) {
  return posPost<DirectDebitSubscription>(config(), POS_API_PATHS.subscriptionCard(id), {
    cardTokenId,
  });
}

/** N: un cobro mensual del domiciliado */
export type DirectDebitCharge = {
  id: string;
  amount: number;
  debitDate: number | null;
  /** scheduled | recycling | processed | cancelled | waiting for gateway */
  status: string;
  /** Intento actual (Mercado Pago hace hasta 4) */
  retryAttempt: number;
  nextRetryDate: number | null;
  /** approved | rejected | ... */
  paymentStatus: string | null;
  paymentDetail: string | null;
};

export type DirectDebitCharges = {
  summary: {
    quotas: number | null;
    chargedQuantity: number | null;
    semaphore: "green" | "yellow" | "red" | null;
    lastChargedDate: number | null;
  } | null;
  charges: DirectDebitCharge[];
};

export function getDirectDebitCharges(id: string) {
  return posGet<DirectDebitCharges>(config(), POS_API_PATHS.subscriptionCharges(id));
}
