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
