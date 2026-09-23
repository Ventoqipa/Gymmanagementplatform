export {
  accessGatewayConfig,
  accessGatewayUrl,
  isAccessGatewayConfigured,
  setAccessGatewayRuntimeUrl,
} from "../../config/accessGateway";

export {
  ACCESS_TERMINALS,
  buildEnrollPayload,
  clientIdFromMemberId,
  type AccessGatewayEvent,
  type AccessTerminalId,
  type FaceIdEnrollErrorBody,
  type FaceIdEnrollErrorCode,
  type FaceIdEnrollRequest,
  type FaceIdEnrollResponse,
  type FaceIdVerifyRequest,
  type FaceIdVerifyResponse,
  type TurnstileCommandRequest,
  type TurnstileCommandResponse,
} from "./types";

export {
  AccessGatewayError,
  enrollFaceId,
  fetchAccessEvents,
  fetchGatewayActivity,
  fetchGatewayDiagnostics,
  pingAccessGateway,
  reconnectEliteToGateway,
  runGatewayDiagnostics,
  turnstileCommand,
  verifyFaceId,
  type GatewayActivityRow,
  type GatewayDiagnostics,
  type GatewayReconnectResult,
} from "./client";
