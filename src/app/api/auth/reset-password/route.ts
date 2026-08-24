import { NextResponse } from "next/server";
import { resetPassword, verifyPasswordResetToken, validatePassword } from "@/modules/auth/services/passwordReset.service";
import { passwordResetSchema } from "@/modules/auth/validators/auth.validator";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";

  if (!token) {
    return NextResponse.json(
      { success: false, valid: false, message: "Reset token is required." },
      { status: 400 }
    );
  }

  const resetRecord = await verifyPasswordResetToken(token);
  if (!resetRecord) {
    return NextResponse.json(
      { success: false, valid: false, message: "Reset token is invalid or expired." },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, valid: true });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = passwordResetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: parsed.error.issues[0]?.message ?? "Validation failed." },
        { status: 422 }
      );
    }

    const validation = validatePassword(parsed.data.password);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.message },
        { status: 422 }
      );
    }

    const resetRecord = await verifyPasswordResetToken(parsed.data.token);
    if (!resetRecord) {
      return NextResponse.json(
        { success: false, message: "Reset token is invalid or expired." },
        { status: 400 }
      );
    }

    const resetSuccess = await resetPassword(parsed.data.token, parsed.data.password);
    if (!resetSuccess) {
      return NextResponse.json(
        { success: false, message: "Reset token is invalid or expired." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: "Password reset successfully." });
  } catch (error) {
    console.error("[password-reset] Reset failed:", error);
    return NextResponse.json({ success: false, message: "Unable to reset password." }, { status: 500 });
  }
}
