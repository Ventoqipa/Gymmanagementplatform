import { CatalogApiError } from "../catalogApiClient";
import { deleteClientById } from "../clientApi";

export type DeleteClientResult =
  | { ok: true }
  | { ok: false; message: string; statusCode?: number };

export async function deleteClientUseCase(
  clientId: number,
): Promise<DeleteClientResult> {
  if (!clientId || clientId <= 0) {
    return { ok: false, message: "clientID inválido." };
  }

  try {
    await deleteClientById(clientId);
    return { ok: true };
  } catch (error) {
    if (error instanceof CatalogApiError) {
      return { ok: false, message: error.message, statusCode: error.statusCode };
    }
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "No se pudo eliminar el cliente.",
    };
  }
}
