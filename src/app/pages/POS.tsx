import { useLocation } from "react-router";
import { PosTerminal } from "@/features/pos";

export default function POS() {
  const location = useLocation();
  const linkedMember =
    (location.state as { memberId?: string; memberName?: string } | null) ?? null;

  return <PosTerminal linkedMember={linkedMember} />;
}
