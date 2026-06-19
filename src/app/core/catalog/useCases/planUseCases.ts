import { CatalogApiError } from "../catalogApiClient";
import {
  deletePlanById,
  fetchPlansList,
  postPlanAdd,
  putPlanUpdate,
  buildPlanPayload,
} from "../planApi";
import {
  getPlanValidityMonths,
  removePlanValidity,
  setPlanValidityMonths,
} from "../../../lib/plansStore";
import type { AddPlanInput, PlanWithValidity, UpdatePlanInput } from "../types";

export type ListPlansResult =
  | { ok: true; plans: PlanWithValidity[] }
  | { ok: false; message: string; statusCode?: number };

export async function listPlansUseCase(): Promise<ListPlansResult> {
  try {
    const plans = await fetchPlansList();
    const withValidity: PlanWithValidity[] = plans.map((p) => ({
      ...p,
      validityMonths: getPlanValidityMonths(p.planID),
    }));
    return { ok: true, plans: withValidity };
  } catch (error) {
    if (error instanceof CatalogApiError) {
      return { ok: false, message: error.message, statusCode: error.statusCode };
    }
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "No se pudo cargar los planes.",
    };
  }
}

export type MutatePlanResult =
  | { ok: true; plan: PlanWithValidity }
  | { ok: false; message: string; statusCode?: number };

export async function addPlanUseCase(input: AddPlanInput): Promise<MutatePlanResult> {
  if (!input.planName.trim()) {
    return { ok: false, message: "El nombre del plan es obligatorio." };
  }
  if (input.validityMonths < 1 || input.validityMonths > 24) {
    return { ok: false, message: "La vigencia debe ser entre 1 y 24 meses." };
  }

  try {
    const payload = buildPlanPayload(input, "add");
    const created = await postPlanAdd(payload);
    const planId = created.planID || payload.planID;
    if (planId > 0) {
      setPlanValidityMonths(planId, input.validityMonths);
    }
    return {
      ok: true,
      plan: {
        ...created,
        validityMonths: input.validityMonths,
      },
    };
  } catch (error) {
    if (error instanceof CatalogApiError) {
      return { ok: false, message: error.message, statusCode: error.statusCode };
    }
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No se pudo crear el plan.",
    };
  }
}

export async function updatePlanUseCase(
  input: UpdatePlanInput,
): Promise<MutatePlanResult> {
  if (!input.planID || input.planID <= 0) {
    return { ok: false, message: "planID inválido." };
  }
  if (!input.planName.trim()) {
    return { ok: false, message: "El nombre del plan es obligatorio." };
  }

  try {
    const payload = buildPlanPayload(input, "update");
    const updated = await putPlanUpdate(payload);
    setPlanValidityMonths(input.planID, input.validityMonths);
    return {
      ok: true,
      plan: { ...updated, validityMonths: input.validityMonths },
    };
  } catch (error) {
    if (error instanceof CatalogApiError) {
      return { ok: false, message: error.message, statusCode: error.statusCode };
    }
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No se pudo actualizar el plan.",
    };
  }
}

export async function deletePlanUseCase(planId: number): Promise<{
  ok: boolean;
  message?: string;
  statusCode?: number;
}> {
  if (!planId || planId <= 0) {
    return { ok: false, message: "planID inválido." };
  }
  try {
    await deletePlanById(planId);
    removePlanValidity(planId);
    return { ok: true };
  } catch (error) {
    if (error instanceof CatalogApiError) {
      return { ok: false, message: error.message, statusCode: error.statusCode };
    }
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No se pudo eliminar el plan.",
    };
  }
}
