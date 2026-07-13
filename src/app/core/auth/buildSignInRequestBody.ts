import { securityConfig } from "../../config/security";
import type { SignInRequestBody } from "./types";

/** Body SignIn alineado con swagger `Identification` (campos requeridos explícitos). */
export function buildSignInRequestBody(input: {
  hermesID: string;
  userPass: string;
  ipAddress: string;
}): SignInRequestBody {
  return {
    hermesID: input.hermesID.trim(),
    userPass: input.userPass,
    ipAddress: input.ipAddress.trim(),
    typeAccess: securityConfig.typeAccess,
    appID: securityConfig.appId,
  };
}
