import { NextResponse } from "next/server";
import { verifyUserCredentials } from "@/modules/auth/services/auth.service";
import { loginSchema } from "@/modules/auth/validators/auth.validator";
import {
  checkLoginRateLimit,
  normalizeIpAddress,
  recordFailedLoginAttempt,
  resetLoginAttempts,
  RATE_LIMIT_MESSAGE,
} from "@/services/loginRateLimitService";
import type { NextRequest } from "next/server";

/**
 * POST /api/auth/login (Backend API)
 * Custom credentials login endpoint used by the frontend BFF layer.
 * Validates credentials, enforces rate limiting, and returns the user profile
 * on success. The frontend manages its own session cookie.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message ?? "Validation failed." },
        { status: 422 }
      );
    }

    const { email, password } = parsed.data;

    // Rate limiting
    const forwardedFor = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown";
    const rawIp = forwardedFor.split(",")[0]?.trim() ?? "unknown";
    const ipAddress = normalizeIpAddress(rawIp);

    const rateLimitResult = await checkLoginRateLimit({ email, ipAddress });
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { success: false, message: RATE_LIMIT_MESSAGE },
        { status: 429 }
      );
    }

    // Verify credentials
    const user = await verifyUserCredentials({ email, password });

    if (!user) {
      await recordFailedLoginAttempt({ email, ipAddress });
      return NextResponse.json(
        { success: false, message: "Invalid email or password." },
        { status: 401 }
      );
    }

    if ("blocked" in user) {
      return NextResponse.json(
        { success: false, message: "Please verify your email address before logging in. Check your inbox for the verification link." },
        { status: 403 }
      );
    }

    // Reset rate limit on success
    await resetLoginAttempts({ email, ipAddress });

    // Map backend role to frontend accountType
    const accountTypeMap: Record<string, string> = {
      FREE: "Registered",
      PREMIUM: "Premium",
      INSTITUTIONAL: "Premium",
      ADMIN: "Premium",
    };

    return NextResponse.json({
      success: true,
      message: "Login successful.",
      user: {
        id: user.id,
        name: user.name ?? "",
        email: user.email,
        role: user.role,
        accountType: accountTypeMap[user.role] ?? "Registered",
      },
    });
  } catch (error) {
    console.error("[auth/login] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again later." },
      { status: 500 }
    );
  }
}
