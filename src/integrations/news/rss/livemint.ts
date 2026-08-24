import Parser from "rss-parser";

import { RSSClient } from "./client";

const LIVEMINT_RSS_URL = "https://www.livemint.com/rss/markets";

export class LiveMintRSS {
  constructor(private readonly client: RSSClient = new RSSClient()) {}

  async fetchFeed(): Promise<Parser.Output<unknown>> {
    return this.client.fetch(LIVEMINT_RSS_URL);
  }
}

export const liveMintRSS = new LiveMintRSS();