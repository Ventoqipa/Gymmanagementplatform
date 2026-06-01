import { loadJson, saveJson } from "./storage";

const MEMBERS_KEY = "elite_gym_v1_members";

export type Member = {
  id: string;
  firstName: string;
  lastName: string;
  tier: string;
  enrollmentDate: string;
  renewalDate: string;
  monthlyVisits: number;
  avgSessionTime: number;
  email?: string;
  phone: string;
  address?: string;
  idDocumentDataUrl?: string;
  faceIdEnrolled?: boolean;
  faceIdTemplateId?: string;
};

export function loadMembers(): Member[] {
  return loadJson<Member[]>(MEMBERS_KEY, []);
}

export function saveMembers(members: Member[]): void {
  saveJson(MEMBERS_KEY, members);
}

export function getActiveMembersCount(members: Member[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return members.filter((m) => {
    const end = new Date(m.renewalDate + "T12:00:00");
    end.setHours(0, 0, 0, 0);
    return end >= today;
  }).length;
}
