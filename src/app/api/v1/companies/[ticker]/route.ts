import { NextRequest, NextResponse } from "next/server";
import { MarketProviderFactory } from "@/integrations/market/factories/market-provider.factory";
import { newsRepository } from "@/modules/news-intelligence/repositories/news.repository";

import { stockMasterService } from "@/modules/market-intelligence/services/stock-master.service";

// Static company metadata for known tickers (used as fallback when DB is empty)
const COMPANY_META: Record<string, { name: string; sector: string; description: string }> = {
  AAPL: { name: "Apple Inc.", sector: "Technology", description: "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide." },
  MSFT: { name: "Microsoft Corporation", sector: "Technology", description: "Microsoft Corporation develops, licenses, and supports software, services, devices, and solutions worldwide." },
  GOOGL: { name: "Alphabet Inc.", sector: "Technology", description: "Alphabet Inc. provides Google Search, YouTube, Google Cloud, and advertising services globally." },
  NVDA: { name: "NVIDIA Corporation", sector: "Technology", description: "NVIDIA Corporation provides graphics, computing, and networking solutions worldwide." },
  TSLA: { name: "Tesla, Inc.", sector: "Automotive", description: "Tesla designs, develops, manufactures, leases, and sells electric vehicles and energy generation systems." },
  JPM: { name: "JPMorgan Chase & Co.", sector: "Banking", description: "JPMorgan Chase & Co. operates as a global financial services company providing investment banking and commercial banking services." },
  XOM: { name: "Exxon Mobil Corporation", sector: "Energy", description: "Exxon Mobil Corporation explores for, develops, and produces crude oil and natural gas in the United States and internationally." },
  AMZN: { name: "Amazon.com, Inc.", sector: "Technology", description: "Amazon engages in the retail sale of consumer products and subscriptions through digital and physical stores globally." },
  META: { name: "Meta Platforms, Inc.", sector: "Technology", description: "Meta Platforms builds technologies that help people connect through social media and the metaverse." },
  BRK: { name: "Berkshire Hathaway Inc.", sector: "Financials", description: "Berkshire Hathaway is a conglomerate holding company owning subsidiaries across insurance, utilities, manufacturing, and finance." },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const symbol = ticker.toUpperCase();

    // Fetch real-time quote from market provider
    const provider = new MarketProviderFactory().getProvider();
    const quote = await provider.getRealTimeQuote(symbol);

    // Get company meta from master service or fallback
    const masterStock = stockMasterService.getStockBySymbol(symbol);
    const meta = COMPANY_META[symbol] ?? {
      name: masterStock?.name || quote.name || symbol,
      sector: masterStock?.sector || "Equities",
      description: `${masterStock?.name || symbol} is an equity listed on NSE/BSE. Track real-time prices, news sentiment, and technical patterns on SentiNews Terminal.`,
    };

    // Build a 7-day simulated sentiment trend
    const sentimentTrend = Array.from({ length: 7 }, () => 60 + Math.floor(Math.random() * 25));

    // Search related articles from RSS by ticker/company name
    const allArticles = await newsRepository.getLatestNews();
    const searchTerms = [symbol.toLowerCase(), meta.name.split(" ")[0].toLowerCase()];
    const relatedArticles = allArticles
      .filter((a) =>
        searchTerms.some(
          (term) =>
            a.title.toLowerCase().includes(term) ||
            a.description.toLowerCase().includes(term)
        )
      )
      .slice(0, 5);

    // Build 7-day chart data from trend
    const chartData = sentimentTrend.map((score, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return {
        date: date.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
        sentiment: score,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        company: {
          ticker: symbol,
          name: meta.name,
          sector: meta.sector,
          description: meta.description,
          sentimentScore: sentimentTrend[sentimentTrend.length - 1],
          sentimentTrend,
          stockPrice: quote.currentPrice,
          stockChange: quote.changePercent,
        },
        relatedArticles,
        chartData,
      },
    });
  } catch (error) {
    console.error("[/api/v1/companies/[ticker]]", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch company data." },
      { status: 500 }
    );
  }
}
