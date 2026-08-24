import { NextRequest, NextResponse } from "next/server";
import { UpstoxProvider } from "@/integrations/market/adapters/upstox.provider";
import { logger } from "@/shared/utils/logger";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { success: false, message: "Authorization code is required." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const provider = new UpstoxProvider();
    await provider.exchangeAuthorizationCode(code);

    logger.info({ context: "upstox_auth" }, "[Upstox Auth] Successfully exchanged authorization code for access token.");

    return NextResponse.json(
      {
        success: true,
        connected: true,
        message: "Upstox account connected successfully.",
      },
      { headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    logger.error({ error: message }, "[Upstox Auth] Failed to exchange authorization code.");

    return NextResponse.json(
      { success: false, message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}
