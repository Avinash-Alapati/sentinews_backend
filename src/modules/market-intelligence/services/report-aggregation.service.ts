import { UpstoxProvider } from "@/integrations/market/adapters/upstox.provider";
import { globalMarketProvider } from "@/integrations/market/adapters/global-market.provider";
import { marketIntelligenceFacade } from "@/modules/market-intelligence";
import { newsRepository } from "@/modules/news-intelligence/repositories/news.repository";
import { sentimentIntelligenceFacade } from "@/modules/sentiment";
import { NewsArticle } from "@/modules/news-intelligence/types/news.types";
import { localCache } from "@/shared/lib/cache";

const SECTOR_MAPPING: Record<string, string> = {
  RELIANCE: "Energy",
  TCS: "IT Services",
  INFY: "IT Services",
  HDFCBANK: "Banking",
  ICICIBANK: "Banking",
  SBIN: "Banking",
  BHARTIARTL: "Telecom",
  ITC: "FMCG",
  HINDUNILVR: "FMCG",
  LT: "Capital Goods",
  AXISBANK: "Banking",
  KOTAKBANK: "Banking",
  TATAMOTORS: "Auto",
  TATASTEEL: "Metals",
  MARUTI: "Auto",
  SUNPHARMA: "Pharma",
  ASIANPAINT: "Consumer",
  HCLTECH: "IT Services",
  TITAN: "Consumer",
  ULTRACEMCO: "Cement",
  BAJFINANCE: "Financial Services",
  NTPC: "Energy",
  POWERGRID: "Energy",
  COALINDIA: "Energy",
  JSWSTEEL: "Metals",
  HINDALCO: "Metals",
  CIPLA: "Pharma",
  APOLLOHOSP: "Healthcare",
  WIPRO: "IT Services",
  LTIM: "IT Services",
  EICHERMOT: "Auto",
  HEROMOTOCO: "Auto",
};

export class ReportAggregationService {
  private upstoxProvider: UpstoxProvider;
  private static CACHE_TTL_SEC = 30; // 30 seconds

  constructor() {
    this.upstoxProvider = new UpstoxProvider();
  }

