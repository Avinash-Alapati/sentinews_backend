import { NextResponse } from "next/server";
import { UpstoxProvider } from "@/integrations/market/adapters/upstox.provider";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET() {
  const provider = new UpstoxProvider();
  const token = provider.getActiveAccessToken();

  let isConnected = false;
  if (token) {
    try {
      const res = await fetch("https://api.upstox.com/v2/user/profile", {
        headers: {
          accept: "application/json",
          "Api-Version": "2.0",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        isConnected = true;
      } else {
        provider.clearAccessToken();
      }
    } catch {
      // network / offline check
      isConnected = false;
    }
  }

  return NextResponse.json(
    {
      success: true,
      connected: isConnected,
      hasToken: isConnected,
      provider: isConnected ? "Upstox API v2" : "Yahoo Finance (NSE Fallback)",
    },
    { headers: CORS_HEADERS }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: CORS_HEADERS,
  });
}
