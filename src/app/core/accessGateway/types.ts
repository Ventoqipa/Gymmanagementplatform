/**
 * Contrato Access Gateway ↔ Elite (Face ID / torniquetes).
 * Doc: docs/CONTRATO-ACCESS-GATEWAY.md
 */

/** Inventario lógico Elite ↔ hardware confirmado en sitio. */
export type AccessTerminalId = "TRN-MAIN-01" | "TRN-MAIN-02" | (string & {});

export const ACCESS_TERMINALS: Record<
  string,
  { serial: string; model: string; label: string }
> = {
  "TRN-MAIN-01": {
    serial: "SYZ8244300163",
    model: "SpeedFace-V5L",
    label: "Entrada principal",
  },
  "TRN-MAIN-02": {
    serial: "SYZ8244300350",
    model: "SpeedFace-V5L",
    label: "Entrada lateral",
  },
};

/** POST /v1/biometric/enroll */
export type FaceIdEnrollRequest = {
  terminalId: AccessTerminalId;
  /** Formato Elite: CLI-{clientID} */
  memberId: string;
  displayName?: string;
  /** Si se omite, el Gateway lo deriva de memberId. */
  clientId?: number;
  /** PIN en dispositivo; default String(clientId). */
  pin?: string;
  /** Default 120. */
  timeoutSeconds?: number;
};

export type FaceIdEnrollResponse = {
  ok: true;
  /** Persistir en Catálogo como faceID. */
  templateId: string;
  vendorRequestId: string;
  /** 0–1 */
  qualityScore: number;
  latencyMs: number;
  terminalId: string;
  deviceSerial?: string;
  pin?: string;
  enrolledAtIso?: string;
};

export type FaceIdEnrollErrorCode =
  | "INVALID_REQUEST"
  | "TERMINAL_NOT_FOUND"
  | "CAPTURE_TIMEOUT"
  | "ALREADY_ENROLLED"
  | "DEVICE_OFFLINE"
  | "ADMS_UNAVAILABLE"
  | "LOW_QUALITY"
  | "NETWORK"
  | "UNKNOWN";

export type FaceIdEnrollErrorBody = {
  ok: false;
  code: FaceIdEnrollErrorCode;
  message: string;
  vendorRequestId?: string;
  terminalId?: string;
};

/** POST /v1/biometric/verify */
export type FaceIdVerifyRequest = {
  terminalId: AccessTerminalId;
  captureSessionId: string;
  faceTemplateRef?: string;
};

export type FaceIdVerifyResponse = {
  match: boolean;
  confidence: number;
  memberId?: string;
  memberName?: string;
  membershipTier?: string;
  denyReason?: "NO_MATCH" | "SUSPENDED" | "EXPIRED";
  vendorRequestId: string;
  latencyMs: number;
  captureSnapshotUrl?: string;
};

/** POST /v1/turnstile/command */
export type TurnstileCommandRequest = {
  terminalId: AccessTerminalId;
  command: "OPEN" | "CLOSE" | "HOLD";
  correlationId: string;
};

export type TurnstileCommandResponse = {
  accepted: boolean;
  vendorCommandId: string;
  appliedAtIso: string;
};

export function clientIdFromMemberId(memberId: string): number | null {
  const m = memberId.trim().match(/^CLI-(\d+)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function buildEnrollPayload(
  input: FaceIdEnrollRequest,
): FaceIdEnrollRequest {
  const clientId =
    input.clientId ?? clientIdFromMemberId(input.memberId) ?? undefined;
  const pin = input.pin ?? (clientId != null ? String(clientId) : undefined);
  return {
    ...input,
    memberId: input.memberId.trim(),
    displayName: input.displayName?.trim() || undefined,
    clientId,
    pin,
    timeoutSeconds: input.timeoutSeconds ?? 120,
  };
}
