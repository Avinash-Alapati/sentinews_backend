import { NextResponse, type NextRequest } from "next/server";
import { handlers } from "@/lib/auth";
import {
  RATE_LIMIT_MESSAGE,
  checkLoginRateLimit,
  normalizeIpAddress,
  recordFailedLoginAttempt,
  resetLoginAttempts,
} from "@/services/loginRateLimitService";
import { loginSchema } from "@/modules/auth/validators/auth.validator";

const getClientIp = (request: NextRequest) => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  const requestIp = (request as NextRequest & { ip?: string }).ip;
  return requestIp?.trim() ?? "unknown";
};

const parseCredentialBody = async (request: NextRequest) => {
  const jsonBody = await request.clone().json().catch(() => null);
  if (jsonBody && typeof jsonBody === "object") {
    return jsonBody;
  }

  const formData = await request.clone().formData().catch(() => null);
  if (formData) {
    return Object.fromEntries(formData.entries());
  }

  return null;
};

const createAuthErrorResponse = (message: string, status: number) =>
  NextResponse.json({ success: false, message }, { status });

export const { GET } = handlers;

export async function POST(request: NextRequest) {
  try {
    const body = await parseCredentialBody(request);
    const looksLikeCredentialLogin =
      body &&
      typeof body === "object" &&
      "email" in body &&
      "password" in body;

    if (!looksLikeCredentialLogin) {
      return handlers.POST(request);
    }

    const email = typeof body.email === "string" ? body.email : "";
    const rawIpAddress = getClientIp(request);
    const ipAddress = normalizeIpAddress(rawIpAddress);

    const parsed = loginSchema.safeParse({ email, password: typeof body.password === "string" ? body.password : "" });
    if (!parsed.success) {
      return createAuthErrorResponse(parsed.error.issues[0]?.message ?? "Validation failed.", 422);
    }

    const rateLimitResult = await checkLoginRateLimit({ email, ipAddress });
    if (!rateLimitResult.allowed) {
      return createAuthErrorResponse(RATE_LIMIT_MESSAGE, 429);
    }

    const response = await handlers.POST(request);
    const responseBody = await response.clone().json().catch(() => null);
    const isCredentialsError =
      response.status === 401 ||
      (responseBody && typeof responseBody === "object" && responseBody.error === "CredentialsSignin") ||
      (responseBody && typeof responseBody === "object" && responseBody.ok === false);

    if (isCredentialsError) {
      const failedAttempt = await recordFailedLoginAttempt({ email, ipAddress });
      const now = Date.now();
      const isNowBlocked =
        failedAttempt?.blockedUntil && new Date(failedAttempt.blockedUntil).getTime() > now;

      if (isNowBlocked) {
        return createAuthErrorResponse(RATE_LIMIT_MESSAGE, 429);
      }

      return createAuthErrorResponse("Invalid email or password.", 401);
    }

    await resetLoginAttempts({ email, ipAddress });
    return response;
  } catch (error) {
    console.error("[auth] Failed to process login request:", error);
    return createAuthErrorResponse("Something went wrong. Please try again later.", 500);
  }
}
