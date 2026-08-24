import { NextResponse } from "next/server";
import { UpstoxProvider } from "@/integrations/market/adapters/upstox.provider";

export async function GET() {
  const provider = new UpstoxProvider();
  const loginUrl = provider.getLoginUrl();

  return NextResponse.json(
    {
      success: true,
      loginUrl,
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
