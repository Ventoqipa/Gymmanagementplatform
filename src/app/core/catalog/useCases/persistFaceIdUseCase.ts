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
  const clientId =
    clientIdFromMemberId(input.member.id) ??
    (() => {
      const n = Number(String(input.member.id).replace(/\D/g, ""));
      return Number.isFinite(n) && n > 0 ? n : null;
    })();

  if (!clientId) {
    return {
      ok: false,
      message: "Este miembro no tiene clientID de catálogo para guardar faceID.",
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
