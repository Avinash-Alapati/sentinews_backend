import { NextRequest, NextResponse } from "next/server";
import { UpstoxProvider } from "@/integrations/market/adapters/upstox.provider";

const upstoxProvider = new UpstoxProvider();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get("timeframe") || "1M";

    const candles = await upstoxProvider.getCandleData(ticker.toUpperCase(), timeframe);

    return NextResponse.json({
      success: true,
      data: {
        symbol: ticker.toUpperCase(),
        timeframe,
        candles,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch candlestick data.";
    const stack = error instanceof Error ? error.stack : error;
    console.error("[/api/v1/companies/[ticker]/candles]", stack);
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
