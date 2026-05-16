/**
 * Tipos y funciones de integración con el proveedor FaceID / torniquetes (sustituir por llamadas HTTP reales).
 */

export type FaceIdVerifyRequest = {
  terminalId: string;
  captureSessionId: string;
  /** Referencia de captura en el dispositivo */
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
};

export type TurnstileCommandRequest = {
  terminalId: string;
  command: "OPEN" | "CLOSE" | "HOLD";
  correlationId: string;
};

export type TurnstileCommandResponse = {
  accepted: boolean;
  vendorCommandId: string;
  appliedAtIso: string;
};

export type FaceIdEnrollRequest = {
  terminalId: string;
  memberId: string;
  displayName?: string;
};

export type FaceIdEnrollResponse = {
  templateId: string;
  vendorRequestId: string;
  qualityScore: number;
  latencyMs: number;
};

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** POST /v1/biometric/verify */
export async function mockFaceIdVerify(req: FaceIdVerifyRequest): Promise<FaceIdVerifyResponse> {
  const latencyMs = 180 + Math.round(Math.random() * 120);
  await delay(latencyMs);
  const vendorRequestId = `fv_req_${Math.random().toString(36).slice(2, 10)}`;

  const occasionalNoMatch = Math.random() < 0.1;
  if (occasionalNoMatch) {
    return {
      match: false,
      confidence: 0.38 + Math.random() * 0.15,
      denyReason: "NO_MATCH",
      vendorRequestId,
      latencyMs,
    };
  }
  const samples = [
    { memberId: "MEM-1247", memberName: "Marcus Chen", membershipTier: "ELITE_BLK" },
    { memberId: "MEM-1246", memberName: "Sarah Williams", membershipTier: "GOLD" },
    { memberId: "MEM-1245", memberName: "David Kim", membershipTier: "PLATINUM_ELITE" },
  ];
  const pick = samples[Math.floor(Math.random() * samples.length)];

  return {
    match: true,
    confidence: 0.982 + Math.random() * 0.01,
    memberId: pick.memberId,
    memberName: pick.memberName,
    membershipTier: pick.membershipTier,
    vendorRequestId,
    latencyMs,
  };
}

/** POST /v1/biometric/enroll */
export async function mockFaceIdEnroll(req: FaceIdEnrollRequest): Promise<FaceIdEnrollResponse> {
  const latencyMs = 520 + Math.round(Math.random() * 380);
  await delay(latencyMs);
  return {
    templateId: `tmpl_${req.memberId.replace(/\W/g, "")}_${Math.random().toString(36).slice(2, 8)}`,
    vendorRequestId: `fv_enroll_${Math.random().toString(36).slice(2, 10)}`,
    qualityScore: 0.91 + Math.random() * 0.08,
    latencyMs,
  };
}

/** POST /v1/turnstile/command */
export async function mockTurnstileCommand(req: TurnstileCommandRequest): Promise<TurnstileCommandResponse> {
  await delay(120 + Math.round(Math.random() * 80));
  return {
    accepted: true,
    vendorCommandId: `ts_cmd_${Math.random().toString(36).slice(2, 11)}`,
    appliedAtIso: new Date().toISOString(),
  };
}
