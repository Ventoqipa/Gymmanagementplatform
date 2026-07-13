import { createPosConfig } from "@/features/pos";
import { getSessionPayer } from "../core/auth/authStorage";
import { listClientsUseCase } from "../core/catalog";
import { loadMembers } from "../lib/membersStore";

function memberFullName(m: { firstName: string; lastName: string }): string {
  return `${m.firstName} ${m.lastName}`.trim();
}

/** Config POS Elite Gym — productos y ventas vía POS API REST. */
export const gymPosConfig = createPosConfig({
  useMock: import.meta.env.VITE_POS_USE_MOCK === "true",
  getSessionPayer: () => getSessionPayer(),
  loadCustomers: async () => {
    const result = await listClientsUseCase();
    const members = result.ok ? result.members : loadMembers();
    return members.map((m) => ({
      id: m.id,
      name: memberFullName(m),
    }));
  },
});
