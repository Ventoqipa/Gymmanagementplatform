import type { Member } from "../../../lib/membersStore";
import type { CatalogClient } from "../types";
import { buildClientDocumentUrl } from "../utils/clientDocUrl";
import { decodeEmergencyPhone } from "../utils/emergencyPhone";

function isoDatePart(value?: string | null): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function readEnrollment(client: CatalogClient): string {
  return client.DateEnrollment ?? client.enrollment ?? "";
}

function readRenewal(client: CatalogClient): string | null {
  return client.DateRenewal ?? client.renewal ?? null;
}

function readEmergencyPhone(client: CatalogClient): string | undefined {
  const national = client.phoneNumberEmergency?.trim();
  const codeRaw = client.phoneCodeNumberEmergency?.trim();
  if (national && national !== "-") {
    const code = codeRaw?.replace(/\D/g, "");
    if (code && code !== "-") {
      return `+${code} ${national}`;
    }
    return national;
  }
  return decodeEmergencyPhone(client.middleName);
}

function readDocDataUrl(client: CatalogClient): string | undefined {
  // Preferir archivo en DocsEG (DocFileName → URL autenticada vía proxy).
  const fromFile = buildClientDocumentUrl(client.DocFileName);
  if (fromFile) return fromFile;

  const b64 = client.DocBase64?.trim();
  if (!b64 || b64 === "-") return undefined;
  const ext = (client.DocExtensionName ?? "").toLowerCase().replace(/^\./, "");
  const mime =
    ext === "png"
      ? "image/png"
      : ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "gif"
          ? "image/gif"
          : ext === "webp"
            ? "image/webp"
            : ext === "pdf"
              ? "application/pdf"
              : ext === "doc"
                ? "application/msword"
                : ext === "docx"
                  ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  : ext
                    ? `application/${ext}`
                    : "application/octet-stream";
  return `data:${mime};base64,${b64}`;
}

function isInactive(client: CatalogClient): boolean {
  if (client.isEnabled === false) return true;
  if (client.statusID != null && client.statusID !== 1) return true;
  return false;
}

export function memberIdFromClient(client: CatalogClient): string {
  return `CLI-${client.clientID}`;
}

export function clientIdFromMemberId(memberId: string): number | null {
  const m = memberId.match(/^CLI-(\d+)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function clientToMember(
  client: CatalogClient,
  options?: { planName?: string },
): Member {
  let firstName = client.firstName?.trim() || "";
  let lastName = client.lastName?.trim() || "";
  if (firstName === "-") firstName = "";
  if (lastName === "-") lastName = "";
  // Quita guiones sueltos que el API mete como placeholder.
  firstName = firstName.replace(/-/g, " ").replace(/\s+/g, " ").trim();
  lastName = lastName.replace(/-/g, " ").replace(/\s+/g, " ").trim();
  if (!firstName && client.fullName?.trim()) {
    const cleanedFull = client.fullName
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const parts = cleanedFull.split(/\s+/).filter(Boolean);
    firstName = parts[0] ?? "—";
    lastName = parts.slice(1).join(" ");
  }

  const fullAddress = client.fullAddress?.trim();
  const address =
    fullAddress && fullAddress !== "-"
      ? fullAddress
      : undefined;

  const id = client.clientID || 0;
  const tier = isInactive(client)
    ? "INACTIVE"
    : options?.planName?.trim() || "GOLD";

  const national = client.phoneNumber?.trim() || "";
  const code = client.phoneCodeNumber?.trim().replace(/\D/g, "");
  const phone =
    code && code !== "-" && national && national !== "-"
      ? `+${code} ${national}`
      : national && national !== "-"
        ? national
        : "";

  const faceId = client.faceID?.trim();
  const docFileName = client.DocFileName?.trim();
  const normalizedFile =
    docFileName && docFileName !== "-" ? docFileName : undefined;

  return {
    id: memberIdFromClient(client),
    firstName: firstName || "—",
    lastName,
    tier,
    enrollmentDate: isoDatePart(readEnrollment(client)),
    renewalDate: isoDatePart(readRenewal(client)),
    monthlyVisits: 0,
    avgSessionTime: 0,
    email:
      client.email?.trim() && client.email !== "-"
        ? client.email.trim()
        : undefined,
    phone,
    emergencyPhone: readEmergencyPhone(client),
    address,
    idDocumentDataUrl: readDocDataUrl(client),
    docFileName: normalizedFile,
    faceIdEnrolled: faceId ? true : undefined,
    faceIdTemplateId: faceId || undefined,
    isDirectDebit: client.isDirectDebit === true ? true : undefined,
    regularPrice:
      client.isDirectDebit !== true && client.priceRegular != null
        ? Number(client.priceRegular)
        : undefined,
    directDebitPrice:
      client.isDirectDebit === true && client.priceDirectDebit != null
        ? Number(client.priceDirectDebit)
        : undefined,
    dateAdded: client.dateAdded?.trim() || null,
  };
}

export function clientsToMembers(
  clients: CatalogClient[],
  planNameById?: Record<number, string>,
): Member[] {
  return clients.map((c) =>
    clientToMember(c, { planName: planNameById?.[c.planID ?? 0] }),
  );
}
