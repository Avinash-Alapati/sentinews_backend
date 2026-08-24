import Parser from "rss-parser";

import { RSSClient } from "./client";

const MONEYCONTROL_RSS_URL =
  "https://www.moneycontrol.com/rss/latestnews.xml";

export class MoneyControlRSS {
  private readonly client: RSSClient;

  constructor(client?: RSSClient) {
    this.client = client ?? new RSSClient();
  }

  async fetchFeed(): Promise<Parser.Output<unknown>> {
    return this.client.fetch(MONEYCONTROL_RSS_URL);
  }
}

export const moneyControlRSS = new MoneyControlRSS();