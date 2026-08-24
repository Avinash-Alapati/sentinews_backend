import { NextResponse } from "next/server";
import { createPasswordResetToken } from "@/modules/auth/services/passwordReset.service";
import { passwordResetRequestSchema } from "@/modules/auth/validators/auth.validator";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = passwordResetRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ success: true, message: "If an account with that email exists, a password reset link has been sent." }, { status: 200 });
    }

    const email = parsed.data.email;

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3002";
    await createPasswordResetToken(email, baseUrl);

    return NextResponse.json({
      success: true,
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("[password-reset] Request failed:", error);
    return NextResponse.json({ success: true, message: "If an account with that email exists, a password reset link has been sent." });
  }
}
