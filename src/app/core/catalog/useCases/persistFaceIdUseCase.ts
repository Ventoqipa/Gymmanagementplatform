import { clientIdFromMemberId } from "../mappers/clientMemberMapper";
import type { Member } from "../../../lib/membersStore";
import { updateClientUseCase, type UpdateClientResult } from "./updateClientUseCase";

function phonePartsFromMember(member: Member): {
  dial: string;
  national: string;
} {
  const digits = (member.phone ?? "").replace(/\D/g, "");
  let dial = "52";
  let national = digits;
  if (digits.startsWith("52") && digits.length > 10) {
    national = digits.slice(2);
  } else if (digits.length > 10) {
    dial = digits.slice(0, digits.length - 10);
    national = digits.slice(-10);
  }
  return { dial, national: national || "0" };
}

/**
 * Tras enroll OK en Gateway: guarda faceID (y memberID/PIN) en Catálogo.
 * No vuelve a capturar rostro; es el paso de sync idempotente.
 */
export async function persistFaceIdUseCase(input: {
  member: Member;
  templateId: string;
  /** PIN en dispositivo; default = clientID. */
  pin?: string;
}): Promise<UpdateClientResult> {
  // Intentar extraer clientID de varias formas:
  // 1. CLI-123  2. CLI_123  3. "123" puro  4. dígitos embebidos
  const memberId = (input.member.id ?? "").trim();
  const clientId =
    clientIdFromMemberId(memberId) ??
    (() => {
      // CLI_123 (underscore) o CLI123 (sin separador)
      const alt = memberId.match(/^CLI[_-]?(\d+)$/i);
      if (alt) {
        const n = Number(alt[1]);
        return Number.isFinite(n) && n > 0 ? n : null;
      }
      // Solo dígitos
      const n = Number(memberId.replace(/\D/g, ""));
      return Number.isFinite(n) && n > 0 ? n : null;
    })();

  if (!clientId) {
    return {
      ok: false,
      message: `No se pudo derivar clientID del miembro (id="${memberId}"). Verifica el formato.`,
    };
  }

  const { dial, national } = phonePartsFromMember(input.member);
  const pin = (input.pin ?? String(clientId)).trim();

  return updateClientUseCase({
    clientID: clientId,
    firstName: input.member.firstName,
    lastName: input.member.lastName,
    email: input.member.email,
    phoneNumber: national,
    phoneCodeNumber: dial,
    emergencyPhoneNumber: input.member.emergencyPhone,
    fullAddress: input.member.address,
    planID: 1,
    enrollmentDate: input.member.enrollmentDate,
    renewalDate: input.member.renewalDate,
    idDocumentDataUrl: input.member.idDocumentDataUrl,
    isDirectDebit: input.member.isDirectDebit === true,
    priceRegular:
      input.member.isDirectDebit === true
        ? 0
        : (input.member.regularPrice ?? 0),
    priceDirectDebit:
      input.member.isDirectDebit === true
        ? (input.member.directDebitPrice ?? 0)
        : 0,
    faceID: input.templateId,
    memberID: pin,
  });
}