  async getMarketReports(type: "pre-market" | "post-market" = "pre-market") {
    const cacheKey = `reports_aggregation_${type}`;
    const cached = localCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const upstoxToken = this.upstoxProvider.getActiveAccessToken();
    const isUpstoxConnected = Boolean(upstoxToken);
    const indianMarketSource = isUpstoxConnected ? "Upstox API v2" : "Yahoo Finance (NSE Fallback)";

    // Tracked Indian Indices
    const indexSymbols = [
      "NIFTY50",
      "SENSEX",
      "BANKNIFTY",
      "INDIAVIX",
      "NIFTYIT",
      "NIFTYNEXT50",
      "NIFTYMIDCAP100",
      "NIFTYSMALLCAP100",
      "NIFTYAUTO",
      "NIFTYFMCG",
      "NIFTYMETAL",
      "NIFTYPHARMA",
    ];

    // Tracked Equities for Movers, Breadth, and Sector aggregation
    const equitySymbols = Object.keys(SECTOR_MAPPING);

    // Parallel extraction from all primary and legitimate external feeds
    const [
      indexQuotes,
      equityQuotes,
      globalIndices,
      riskGauges,
      commodities,
      currencies,
      optionChain,
      technicalNifty,
      technicalBankNifty,
      institutionalFlow,
      sentiment,
      rawArticles,
    ] = await Promise.all([
      this.upstoxProvider.getBatchQuotes(indexSymbols).catch(() => []),
      this.upstoxProvider.getBatchQuotes(equitySymbols).catch(() => []),
      globalMarketProvider.getGlobalIndices().catch(() => []),
      globalMarketProvider.getRiskGauges().catch(() => ({ riskIndex: 45, status: "NEUTRAL", gauges: [] })),
      globalMarketProvider.getCommodities().catch(() => []),
      globalMarketProvider.getCurrencies().catch(() => []),
      this.upstoxProvider.getOptionChain("NSE_INDEX|Nifty 50").catch(() => null),
      this.upstoxProvider.calculateTechnicalIndicators("NIFTY50").catch(() => null),
      this.upstoxProvider.calculateTechnicalIndicators("BANKNIFTY").catch(() => null),
      marketIntelligenceFacade.getInstitutionalActivity(5).catch(() => []),
      sentimentIntelligenceFacade.getMarketSentiment(7).catch(() => null),
      newsRepository.getLatestNews().catch(() => [] as NewsArticle[]),
    ]);

    // 1. Indian Market Intelligence Table (Authentic Real Data Only)
    const indianMarket = indexQuotes.map((q) => {
      const isUp = q.change >= 0;
      const gapImpact = q.changePercent > 0.3 ? `Strongly Positive (+${q.changePercent}%)`
        : q.changePercent < -0.3 ? `Strongly Negative (${q.changePercent}%)`
        : "Neutral";

      return {
        name: q.name || q.symbol,
        symbol: q.symbol,
        price: q.currentPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 }),
        rawPrice: q.currentPrice,
        day: `${isUp ? "+" : ""}${q.changePercent.toFixed(2)}%`,
        week: q.weeklyChange !== undefined && q.weeklyChange !== null ? `${q.weeklyChange >= 0 ? "+" : ""}${q.weeklyChange}%` : null,
        ytd: q.ytdChange !== undefined && q.ytdChange !== null ? `${q.ytdChange >= 0 ? "+" : ""}${q.ytdChange}%` : null,
        vol: q.volatility !== undefined && q.volatility !== null ? `${q.volatility}%` : null,
        gap: gapImpact,
        up: isUp,
        source: indianMarketSource,
      };
    });

    // 2. Top Movers (Real-time Sorting)
    const validEquities = equityQuotes.filter((e) => e && e.currentPrice > 0);
    const sortedGainers = [...validEquities].sort((a, b) => b.changePercent - a.changePercent);
    const sortedLosers = [...validEquities].sort((a, b) => a.changePercent - b.changePercent);

    const topGainers = sortedGainers.slice(0, 5).map((q) => ({
      sym: q.symbol,
      price: `₹${q.currentPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      change: `+${Math.abs(q.changePercent).toFixed(2)}%`,
      changeRaw: q.changePercent,
      volume: q.volume.toLocaleString("en-IN"),
      up: true,
      source: indianMarketSource,
    }));

    const topLosers = sortedLosers.slice(0, 5).map((q) => ({
      sym: q.symbol,
      price: `₹${q.currentPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      change: `${q.changePercent.toFixed(2)}%`,
      changeRaw: q.changePercent,
      volume: q.volume.toLocaleString("en-IN"),
      up: false,
      source: indianMarketSource,
    }));

    // Combined 10-stock chart data
    const moversChart = [
      ...topGainers.map((g) => ({ name: g.sym, change: g.changeRaw })),
      ...topLosers.map((l) => ({ name: l.sym, change: l.changeRaw })),
    ];

    // 3. Market Breadth Calculation (Calculated strictly from tracked equities)
    const advances = validEquities.filter((e) => e.changePercent > 0).length;
    const declines = validEquities.filter((e) => e.changePercent < 0).length;
    const unchanged = validEquities.filter((e) => e.changePercent === 0).length;
    const adRatio = declines > 0 ? parseFloat((advances / declines).toFixed(2)) : advances > 0 ? 2.5 : 1.0;
    const totalTracked = Math.max(1, advances + declines + unchanged);
    const advancePercent = Math.round((advances / totalTracked) * 100);

    // 4. Sector Performance Aggregation (Authentic Stock Returns & Volume)
    const sectorBuckets: Record<string, { totalChange: number; totalVolume: number; count: number }> = {};
    for (const eq of validEquities) {
      const sector = SECTOR_MAPPING[eq.symbol] || "Others";
      if (!sectorBuckets[sector]) sectorBuckets[sector] = { totalChange: 0, totalVolume: 0, count: 0 };
      sectorBuckets[sector].totalChange += eq.changePercent;
      sectorBuckets[sector].totalVolume += eq.volume;
      sectorBuckets[sector].count += 1;
    }

    const sectorList = Object.entries(sectorBuckets).map(([secName, data]) => {
      const avgChange = parseFloat((data.totalChange / data.count).toFixed(2));
      const totalVol = data.totalVolume;
      const isLead = avgChange >= 1.0 ? "STRONG" : avgChange >= 0 ? "HIGH" : avgChange >= -0.5 ? "MEDIUM" : "WEAK";
      const rel = avgChange >= 1.0 ? "LEADING" : avgChange >= 0 ? "IMPROVING" : avgChange >= -0.5 ? "WEAKENING" : "LAGGING";
      const st = avgChange >= 1.0 ? "lead" : avgChange >= 0 ? "imp" : avgChange >= -0.5 ? "weak" : "lag";

      return {
        name: secName,
        ret: `${avgChange >= 0 ? "+" : ""}${avgChange}%`,
        retRaw: avgChange,
        vol: totalVol > 0 ? `${(totalVol / 100000).toFixed(1)}L shares` : null,
        stockCount: data.count,
        rel,
        lead: isLead,
        st,
      };
    });

    sectorList.sort((a, b) => b.retRaw - a.retRaw);

    // 5. Options Intelligence & Market Review (NO FAKE DEFAULTS)
    const liveOptions = optionChain?.strikes?.length ? optionChain : {
      isConnected: optionChain?.isConnected ?? isUpstoxConnected,
      source: (optionChain?.isConnected ?? isUpstoxConnected) ? "Upstox API v2" : "Upstox API v2 (Not Connected)",
      pcr: optionChain?.pcr ?? null,
      maxPainStrike: optionChain?.maxPainStrike ?? null,
      callWall: optionChain?.callWall ?? null,
      putWall: optionChain?.putWall ?? null,
      totalCallOi: optionChain?.totalCallOi ?? 0,
      totalPutOi: optionChain?.totalPutOi ?? 0,
      strikes: optionChain?.strikes ?? [],
      message: optionChain?.message || ((optionChain?.isConnected ?? isUpstoxConnected)
        ? "No option chain contracts returned for active expiry."
        : "Live option-chain streaming unavailable. Connect Upstox account to stream live option chain, PCR, and strike Open Interest."),
    };

    // 6. Institutional Flow (Real DB Snapshots)
    const latestFlow = institutionalFlow?.[0];
    const fiiNet = latestFlow ? latestFlow.fii.netValue : null;
    const diiNet = latestFlow ? latestFlow.dii.netValue : null;
    const totalNet = latestFlow ? latestFlow.combinedNetValue : null;

    // 7. News Impact Engine (Real Ingested Articles, Heuristic Tagged)
    const newsImpact = (rawArticles as NewsArticle[]).slice(0, 8).map((a: NewsArticle) => {
      const titleLower = a.title.toLowerCase();
      const isBull = titleLower.includes("profit") || titleLower.includes("win") || titleLower.includes("rise") || titleLower.includes("orders") || titleLower.includes("growth");
      const isBear = titleLower.includes("fall") || titleLower.includes("bar") || titleLower.includes("disgorgement") || titleLower.includes("loss") || titleLower.includes("drop");
      const impact = isBull ? "BULLISH" : isBear ? "BEARISH" : "NEUTRAL";
      const score = isBull ? "Positive Bias" : isBear ? "Negative Bias" : "Neutral Bias";

      return {
        id: a.id,
        news: a.title,
        source: a.source || "Financial Press",
        link: a.link,
        category: titleLower.includes("sebi") ? "Regulatory" : titleLower.includes("earnings") ? "Earnings" : "Corporate",
        asset: "NSE Equities",
        sect: "Broad Market",
        exp: impact,
        score,
        term: "Short-term",
        conf: null, // Removed fabricated 82% confidence
        st: isBull ? "bull" : isBear ? "bear" : "neut",
      };
    });

    // 8. GIFT Nifty — Authentic Provider or Honest Unavailable State
    // Since GIFT Nifty is traded internationally on NSE IX and requires dedicated broker IX stream,
    // we mark it unavailable rather than fabricating a fake formula multiplier (Nifty * 1.0032).
    const giftNifty = {
      giftValue: null,
      expectedOpen: null,
      gapProjection: null,
      expectedRange: null,
      confidence: null,
      up: null,
      isAvailable: false,
      source: "NSE IX / GIFT Feed",
      message: "Direct GIFT Nifty international stream not connected. Gap calculation unavailable.",
    };

    // 9. Dynamic Executive Cue Scores (Derived continuously from real signals)
    const niftyQuote = indexQuotes.find((i) => i.symbol.includes("NIFTY50") || i.symbol.includes("NIFTY")) || null;
    const sentimentScore0to100 = sentiment ? Math.round(((sentiment.sentimentScore ?? 0) + 1) * 50) : 50;
    const dominantLabel = sentiment?.dominantSentiment || (sentimentScore0to100 >= 60 ? "Bullish" : sentimentScore0to100 <= 40 ? "Bearish" : "Neutral");

    // Dynamic global cues from average global index performance
    const globalAvgs = globalIndices.filter((g) => typeof g.changePercent === "number");
    const avgGlobalChange = globalAvgs.length > 0 ? globalAvgs.reduce((a, b) => a + b.changePercent, 0) / globalAvgs.length : 0;
    const dynamicGlobalCues = Math.min(100, Math.max(0, Math.round(50 + avgGlobalChange * 15)));

    // Dynamic domestic cues from Nifty return + Advance ratio
    const niftyReturn = niftyQuote ? niftyQuote.changePercent : 0;
    const dynamicDomesticCues = Math.min(100, Math.max(0, Math.round(50 + (niftyReturn * 10) + ((advancePercent - 50) * 0.4))));

    // Dynamic liquidity cues from DII Net Flow
    const dynamicLiquidityCues = diiNet !== null ? Math.min(100, Math.max(0, Math.round(50 + (diiNet / 200)))) : 50;

    const reportData = {
      generatedAt: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      type,
      upstoxStatus: {
        connected: isUpstoxConnected,
        provider: isUpstoxConnected ? "Upstox API v2" : "Yahoo Finance (NSE Fallback)",
        message: isUpstoxConnected ? "Upstox Live Connected" : "Operating on secondary live market feeds. Connect Upstox for live broker streaming.",
      },
      executiveBrief: {
        score: sentimentScore0to100,
        label: dominantLabel,
        cues: {
          globalCues: dynamicGlobalCues,
          domesticCues: dynamicDomesticCues,
          liquidityCues: dynamicLiquidityCues,
          riskCues: riskGauges.riskIndex,
          newsCues: sentimentScore0to100,
        },
        summary: niftyQuote
          ? `Market intelligence indicates ${niftyQuote.changePercent >= 0 ? "positive trading momentum" : "consolidating trading action"}. Advance/Decline ratio across tracked universe stands at ${adRatio} (${advances} advances vs ${declines} declines).`
          : "Market overview consolidating across monitored domestic assets.",
      },
      indianMarket,
      riskDashboard: riskGauges,
      globalMarket: globalIndices,
      giftNifty,
      moneyFlow: {
        fiiNet,
        diiNet,
        totalNet,
        source: latestFlow ? "NSE EOD Feed / PostgreSQL Database" : "Data Unavailable",
      },
      marketLiquidity: {
        liquidityStrength: Math.round(advancePercent * 0.8 + 20),
        retailPart: null,
        instActivity: null,
        adTrend: `${adRatio} (${advances >= declines ? "Positive Breadth" : "Negative Breadth"})`,
        breadthPct: `${advancePercent}% stocks positive`,
        avgDelivery: null,
        marginFunding: null,
        source: "Calculated from Tracked Stock Universe",
      },
      commodities,
      currencies,
      newsImpact,
      optionsData: liveOptions,
      sectorRotation: sectorList,
      movers: {
        gainers: topGainers,
        losers: topLosers,
        chart: moversChart,
      },
      breadth: {
        advances,
        declines,
        unchanged,
        adRatio,
        advancePercent,
        highs52W: null,
        lows52W: null,
        participationScore: `${advancePercent}%`,
        source: "Calculated from Tracked Stock Universe",
      },
      technicalMap: {
        nifty: technicalNifty,
        banknifty: technicalBankNifty,
      },
      // Reference Corporate Events and Macro Data (Clearly Tagged as Official Reference)
      macroDashboard: {
        gdp: "7.8% (Q4 FY24)",
        inflation: "4.85% (CPI)",
        coreInflation: "3.25%",
        iip: "4.9% (YoY)",
        pmiMfg: "58.8",
        pmiServices: "60.2",
        fiscalDeficit: "5.6% of GDP",
        forexReserves: "$648.5B",
        repoRate: "6.50%",
        reverseRepo: "3.35%",
        crr: "4.50%",
        slr: "18.00%",
        source: "Reference Data (RBI / MOSPI Official Publications)",
        type: "reference",
        lastUpdated: "Official RBI Bulletin FY24-25",
      },
      corporateEvents: [],
    };

    localCache.set(cacheKey, reportData, ReportAggregationService.CACHE_TTL_SEC);
    return reportData;
  }
}

export const reportAggregationService = new ReportAggregationService();
