import { getSignInUrl } from "../../config/security";
import { parseNetworkError, parseSignInErrorBody } from "./parseSignInError";
import type {
  SignInRequestBody,
  SignInSuccessData,
  TanosiApiResponse,
} from "./types";

export class SecurityApiError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "SecurityApiError";
    this.statusCode = statusCode;
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

export async function postSignIn(
  body: SignInRequestBody,
): Promise<SignInSuccessData> {
  let response: Response;

  try {
    response = await fetch(getSignInUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "*/*",
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new SecurityApiError(parseNetworkError(error), 0);
  }

  const payload = await parseJsonSafe(response);

  if (!response.ok) {
    throw new SecurityApiError(
      parseSignInErrorBody(response.status, payload),
      response.status,
    );
  }

  if (
    payload &&
    typeof payload === "object" &&
    "isResponseSuccessful" in payload
  ) {
    const envelope = payload as TanosiApiResponse<SignInSuccessData | "">;
    if (!envelope.isResponseSuccessful || envelope.statusCode >= 400) {
      throw new SecurityApiError(
        parseSignInErrorBody(envelope.statusCode, envelope),
        envelope.statusCode,
      );
    }
    if (!envelope.data || typeof envelope.data !== "object") {
      throw new SecurityApiError(
        "Respuesta de inicio de sesión incompleta.",
        envelope.statusCode,
      );
    }
    const data = envelope.data as SignInSuccessData;
    if (!data.token?.trim()) {
      throw new SecurityApiError(
        "Respuesta de inicio de sesión sin token.",
        envelope.statusCode,
      );
    }
    return data;
  }

  throw new SecurityApiError(
    parseSignInErrorBody(response.status, payload),
    response.status,
  );
}
