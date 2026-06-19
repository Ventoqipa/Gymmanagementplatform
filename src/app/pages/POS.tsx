import { useLocation } from "react-router";
import {
  PosProvider,
  PosTerminal,
  type LinkedCustomer,
} from "@/features/pos";
import { gymPosConfig } from "../config/posHost";

export default function POS() {
  const location = useLocation();
  const state = (location.state as { memberId?: string; memberName?: string } | null) ?? null;

  const linkedCustomer: LinkedCustomer | null =
    state?.memberId && state?.memberName
      ? { id: state.memberId, name: state.memberName }
      : null;

  return (
    <PosProvider config={gymPosConfig} linkedCustomer={linkedCustomer}>
      <PosTerminal />
    </PosProvider>
  );
}
