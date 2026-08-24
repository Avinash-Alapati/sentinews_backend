export interface GlobalQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  weeklyChange: string | null;
  ytdReturn: string | null;
  volatility: string | null;
  gapImpact: string;
  timestamp: string;
  source: string;
}

export interface RiskGaugeItem {
  label: string;
  val: string;
  change: string;
  up: boolean;
  source: string;
}

export interface CommodityItem {
  name: string;
  price: string;
  day: string;
  week: string | null;
  month: string | null;
  summary: string;
  up: boolean;
  source: string;
}

export interface CurrencyItem {
  pair: string;
  ltp: string;
  day: string;
  week: string | null;
  up: boolean;
  source: string;
}

interface CachedYahooQuote {
  price: number;
  change: number;
  changePercent: number;
  weeklyChange: number | null;
  monthlyChange: number | null;
  ytdChange: number | null;
  volatility: number | null;
  name: string;
}

/**
 * Enterprise Provider fetching genuine Global Markets, Commodities, Currencies, and Macro Gauges.
 * Computes actual historical weekly, monthly, and YTD returns from real chart candles.
 * Never uses simulated multipliers or hardcoded percentage returns.
 */
export class GlobalMarketProvider {
  private cache: Map<string, { data: CachedYahooQuote; expiresAt: number }> = new Map();
  private static CACHE_TTL_MS = 60 * 1000; // 60 seconds

