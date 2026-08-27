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
  turnstileCommand,
  verifyFaceId,
} from "./client";
