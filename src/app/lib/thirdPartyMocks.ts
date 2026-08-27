/**
 * Tipos y mocks FaceID / torniquetes.
 * Contrato canónico: docs/CONTRATO-ACCESS-GATEWAY.md
 * Cliente real/mock: src/app/core/accessGateway
 */

import {
  buildAccessCaptureDataUrl,
  buildUnknownCaptureDataUrl,
} from "./accessCaptureImage";

export type {
  FaceIdEnrollRequest,
  FaceIdEnrollResponse,
  FaceIdVerifyRequest,
  FaceIdVerifyResponse,
  TurnstileCommandRequest,
  TurnstileCommandResponse,
} from "../core/accessGateway/types";

import type {
  FaceIdEnrollRequest,
  FaceIdEnrollResponse,
  FaceIdVerifyRequest,
  FaceIdVerifyResponse,
  TurnstileCommandRequest,
  TurnstileCommandResponse,
} from "../core/accessGateway/types";

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
      captureSnapshotUrl: buildUnknownCaptureDataUrl(),
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
    captureSnapshotUrl: buildAccessCaptureDataUrl(pick.memberName, { granted: true }),
  };
}

/** POST /v1/biometric/enroll */
export async function mockFaceIdEnroll(req: FaceIdEnrollRequest): Promise<FaceIdEnrollResponse> {
  const latencyMs = 520 + Math.round(Math.random() * 380);
  await delay(latencyMs);
  return {
    ok: true,
    templateId: `tmpl_${req.memberId.replace(/\W/g, "")}_${Math.random().toString(36).slice(2, 8)}`,
    vendorRequestId: `fv_enroll_${Math.random().toString(36).slice(2, 10)}`,
    qualityScore: 0.91 + Math.random() * 0.08,
    latencyMs,
    terminalId: req.terminalId,
    enrolledAtIso: new Date().toISOString(),
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
