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

export function clientToMember(
  client: CatalogClient,
  options?: { planName?: string },
): Member {
  let firstName = client.firstName?.trim() || "";
  let lastName = client.lastName?.trim() || "";
  if (!firstName && client.fullName?.trim()) {
    const parts = client.fullName.trim().split(/\s+/).filter(Boolean);
    firstName = parts[0] ?? "—";
    lastName = parts.slice(1).join(" ");
  }

  const fullAddress = client.fullAddress?.trim();
  const address =
    fullAddress && fullAddress !== "-"
      ? fullAddress
      : undefined;

  const id = client.clientID || 0;
  const tier =
    client.isEnabled === false
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

  return {
    id: memberIdFromClient(client),
    firstName: firstName || "—",
    lastName,
    tier,
    enrollmentDate: isoDatePart(client.enrollment),
    renewalDate: isoDatePart(client.renewal),
    monthlyVisits: (id % 15) + 4,
    avgSessionTime: 35 + (id % 25),
    email:
      client.email?.trim() && client.email !== "-"
        ? client.email.trim()
        : undefined,
    phone,
    address,
    faceIdEnrolled: undefined,
  };
}

export function clientsToMembers(
  clients: CatalogClient[],
  planNameById?: Record<number, string>,
): Member[] {
  return clients.map((c) =>
    clientToMember(c, { planName: planNameById?.[c.planID] }),
  );
}
