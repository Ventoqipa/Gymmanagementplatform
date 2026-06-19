import { getSessionUserId } from "../auth/authStorage";
import { catalogConfig, catalogUrl } from "../../config/catalog";
import { catalogRequest } from "./catalogApiClient";
import type {
  AddPlanInput,
  CatalogPlan,
  CatalogPlanListData,
  CatalogPlanListItem,
  UpdatePlanInput,
} from "./types";

function readPlanField(
  item: CatalogPlanListItem,
  pascal: keyof CatalogPlanListItem,
  camel: keyof CatalogPlanListItem,
): unknown {
  const raw = item as Record<string, unknown>;
  return raw[pascal as string] ?? raw[camel as string];
}

function mapListItemToPlan(item: CatalogPlanListItem): CatalogPlan {
  const planId = Number(readPlanField(item, "PlanID", "planID")) || 0;
  const planName = String(readPlanField(item, "PlanName", "planName") ?? "").trim();
  const isEnabled = readPlanField(item, "IsEnabled", "isEnabled") !== false;
  const nowIso = new Date().toISOString();

  return {
    isEnabled,
    isNew: false,
    userAdded: "-",
    dateAdded: nowIso,
    userEdited: "-",
    dateEdited: nowIso,
    planID: planId,
    planName: planName || "—",
  };
}

function isCatalogPlan(value: unknown): value is CatalogPlan {
  if (value === null || typeof value !== "object") return false;
  const o = value as Record<string, unknown>;
  return (
    ("planID" in o || "PlanID" in o) &&
    ("planName" in o || "PlanName" in o)
  );
}

function mapRawToPlan(item: unknown): CatalogPlan {
  if (isCatalogPlan(item)) {
    const o = item as Record<string, unknown>;
    const planId = Number(o.planID ?? o.PlanID) || 0;
    const planName = String(o.planName ?? o.PlanName ?? "").trim();
    return {
      isEnabled: o.isEnabled !== false && o.IsEnabled !== false,
      isNew: false,
      userAdded: String(o.userAdded ?? o.UserAdded ?? "-"),
      dateAdded: (o.dateAdded ?? o.DateAdded ?? null) as string | null,
      userEdited: String(o.userEdited ?? o.UserEdited ?? "-"),
      dateEdited: (o.dateEdited ?? o.DateEdited ?? null) as string | null,
      planID: planId,
      planName: planName || "—",
    };
  }
  return mapListItemToPlan(item as CatalogPlanListItem);
}

function normalizePlanList(data: unknown): CatalogPlan[] {
  if (Array.isArray(data)) {
    if (data.length > 0 && isCatalogPlan(data[0])) {
      return data.map(mapRawToPlan);
    }
    return (data as CatalogPlanListItem[]).map(mapListItemToPlan);
  }

  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;

    const planList = obj.plan ?? obj.Plan ?? obj.genericList ?? obj.GenericList;
    if (Array.isArray(planList)) {
      return planList.map(mapRawToPlan);
    }

    for (const key of ["items", "plans", "list"]) {
      if (Array.isArray(obj[key])) {
        return (obj[key] as unknown[]).map(mapRawToPlan);
      }
    }

    if (isCatalogPlan(data)) {
      return [mapRawToPlan(data)];
    }
  }

  return [];
}

export function buildPlanPayload(
  input: AddPlanInput | UpdatePlanInput,
  mode: "add" | "update",
): CatalogPlan {
  const nowIso = new Date().toISOString();
  const sessionUserId = getSessionUserId() || "-";
  const planId = "planID" in input ? input.planID : 0;

  return {
    isEnabled: true,
    isNew: mode === "add",
    userAdded: sessionUserId,
    dateAdded: nowIso,
    userEdited: sessionUserId,
    dateEdited: nowIso,
    planID: planId,
    planName: input.planName.trim().slice(0, 50),
  };
}

export async function fetchPlansList(): Promise<CatalogPlan[]> {
  const data = await catalogRequest<CatalogPlanListData | CatalogPlan[] | unknown>({
    method: "GET",
    url: catalogUrl(catalogConfig.paths.planListAll),
  });
  return normalizePlanList(data);
}

export async function fetchPlanById(planId: number): Promise<CatalogPlan> {
  return catalogRequest<CatalogPlan>({
    method: "GET",
    url: catalogUrl(catalogConfig.paths.planGetData(planId)),
  });
}

export async function postPlanAdd(payload: CatalogPlan): Promise<CatalogPlan> {
  const data = await catalogRequest<CatalogPlan | unknown>({
    method: "POST",
    url: catalogUrl(catalogConfig.paths.planAdd),
    body: payload,
  });
  if (data && typeof data === "object" && "planID" in data) {
    return data as CatalogPlan;
  }
  return payload;
}

export async function putPlanUpdate(payload: CatalogPlan): Promise<CatalogPlan> {
  const data = await catalogRequest<CatalogPlan | unknown>({
    method: "PUT",
    url: catalogUrl(catalogConfig.paths.planUpdate),
    body: payload,
  });
  if (data && typeof data === "object" && "planID" in data) {
    return data as CatalogPlan;
  }
  return payload;
}

export async function deletePlanById(planId: number): Promise<void> {
  await catalogRequest<unknown>({
    method: "DELETE",
    url: catalogUrl(catalogConfig.paths.planDelete(planId)),
  });
}
