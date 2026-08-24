import Parser from "rss-parser";

import { RSSClient } from "./client";

const ECONOMIC_TIMES_RSS_URL =
  "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms";

export class EconomicTimesRSS {
  private readonly client: RSSClient;

  constructor(client?: RSSClient) {
    this.client = client ?? new RSSClient();
  }

  async fetchFeed(): Promise<Parser.Output<unknown>> {
    return this.client.fetch(ECONOMIC_TIMES_RSS_URL);
  }
}

export const economicTimesRSS = new EconomicTimesRSS();