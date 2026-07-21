import { getBranchId, getCompanyId } from "../../auth/authStorage";
import { CatalogApiError } from "../catalogApiClient";
import { buildClientPayload, postClientAdd } from "../clientApi";
import { clientToMember } from "../mappers/clientMemberMapper";
import type { AddClientInput } from "../types";
import type { Member } from "../../../lib/membersStore";

function phoneDigits(value?: string | null): string {
  return (value ?? "").replace(/\D/g, "");
}

function isValidMemberPhone(value?: string | null): boolean {
  return phoneDigits(value).length >= 10;
}

export type AddClientResult =
  | { ok: true; member: Member }
  | { ok: false; message: string; statusCode?: number };

export async function addClientUseCase(
  input: AddClientInput,
): Promise<AddClientResult> {
  const companyId = getCompanyId();
  const branchId = getBranchId();

  if (!companyId || !branchId) {
    return {
      ok: false,
      message: "Sesión incompleta. Vuelva a iniciar sesión.",
    };
  }

  if (!input.firstName.trim() || !input.lastName.trim()) {
    return { ok: false, message: "Nombre y apellidos son obligatorios." };
  }

  if (!isValidMemberPhone(input.phoneNumber)) {
    return {
      ok: false,
      message: "El teléfono de contacto del miembro es obligatorio.",
    };
  }
  if (!isValidMemberPhone(input.emergencyPhoneNumber)) {
    return {
      ok: false,
      message: "El teléfono de emergencia es obligatorio.",
    };
  }
  if (!input.planID || input.planID <= 0) {
    return { ok: false, message: "Seleccione un plan de membresía." };
  }

  try {
    const payload = buildClientPayload(input, {
      companyId,
      branchId,
      mode: "add",
    });
    const created = await postClientAdd(payload);
    return { ok: true, member: clientToMember(created) };
  } catch (error) {
    if (error instanceof CatalogApiError) {
      return { ok: false, message: error.message, statusCode: error.statusCode };
    }
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "No se pudo registrar el cliente.",
    };
  }
}
