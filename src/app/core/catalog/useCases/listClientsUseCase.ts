import { getBranchId, getCompanyId } from "../../auth/authStorage";
import { CatalogApiError } from "../catalogApiClient";
import { fetchClientsList } from "../clientApi";
import { clientsToMembers } from "../mappers/clientMemberMapper";
import type { Member } from "../../../lib/membersStore";

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
    const clients = await fetchClientsList(companyId, branchId);
    const members = clientsToMembers(clients);
    return { ok: true, members: members.slice().reverse() };
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
