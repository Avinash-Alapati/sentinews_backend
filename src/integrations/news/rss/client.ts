import axios, { AxiosInstance } from "axios";
import Parser from "rss-parser";
import { RSS_TIMEOUT, RSS_USER_AGENT } from "../../../modules/news-intelligence/constants";

export interface RSSClientOptions {
  timeout?: number;
  userAgent?: string;
}

export class RSSClient {    
  private readonly parser: Parser;
  private readonly httpClient: AxiosInstance;

  constructor(options?: RSSClientOptions) {
    this.parser = new Parser();

    this.httpClient = axios.create({
      timeout: options?.timeout ?? RSS_TIMEOUT,

      headers: {
        "User-Agent": options?.userAgent ?? RSS_USER_AGENT,
      },
    });
  }

  async fetch(url: string): Promise<Parser.Output<Record<string, unknown>>> {
    try {
      const response = await this.httpClient.get<string>(url);

      return await this.parser.parseString(response.data);
    } catch (error) {
      console.error(`RSS Fetch Failed -> ${url}`, error);

      throw error;
    }
  }
}