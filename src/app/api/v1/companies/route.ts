import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/shared/lib/prisma";
import { stockMasterService } from "@/modules/market-intelligence/services/stock-master.service";

const DEFAULT_COMPANIES = [
  { ticker: "RELIANCE", name: "Reliance Industries Ltd.", sector: "Energy & Oil", price: 2950.25, changePercent: 1.45 },
  { ticker: "TCS", name: "Tata Consultancy Services", sector: "Information Tech", price: 4120.50, changePercent: 1.50 },
  { ticker: "INFY", name: "Infosys Limited", sector: "Information Tech", price: 1580.10, changePercent: 1.85 },
  { ticker: "HDFCBANK", name: "HDFC Bank Ltd.", sector: "Banking & Finance", price: 1620.45, changePercent: -0.65 },
  { ticker: "ICICIBANK", name: "ICICI Bank Ltd.", sector: "Banking & Finance", price: 1180.40, changePercent: 1.22 },
  { ticker: "SBIN", name: "State Bank of India", sector: "Banking & Finance", price: 845.30, changePercent: -3.20 },
  { ticker: "BHARTIARTL", name: "Bharti Airtel Ltd.", sector: "Telecom", price: 1410.60, changePercent: 0.80 },
  { ticker: "ITC", name: "ITC Limited", sector: "Consumer Goods", price: 495.60, changePercent: 1.10 },
  { ticker: "LTIM", name: "LTIMindtree Ltd.", sector: "Information Tech", price: 4645.40, changePercent: 2.58 },
  { ticker: "WIPRO", name: "Wipro Limited", sector: "Information Tech", price: 480.20, changePercent: -2.10 },
  { ticker: "TATAMOTORS", name: "Tata Motors Ltd.", sector: "Automotive", price: 980.60, changePercent: 2.30 },
  { ticker: "PAYTM", name: "One97 Communications (Paytm)", sector: "Consumer Tech", price: 1584.10, changePercent: 9.88 },
  { ticker: "ZOMATO", name: "Zomato Limited", sector: "Consumer Tech", price: 265.40, changePercent: 3.35 },
  { ticker: "AARTIPHARM", name: "Aarti Pharmalabs Ltd.", sector: "Healthcare & Pharma", price: 823.00, changePercent: 20.00 },
  { ticker: "SUZLON", name: "Suzlon Energy Ltd.", sector: "Energy & Oil", price: 78.40, changePercent: 4.67 },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim().toLowerCase() || "";

    // 1. First, search stockMasterService memory catalog (3,700+ equities)
    const allMaster = stockMasterService.getAllStocks();
    let masterMatches = query
      ? allMaster.filter(
          (s) =>
            s.symbol.toLowerCase().includes(query) ||
            s.name.toLowerCase().includes(query) ||
            (s.sector && s.sector.toLowerCase().includes(query))
        )
      : allMaster;

    // Limit to top 20 matches sorted by exact symbol match priority
    masterMatches = masterMatches.sort((a, b) => {
      const aSymExact = a.symbol.toLowerCase() === query;
      const bSymExact = b.symbol.toLowerCase() === query;
      if (aSymExact && !bSymExact) return -1;
      if (!aSymExact && bSymExact) return 1;

      const aSymStart = a.symbol.toLowerCase().startsWith(query);
      const bSymStart = b.symbol.toLowerCase().startsWith(query);
      if (aSymStart && !bSymStart) return -1;
      if (!aSymStart && bSymStart) return 1;

      return a.symbol.localeCompare(b.symbol);
    }).slice(0, 20);

    let results = masterMatches.map((m) => ({
      ticker: m.symbol,
      name: m.name,
      sector: m.sector || "Equities",
      price: m.lastPrice || 0,
      changePercent: 0,
    }));

    // 2. If master memory catalog didn't produce results, query DB
    if (results.length === 0) {
      try {
        const dbCompanies = await prisma.stockTicker.findMany({
          where: query
            ? {
                OR: [
                  { symbol: { contains: query, mode: "insensitive" } },
                  { name: { contains: query, mode: "insensitive" } },
                ],
              }
            : undefined,
          take: 20,
        });

        results = dbCompanies.map((c: { symbol: string; name: string; sector?: string }) => ({
          ticker: c.symbol,
          name: c.name,
          sector: c.sector || "General",
          price: 0,
          changePercent: 0,
        }));
      } catch (err) {
        console.warn("[GET /api/v1/companies] DB query skipped:", err);
      }
    }

    // 3. Fallback to default list if still empty
    if (results.length === 0) {
      results = DEFAULT_COMPANIES.filter(
        (c) =>
          !query ||
          c.ticker.toLowerCase().includes(query) ||
          c.name.toLowerCase().includes(query) ||
          c.sector.toLowerCase().includes(query)
      );
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("[GET /api/v1/companies]", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

