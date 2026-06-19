import type { Member } from "../../../lib/membersStore";
import type { CatalogClient } from "../types";

function isoDatePart(value?: string | null): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toISOString().slice(0, 10);
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

export function clientToMember(client: CatalogClient): Member {
  const fullAddress = client.fullAddress?.trim();
  const address =
    (fullAddress && fullAddress !== "-" ? fullAddress : "") ||
    [client.street, client.colony].filter((p) => p.trim() && p !== "-").join(", ");
  return {
    id: memberIdFromClient(client),
    firstName: client.firstName?.trim() || "—",
    lastName: client.lastName?.trim() || "",
    tier: client.isEnabled === false ? "INACTIVE" : "GOLD",
    enrollmentDate: isoDatePart(client.enrollment),
    renewalDate: isoDatePart(client.renewal),
    monthlyVisits: 0,
    avgSessionTime: 0,
    email: client.email?.trim() || undefined,
    phone: client.phoneNumber?.trim() || "",
    address: address || undefined,
    faceIdEnrolled: undefined,
  };
}

export function clientsToMembers(clients: CatalogClient[]): Member[] {
  return clients.map(clientToMember);
}
