import { getBranchId, getCompanyId } from "../../auth/authStorage";
import { CatalogApiError } from "../catalogApiClient";
import { buildUpdatePayload, putClientUpdate } from "../clientApi";
import { clientToMember } from "../mappers/clientMemberMapper";
import type { UpdateClientInput } from "../types";
import type { Member } from "../../../lib/membersStore";

export type UpdateClientResult =
  | { ok: true; member: Member }
  | { ok: false; message: string; statusCode?: number };

export async function updateClientUseCase(
  input: UpdateClientInput,
): Promise<UpdateClientResult> {
  const companyId = getCompanyId();
  const branchId = getBranchId();

  if (!companyId || !branchId) {
    return {
      ok: false,
      message: "Sesión incompleta. Vuelva a iniciar sesión.",
    };
  }
  if (!input.clientID || input.clientID <= 0) {
    return { ok: false, message: "clientID inválido." };
  }

  try {
    const payload = buildUpdatePayload(input, {
      companyId,
      branchId,
      existing: undefined,
    });
    const updated = await putClientUpdate(payload);
    return { ok: true, member: clientToMember(updated) };
  } catch (error) {
    if (error instanceof CatalogApiError) {
      return { ok: false, message: error.message, statusCode: error.statusCode };
    }
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "No se pudo actualizar el cliente.",
    };
  }
}