  private async fetchYahooChart(ticker: string): Promise<CachedYahooQuote | null> {
    const cached = this.cache.get(`yahoo_${ticker}`);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    try {
      // Fetch 1-year daily chart data to calculate authentic 1D, 1W, 1M, YTD returns and realized volatility
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1y`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) return null;

      const json = await res.json();
      const result = json?.chart?.result?.[0];
      const meta = result?.meta;
      if (!meta) return null;

      const quotes = result?.indicators?.quote?.[0];
      const timestamps: number[] = result?.timestamp || [];
      const closes: number[] = quotes?.close || [];

      // Filter valid non-null closing prices with timestamps
      const validPoints: Array<{ ts: number; close: number }> = [];
      for (let i = 0; i < closes.length; i++) {
        if (typeof closes[i] === "number" && !isNaN(closes[i]) && closes[i] > 0) {
          validPoints.push({ ts: timestamps[i], close: closes[i] });
        }
      }

      if (validPoints.length === 0) return null;

      const lastPoint = validPoints[validPoints.length - 1];
      const currentPrice = typeof meta.regularMarketPrice === "number" && meta.regularMarketPrice > 0
        ? meta.regularMarketPrice
        : lastPoint.close;

      const prevClose = (typeof meta.previousClose === "number" && meta.previousClose > 0)
        ? meta.previousClose
        : (validPoints.length > 1 ? validPoints[validPoints.length - 2].close : (meta.chartPreviousClose || currentPrice));

      const change = typeof meta.regularMarketChange === "number" && typeof meta.previousClose === "number"
        ? meta.regularMarketChange
        : currentPrice - prevClose;

      const changePercent = typeof meta.regularMarketChangePercent === "number" && typeof meta.previousClose === "number"
        ? meta.regularMarketChangePercent
        : prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0;

      // 1. Calculate Real Weekly Return (5-7 trading sessions back)
      let weeklyChange: number | null = null;
      if (validPoints.length >= 6) {
        const weekAgoPoint = validPoints[Math.max(0, validPoints.length - 6)];
        if (weekAgoPoint.close > 0) {
          weeklyChange = parseFloat((((currentPrice - weekAgoPoint.close) / weekAgoPoint.close) * 100).toFixed(2));
        }
      }

      // 2. Calculate Real Monthly Return (21-22 trading sessions back)
      let monthlyChange: number | null = null;
      if (validPoints.length >= 22) {
        const monthAgoPoint = validPoints[Math.max(0, validPoints.length - 22)];
        if (monthAgoPoint.close > 0) {
          monthlyChange = parseFloat((((currentPrice - monthAgoPoint.close) / monthAgoPoint.close) * 100).toFixed(2));
        }
      }

      // 3. Calculate Real YTD Return (from first trading day of current calendar year)
      let ytdChange: number | null = null;
      const currentYear = new Date().getFullYear();
      const firstYearPoint = validPoints.find((p) => new Date(p.ts * 1000).getFullYear() === currentYear);
      if (firstYearPoint && firstYearPoint.close > 0) {
        ytdChange = parseFloat((((currentPrice - firstYearPoint.close) / firstYearPoint.close) * 100).toFixed(2));
      }

      // 4. Calculate Realized Annualized Volatility (over last 30 trading sessions)
      let volatility: number | null = null;
      const windowSize = Math.min(30, validPoints.length - 1);
      if (windowSize >= 10) {
        const sample = validPoints.slice(-windowSize - 1);
        const logReturns: number[] = [];
        for (let i = 1; i < sample.length; i++) {
          if (sample[i - 1].close > 0 && sample[i].close > 0) {
            logReturns.push(Math.log(sample[i].close / sample[i - 1].close));
          }
        }
        if (logReturns.length >= 10) {
          const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
          const variance = logReturns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (logReturns.length - 1);
          const dailyStd = Math.sqrt(variance);
          volatility = parseFloat((dailyStd * Math.sqrt(252) * 100).toFixed(1));
        }
      }

      const data: CachedYahooQuote = {
        price: parseFloat(currentPrice.toFixed(2)),
        change: parseFloat(change.toFixed(2)),
        changePercent: parseFloat(changePercent.toFixed(2)),
        weeklyChange,
        monthlyChange,
        ytdChange,
        volatility,
        name: meta.shortName || meta.longName || ticker,
      };

      this.cache.set(`yahoo_${ticker}`, { data, expiresAt: Date.now() + GlobalMarketProvider.CACHE_TTL_MS });
      return data;
    } catch {
      return null;
    }
  }

  async getGlobalIndices(): Promise<GlobalQuote[]> {
    const symbols = [
      { key: "^GSPC", name: "S&P 500" },
      { key: "^IXIC", name: "NASDAQ" },
      { key: "^DJI", name: "Dow Jones" },
      { key: "^RUT", name: "Russell 2000" },
      { key: "^FTSE", name: "FTSE 100" },
      { key: "^GDAXI", name: "DAX" },
      { key: "^FCHI", name: "CAC 40" },
      { key: "^N225", name: "Nikkei 225" },
      { key: "^HSI", name: "Hang Seng" },
      { key: "000001.SS", name: "Shanghai Composite" },
      { key: "^KS11", name: "KOSPI" },
    ];

    const results: GlobalQuote[] = [];

    await Promise.all(
      symbols.map(async (item) => {
        const quote = await this.fetchYahooChart(item.key);
        if (quote && quote.price > 0) {
          const gap = quote.changePercent > 0.3
            ? `Strongly Positive (+${quote.changePercent}%)`
            : quote.changePercent < -0.3
            ? `Strongly Negative (${quote.changePercent}%)`
            : "Neutral";

          results.push({
            symbol: item.key,
            name: item.name,
            price: quote.price,
            change: quote.change,
            changePercent: quote.changePercent,
            weeklyChange: quote.weeklyChange !== null ? `${quote.weeklyChange >= 0 ? "+" : ""}${quote.weeklyChange}%` : null,
            ytdReturn: quote.ytdChange !== null ? `${quote.ytdChange >= 0 ? "+" : ""}${quote.ytdChange}%` : null,
            volatility: quote.volatility !== null ? `${quote.volatility}%` : null,
            gapImpact: gap,
            timestamp: new Date().toISOString(),
            source: "Yahoo Finance (Global Feed)",
          });
        }
      })
    );

    if (results.length > 0) {
      const orderMap = new Map(symbols.map((s, idx) => [s.name, idx]));
      return results.sort((a, b) => (orderMap.get(a.name) ?? 0) - (orderMap.get(b.name) ?? 0));
    }

    return [];
  }

  async getRiskGauges(): Promise<{ riskIndex: number; status: string; gauges: RiskGaugeItem[] }> {
    const tickers = [
      { key: "^INDIAVIX", label: "India VIX" },
      { key: "^TNX", label: "US 10Y Yield" },
      { key: "^IRX", label: "US 2Y Yield" },
      { key: "DX-Y.NYB", label: "Dollar Index" },
      { key: "GC=F", label: "Gold Futures" },
      { key: "BTC-USD", label: "Bitcoin" },
      { key: "CL=F", label: "Crude Oil" },
    ];

    const gauges: RiskGaugeItem[] = [];

    await Promise.all(
      tickers.map(async (t) => {
        const q = await this.fetchYahooChart(t.key);
        if (q && q.price > 0) {
          gauges.push({
            label: t.label,
            val: q.price.toLocaleString("en-US", { minimumFractionDigits: 2 }),
            change: `${q.changePercent >= 0 ? "+" : ""}${q.changePercent.toFixed(2)}%`,
            up: q.changePercent >= 0,
            source: "Yahoo Finance (Macro Feed)",
          });
        }
      })
    );

    // Calculate dynamic Risk Index (0 - 100) from genuine VIX reading
    const vix = gauges.find((g) => g.label === "India VIX");
    const vixNum = vix ? parseFloat(vix.val.replace(/,/g, "")) : 15;
    const riskIndex = Math.min(100, Math.max(0, Math.round((vixNum / 35) * 100)));
    const status = riskIndex >= 60 ? "RISK-OFF" : riskIndex <= 40 ? "RISK-ON" : "NEUTRAL";

    return { riskIndex, status, gauges };
  }

  async getCommodities(): Promise<CommodityItem[]> {
    const list = [
      { key: "GC=F", name: "Gold", summary: "Safe haven asset; impact on gold financers and jewelers." },
      { key: "SI=F", name: "Silver", summary: "Industrial and precious demand; impact on silver refiners." },
      { key: "CL=F", name: "Crude Oil", summary: "Inflation sensitivity; impact on OMCs, Paints, Tyres & Aviation." },
      { key: "NG=F", name: "Natural Gas", summary: "Fertilizers and power input costs." },
      { key: "HG=F", name: "Copper", summary: "Industrial growth proxy; impact on metal manufacturers." },
      { key: "ALI=F", name: "Aluminum", summary: "Automotive and packaging input costs." },
      { key: "ZNC=F", name: "Zinc", summary: "Galvanizing steel input." },
    ];

    const items: CommodityItem[] = [];

    await Promise.all(
      list.map(async (c) => {
        const q = await this.fetchYahooChart(c.key);
        if (q && q.price > 0) {
          items.push({
            name: c.name,
            price: q.price.toLocaleString("en-US", { minimumFractionDigits: 2 }),
            day: `${q.changePercent >= 0 ? "+" : ""}${q.changePercent.toFixed(2)}%`,
            week: q.weeklyChange !== null ? `${q.weeklyChange >= 0 ? "+" : ""}${q.weeklyChange}%` : null,
            month: q.monthlyChange !== null ? `${q.monthlyChange >= 0 ? "+" : ""}${q.monthlyChange}%` : null,
            summary: c.summary,
            up: q.changePercent >= 0,
            source: "Yahoo Finance (Commodity Feed)",
          });
        }
      })
    );

    return items;
  }

  async getCurrencies(): Promise<CurrencyItem[]> {
    const pairs = [
      { key: "INR=X", pair: "USD/INR" },
      { key: "EURINR=X", pair: "EUR/INR" },
      { key: "JPYINR=X", pair: "JPY/INR" },
      { key: "GBPINR=X", pair: "GBP/INR" },
    ];

    const results: CurrencyItem[] = [];

    await Promise.all(
      pairs.map(async (p) => {
        const q = await this.fetchYahooChart(p.key);
        if (q && q.price > 0) {
          results.push({
            pair: p.pair,
            ltp: q.price.toFixed(4),
            day: `${q.changePercent >= 0 ? "+" : ""}${q.changePercent.toFixed(2)}%`,
            week: q.weeklyChange !== null ? `${q.weeklyChange >= 0 ? "+" : ""}${q.weeklyChange}%` : null,
            up: q.changePercent >= 0,
            source: "Yahoo Finance (Forex Feed)",
          });
        }
      })
    );

    return results;
  }
}

export const globalMarketProvider = new GlobalMarketProvider();
