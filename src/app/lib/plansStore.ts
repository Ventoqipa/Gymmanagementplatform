import { loadJson, saveJson } from "./storage";

const PLAN_VALIDITY_KEY = "elite_gym_v1_plan_validity";

/** Meses de vigencia por planID (el API Plan solo expone planName). */
export type PlanValidityMap = Record<string, number>;

const DEFAULT_VALIDITY_MONTHS = 6;

export function loadPlanValidityMap(): PlanValidityMap {
  return loadJson<PlanValidityMap>(PLAN_VALIDITY_KEY, {});
}

export function savePlanValidityMap(map: PlanValidityMap): void {
  saveJson(PLAN_VALIDITY_KEY, map);
}

export function getPlanValidityMonths(planId: number): number {
  const map = loadPlanValidityMap();
  const months = map[String(planId)];
  return typeof months === "number" && months > 0 ? months : DEFAULT_VALIDITY_MONTHS;
}

export function setPlanValidityMonths(planId: number, months: number): void {
  const map = loadPlanValidityMap();
  map[String(planId)] = months;
  savePlanValidityMap(map);
}

export function removePlanValidity(planId: number): void {
  const map = loadPlanValidityMap();
  delete map[String(planId)];
  savePlanValidityMap(map);
}

export function renewalDateFromPlan(
  enrollmentDateIso: string,
  planId: number,
): string {
  const months = getPlanValidityMonths(planId);
  const d = new Date(`${enrollmentDateIso}T12:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

/** Precios de suscripción por periodo de vigencia (localStorage). */
export type SubscriptionPeriodKey = "1d" | "1w" | "1m" | "3m" | "6m" | "12m";

const SUBSCRIPTION_PRICES_KEY = "elite_gym_v2_subscription_prices";

const DEFAULT_SUBSCRIPTION_PRICES: Record<SubscriptionPeriodKey, number> = {
  "1d": 80,
  "1w": 230,
  "1m": 650,
  "3m": 1650,
  "6m": 3000,
  "12m": 5500,
};

export function loadSubscriptionPrices(): Record<SubscriptionPeriodKey, number> {
  const saved = loadJson<Partial<Record<SubscriptionPeriodKey, number>>>(
    SUBSCRIPTION_PRICES_KEY,
    {},
  );
  return { ...DEFAULT_SUBSCRIPTION_PRICES, ...saved };
}

export function getSubscriptionPrice(key: SubscriptionPeriodKey): number {
  return loadSubscriptionPrices()[key];
}

export function saveSubscriptionPrices(
  prices: Partial<Record<SubscriptionPeriodKey, number>>,
): void {
  const current = loadSubscriptionPrices();
  saveJson(SUBSCRIPTION_PRICES_KEY, { ...current, ...prices });
}
