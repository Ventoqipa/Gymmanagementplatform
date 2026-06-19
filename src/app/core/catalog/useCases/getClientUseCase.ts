import { CatalogApiError } from "../catalogApiClient";
import { fetchClientById } from "../clientApi";
import { clientToMember } from "../mappers/clientMemberMapper";
import type { Member } from "../../../lib/membersStore";

export type GetClientResult =
  | { ok: true; member: Member }
  | { ok: false; message: string; statusCode?: number };

export async function getClientUseCase(
  clientId: number,
): Promise<GetClientResult> {
  try {
    const client = await fetchClientById(clientId);
    return { ok: true, member: clientToMember(client) };
  } catch (error) {
    if (error instanceof CatalogApiError) {
      return { ok: false, message: error.message, statusCode: error.statusCode };
    }
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "No se pudo obtener el cliente.",
    };
  }
}
