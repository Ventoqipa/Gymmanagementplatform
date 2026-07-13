import { getBranchId, getCompanyId } from "../../auth/authStorage";
import { CatalogApiError } from "../catalogApiClient";
import { fetchClientsList } from "../clientApi";
import { clientsToMembers } from "../mappers/clientMemberMapper";
import { fetchPlansList } from "../planApi";
import type { Member } from "../../../lib/membersStore";

function dateAddedSortKey(member: Member): number {
  const raw = member.dateAdded?.trim();
  if (raw) {
    const t = new Date(raw).getTime();
    if (Number.isFinite(t)) return t;
  }
  // Fallback: enrollment o id numérico de CLI-n
  const enroll = member.enrollmentDate
    ? new Date(`${member.enrollmentDate}T12:00:00`).getTime()
    : NaN;
  if (Number.isFinite(enroll)) return enroll;
  const idMatch = member.id.match(/^CLI-(\d+)$/i);
  return idMatch ? Number(idMatch[1]) : 0;
}

/** Más reciente (DateAdded) primero. */
export function sortMembersByDateAddedDesc(members: Member[]): Member[] {
  return members
    .slice()
    .sort((a, b) => dateAddedSortKey(b) - dateAddedSortKey(a));
}

export type ListClientsResult =
  | { ok: true; members: Member[] }
  | { ok: false; message: string; statusCode?: number };

export async function listClientsUseCase(): Promise<ListClientsResult> {
  const companyId = getCompanyId();
  const branchId = getBranchId();

  if (!companyId || !branchId) {
    return {
      ok: false,
      message: "Sesión incompleta. Vuelva a iniciar sesión.",
    };
  }

  try {
    const [clients, plans] = await Promise.all([
      fetchClientsList(companyId, branchId),
      fetchPlansList().catch(() => []),
    ]);
    const planNameById = Object.fromEntries(
      plans.map((plan) => [plan.planID, plan.planName]),
    );
    const members = clientsToMembers(clients, planNameById);
    return { ok: true, members: sortMembersByDateAddedDesc(members) };
  } catch (error) {
    if (error instanceof CatalogApiError) {
      return { ok: false, message: error.message, statusCode: error.statusCode };
    }
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "No se pudo cargar el listado de clientes.",
    };
  }
}
