import Parser from "rss-parser";

import { RSSClient } from "./client";

const BUSINESS_STANDARD_RSS_URL =
  "https://www.business-standard.com/rss/markets-106.rss";

export class BusinessStandardRSS {
  constructor(private readonly client: RSSClient = new RSSClient()) {}

  async fetchFeed(): Promise<Parser.Output<unknown>> {
    return this.client.fetch(BUSINESS_STANDARD_RSS_URL);
  }
}

export const businessStandardRSS = new BusinessStandardRSS();