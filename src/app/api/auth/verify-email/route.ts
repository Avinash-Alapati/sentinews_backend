import { NextResponse } from "next/server";
import { verifyEmailToken } from "@/modules/auth/services/security.service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";

  if (!token) {
    return NextResponse.json({ success: false, message: "Verification token is required." }, { status: 400 });
  }

  const userId = await verifyEmailToken(token);
  if (!userId) {
    return NextResponse.json({ success: false, message: "Verification link is invalid or expired." }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: "Email verified successfully." });
}
