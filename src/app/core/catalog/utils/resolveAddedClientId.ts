const MEMBER_NO_RE = /[A-Z]{2,5}-\d{4}-\d{3,}/i;

/** Saca "MTS-2611-00063" de "Membresía #: MTS-2611-00063". */
export function memberNumberFromAddData(data: unknown): string | null {
  if (typeof data !== "string") return null;
  const m = data.match(MEMBER_NO_RE);
  return m ? m[0].toUpperCase() : null;
}

type RawClient = Record<string, unknown>;

function field(row: RawClient, ...keys: string[]): unknown {
  for (const k of keys) if (row[k] != null) return row[k];
  return undefined;
}

/** Busca en la lista cruda de ViewAll el ClientID del socio con ese MemberID. */
export function findClientIdByMemberNumber(
  rows: unknown,
  memberNumber: string,
): number | null {
  if (!Array.isArray(rows)) return null;
  const target = memberNumber.trim().toUpperCase();
  for (const r of rows as RawClient[]) {
    const mid = String(field(r, "MemberID", "memberID", "memberId") ?? "")
      .trim()
      .toUpperCase();
    if (mid === target) {
      const id = Number(field(r, "ClientID", "clientID", "clientId"));
      return Number.isFinite(id) && id > 0 ? id : null;
    }
  }
  return null;
}

/** Saca el arreglo de socios de la respuesta cruda de ViewAll. */
export function rawClientRows(data: unknown): RawClient[] {
  if (Array.isArray(data)) return data as RawClient[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["genericList", "GenericList", "items", "clients", "client", "list"]) {
      if (Array.isArray(obj[key])) return obj[key] as RawClient[];
    }
  }
  return [];
}

/** Respaldo: el ClientID más alto con ese correo o teléfono (el recién creado). */
export function findNewestClientIdByContact(
  rows: RawClient[],
  email: string,
  phone: string,
): number | null {
  const mail = email.trim().toLowerCase();
  const digits = phone.replace(/\D/g, "");
  let best: number | null = null;
  for (const r of rows) {
    const rMail = String(field(r, "Email", "email") ?? "").trim().toLowerCase();
    const rPhone = String(field(r, "PhoneNumber", "phoneNumber") ?? "").replace(/\D/g, "");
    const sameMail = mail !== "" && rMail === mail;
    const samePhone = digits.length >= 7 && rPhone.endsWith(digits);
    if (!sameMail || !samePhone) continue;
    const id = Number(field(r, "ClientID", "clientID", "clientId"));
    if (Number.isFinite(id) && id > 0 && (best === null || id > best)) best = id;
  }
  return best;
}