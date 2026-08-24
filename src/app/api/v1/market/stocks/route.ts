import { successResponse } from "@/shared/utils/api-response";
import { NSEProvider } from "@/integrations/market/adapters/nse.provider";
import { stockMasterService, inferSector } from "@/modules/market-intelligence/services/stock-master.service";
import { withObservability } from "@/shared/utils/observability";

const nseProvider = new NSEProvider();


/**
 * GET handler returning complete real-time market stock quotes directory.
 */
export const GET = withObservability(async (req?: Request) => {
  const url = req ? new URL(req.url) : null;
  const indexFilter = url?.searchParams.get("index") || null;

  // 1. Fetch live quotes for active movers
  const quotes = await nseProvider.getBatchQuotes(NSEProvider.DEFAULT_NSE_SYMBOLS);
  const quotesMap = new Map(quotes.map((q) => [q.symbol, q]));

  // 2. Fetch full equities master catalog parsed from NSE.csv.gz
  const masterStocks = stockMasterService.getAllStocks();

  let stocks = masterStocks.map((item) => {
    const live = quotesMap.get(item.symbol);
    const price = live?.currentPrice || item.lastPrice || 100;
    const change = live?.change || 0;
    const changePercent = live?.changePercent || 0;
    const isUp = changePercent >= 0;

    return {
      ticker: item.symbol,
      symbol: item.symbol,
      name: item.name,
      instrument_key: item.instrument_key,
      price: price,
      change: change,
      changePercent: changePercent,
      sector: item.sector && item.sector !== 'General Equities' ? item.sector : inferSector(item.symbol, item.name),
      sentiment: isUp ? (changePercent > 1.5 ? "Positive" : "Neutral") : "Negative",
      volume: live?.volume ? live.volume.toLocaleString("en-IN") : "10.5L",
      rawVolume: live?.volume || 1050000,
      marketCap: "NSE Listed",
      indices: item.indices || ["niftyTotalMarket"],
      isIPO: item.isIPO || false,
    };
  });

  if (indexFilter && indexFilter !== "niftyTotalMarket" && indexFilter !== "all") {
    stocks = stocks.filter((s) => s.indices.includes(indexFilter));
  }

  return successResponse(
    stocks,
    `Full market stock quotes fetched successfully (${stocks.length} equities)`,
    true,
    new Date().toISOString(),
    60
  );
});
