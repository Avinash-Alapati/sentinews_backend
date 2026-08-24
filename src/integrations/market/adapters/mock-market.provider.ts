import {
  NormalizedQuote,
  NormalizedMovers,
  NormalizedInstitutionalFlow,
} from "@/modules/market-intelligence/types/market-data.types";
import { IMarketProvider, CandleDataPoint } from "../interfaces/market-provider.interface";

/**
 * Local mock provider executing test responses for local development cycles.
 */
export class MockMarketProvider implements IMarketProvider {
  async getRealTimeQuote(symbol: string): Promise<NormalizedQuote> {
    const randomVariation = (Math.random() - 0.5) * 10;
    let price = 0;
    let name = "";
    let change = 0.5 + randomVariation;

    switch (symbol) {
      case "NIFTY50":
        price = 24320.5 + randomVariation;
        name = "Nifty 50";
        break;
      case "SENSEX":
        price = 79895.1 + randomVariation * 3;
        name = "BSE Sensex";
        break;
      case "BANKNIFTY":
        price = 52100.2 + randomVariation * 2;
        name = "Nifty Bank";
        break;
      case "INDIAVIX":
        price = 13.45 + (Math.random() - 0.5);
        name = "India VIX";
        change = (Math.random() - 0.5) * 0.5;
        break;
      default:
        price = 150.0 + randomVariation;
        name = symbol;
    }

    const changePercent = (change / price) * 100;

    return {
      symbol,
      name,
      currentPrice: Math.round(price * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume: 1500000 + Math.floor(Math.random() * 500000),
      timestamp: new Date(),
    };
  }

  async getBatchQuotes(symbols: string[]): Promise<NormalizedQuote[]> {
    return Promise.all(symbols.map((sym) => this.getRealTimeQuote(sym)));
  }

  async getTopMovers(): Promise<NormalizedMovers> {
    return {
      gainers: [
        { symbol: "TCS", name: "TCS", price: 3850.5, change: 95.2, changePercent: 2.53, volume: 1204500 },
        { symbol: "INFY", name: "INFY", price: 1640.0, change: 65.4, changePercent: 4.15, volume: 8450122 },
        { symbol: "HDFCBANK", name: "HDFCBANK", price: 1720.2, change: 35.1, changePercent: 2.08, volume: 4120300 },
      ],
      losers: [
        { symbol: "RELIANCE", name: "RELIANCE", price: 2890.5, change: -95.2, changePercent: -3.19, volume: 9411050 },
        { symbol: "WIPRO", name: "WIPRO", price: 480.2, change: -12.1, changePercent: -2.46, volume: 3200100 },
        { symbol: "ICICIBANK", name: "ICICIBANK", price: 1120.4, change: -28.2, changePercent: -2.45, volume: 6410200 },
      ],
      timestamp: new Date(),
    };
  }

  async getInstitutionalActivity(date: Date): Promise<NormalizedInstitutionalFlow> {
    return {
      date,
      fiiBuy: 14205.5,
      fiiSell: 12850.2,
      fiiNet: 1355.3,
      diiBuy: 9850.1,
      diiSell: 10420.8,
      diiNet: -570.7,
      combinedNet: 784.6,
      timestamp: new Date(),
    };
  }

  async getCandleData(symbol: string, timeframe: string = "1M"): Promise<CandleDataPoint[]> {
    const quote = await this.getRealTimeQuote(symbol);
    const basePrice = quote.currentPrice || 1000;
    const count = timeframe === "1D" ? 30 : timeframe === "1W" ? 28 : timeframe === "1M" ? 30 : timeframe === "3M" ? 60 : 52;
    const candles: CandleDataPoint[] = [];

    let currentPrice = basePrice * 0.95;
    for (let i = 0; i < count; i++) {
      const d = new Date();
      if (timeframe === "1D") {
        d.setMinutes(d.getMinutes() - (count - i) * 15);
      } else {
        d.setDate(d.getDate() - (count - i));
      }

      const variation = (Math.random() - 0.48) * (currentPrice * 0.02);
      const open = parseFloat(currentPrice.toFixed(2));
      const close = parseFloat((currentPrice + variation).toFixed(2));
      const high = parseFloat((Math.max(open, close) + Math.random() * (currentPrice * 0.01)).toFixed(2));
      const low = parseFloat((Math.min(open, close) - Math.random() * (currentPrice * 0.01)).toFixed(2));
      const volume = Math.floor(100000 + Math.random() * 900000);
      const isBullish = close >= open;
      const changePercent = open > 0 ? parseFloat((((close - open) / open) * 100).toFixed(2)) : 0;

      const dateStr = timeframe === "1D"
        ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });

      candles.push({
        timestamp: d.toISOString(),
        date: dateStr,
        open,
        high,
        low,
        close,
        volume,
        isBullish,
        changePercent,
      });

      currentPrice = close;
    }

    if (candles.length > 0) {
      const last = candles[candles.length - 1];
      last.close = basePrice;
      if (last.high < basePrice) last.high = basePrice;
      if (last.low > basePrice) last.low = basePrice;
      last.isBullish = last.close >= last.open;
      last.changePercent = last.open > 0 ? parseFloat((((last.close - last.open) / last.open) * 100).toFixed(2)) : 0;
    }

    return candles;
  }
}
