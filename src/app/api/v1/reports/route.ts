import { NextRequest, NextResponse } from "next/server";
import { reportAggregationService } from "@/modules/market-intelligence/services/report-aggregation.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get("type") as "pre-market" | "post-market") || "pre-market";

    const reportData = await reportAggregationService.getMarketReports(type);

    return NextResponse.json({
      success: true,
      data: reportData,
    });
  } catch (error) {
    console.error("[GET /api/v1/reports]", error);
    return NextResponse.json(
      { success: false, message: "Failed to generate market reports." },
      { status: 500 }
    );
  }
}
