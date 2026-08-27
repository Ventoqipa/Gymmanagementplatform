import {
  accessGatewayConfig,
  accessGatewayUrl,
  isAccessGatewayConfigured,
} from "../../config/accessGateway";
import {
  mockFaceIdEnroll,
  mockFaceIdVerify,
  mockTurnstileCommand,
} from "../../lib/thirdPartyMocks";
import {
  buildEnrollPayload,
  type FaceIdEnrollErrorBody,
  type FaceIdEnrollRequest,
  type FaceIdEnrollResponse,
  type FaceIdVerifyRequest,
  type FaceIdVerifyResponse,
  type TurnstileCommandRequest,
  type TurnstileCommandResponse,
} from "./types";

export class AccessGatewayError extends Error {
  readonly code: FaceIdEnrollErrorBody["code"];
  readonly statusCode: number;
  readonly vendorRequestId?: string;
  readonly terminalId?: string;

  constructor(
    message: string,
    options: {
      code: FaceIdEnrollErrorBody["code"];
      statusCode: number;
      vendorRequestId?: string;
      terminalId?: string;
    },
  ) {
    super(message);
    this.name = "AccessGatewayError";
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.vendorRequestId = options.vendorRequestId;
    this.terminalId = options.terminalId;
  }
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

/**
 * Enrolamiento Face ID.
 * Sin VITE_ACCESS_GATEWAY_URL → mock (desarrollo).
 * Con URL → POST /v1/biometric/enroll al Gateway del gym.
 */
export async function enrollFaceId(
  input: FaceIdEnrollRequest,
): Promise<FaceIdEnrollResponse> {
  const payload = buildEnrollPayload(input);

  if (!isAccessGatewayConfigured()) {
    const mock = await mockFaceIdEnroll({
      terminalId: payload.terminalId,
      memberId: payload.memberId,
      displayName: payload.displayName,
    });
    return {
      ...mock,
      pin: payload.pin ?? mock.pin,
    };
  }

  let response: Response;
  try {
    response = await fetch(accessGatewayUrl(accessGatewayConfig.enrollPath), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    throw new AccessGatewayError(
      error instanceof Error ? error.message : "Sin conexión al Access Gateway.",
      { code: "NETWORK", statusCode: 0, terminalId: payload.terminalId },
    );
  }

  const body = await parseJsonSafe(response);

  if (!response.ok) {
    const err = (body ?? {}) as Partial<FaceIdEnrollErrorBody>;
    throw new AccessGatewayError(
      err.message || `Enrolamiento falló (HTTP ${response.status}).`,
      {
        code: err.code ?? "UNKNOWN",
        statusCode: response.status,
        vendorRequestId: err.vendorRequestId,
        terminalId: err.terminalId ?? payload.terminalId,
      },
    );
  }

  const data = body as Partial<FaceIdEnrollResponse> | null;
  if (!data?.templateId) {
    throw new AccessGatewayError("Respuesta de enroll sin templateId.", {
      code: "UNKNOWN",
      statusCode: response.status,
      terminalId: payload.terminalId,
    });
  }

  if (
    typeof data.qualityScore === "number" &&
    data.qualityScore < accessGatewayConfig.minQualityScore
  ) {
    throw new AccessGatewayError(
      `Calidad insuficiente (${data.qualityScore}). Mínimo ${accessGatewayConfig.minQualityScore}.`,
      {
        code: "LOW_QUALITY",
        statusCode: 422,
        vendorRequestId: data.vendorRequestId,
        terminalId: payload.terminalId,
      },
    );
  }

  return {
    ok: true,
    templateId: data.templateId,
    vendorRequestId: data.vendorRequestId ?? `enroll_${Date.now()}`,
    qualityScore: data.qualityScore ?? 0,
    latencyMs: data.latencyMs ?? 0,
    terminalId: data.terminalId ?? payload.terminalId,
    deviceSerial: data.deviceSerial,
    pin: data.pin ?? payload.pin,
    enrolledAtIso: data.enrolledAtIso ?? new Date().toISOString(),
  };
}

/** Verify: Gateway real o mock. */
export async function verifyFaceId(
  input: FaceIdVerifyRequest,
): Promise<FaceIdVerifyResponse> {
  if (!isAccessGatewayConfigured()) {
    return mockFaceIdVerify(input);
  }
  const response = await fetch(accessGatewayUrl(accessGatewayConfig.verifyPath), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
  const body = await parseJsonSafe(response);
  if (!response.ok) {
    throw new AccessGatewayError(
      `Verify falló (HTTP ${response.status}).`,
      { code: "UNKNOWN", statusCode: response.status, terminalId: input.terminalId },
    );
  }
  return body as FaceIdVerifyResponse;
}

/** Comando torniquete: Gateway real o mock. */
export async function turnstileCommand(
  input: TurnstileCommandRequest,
): Promise<TurnstileCommandResponse> {
  if (!isAccessGatewayConfigured()) {
    return mockTurnstileCommand(input);
  }
  const response = await fetch(
    accessGatewayUrl(accessGatewayConfig.turnstilePath),
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );
  const body = await parseJsonSafe(response);
  if (!response.ok) {
    throw new AccessGatewayError(
      `Comando torniquete falló (HTTP ${response.status}).`,
      { code: "UNKNOWN", statusCode: response.status, terminalId: input.terminalId },
    );
  }
  return body as TurnstileCommandResponse;
}
