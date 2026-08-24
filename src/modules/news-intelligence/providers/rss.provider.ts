import crypto from "crypto";
import Parser from "rss-parser";

import { rssProviders } from "../../../integrations/news/rss";
import { NewsArticle } from "../types/news.types";

export class RSSProvider {
  async fetchLatest(): Promise<NewsArticle[]> {
    const results = await Promise.allSettled(
      rssProviders.map((provider) => provider.fetchFeed())
    );

    const articles: NewsArticle[] = [];

    for (const result of results) {
      if (result.status !== "fulfilled") {
        continue;
      }

      const feed = result.value;

      for (const item of feed.items) {
        articles.push(this.normalize(feed.title ?? "Unknown", item));
      }
    }

    return articles;
  }

  private normalize(
    source: string,
    item: Parser.Item
  ): NewsArticle {
    const key = (item.link || item.title || "").trim().toLowerCase();
    const hash = crypto.createHash("md5").update(key).digest("hex");
    const id = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;

    return {
      id,

      title: item.title ?? "",

      description:
        item.contentSnippet ??
        item.content ??
        item.summary ??
        "",

      link: item.link ?? "",

      source,

      publishedAt: item.pubDate
        ? new Date(item.pubDate)
        : new Date(),

      imageUrl: this.extractImage(item),
    };
  }

  private extractImage(item: Parser.Item): string | undefined {
    const enclosure = item.enclosure;

    if (
      enclosure &&
      enclosure.url &&
      enclosure.type?.startsWith("image")
    ) {
      return enclosure.url;
    }

    return undefined;
  }
}

export const rssProvider = new RSSProvider();