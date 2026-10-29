import { TavilyResult } from "@/lib/types";
import { searchGoogleNewsRss } from "./google-news-rss";
import { searchNewsApi } from "./newsapi";
import { searchGNews } from "./gnews";
import { searchMediaOutreach } from "./media-outreach";
import { searchPRNewswire } from "./pr-newswire-site";
import { searchBusinessWire } from "./business-wire";
import { searchGlobeNewswire } from "./globe-newswire";
import { SOURCE_PRIORITY } from "@/lib/config";

export interface SearchOptions {
  query: string;
  market?: string;
  maxResults?: number;
  timeoutMs?: number;
}

export async function searchMultipleSources(
  query: string,
  options: {
    maxResults?: number;
    includeWebScraping?: boolean;
  } = {}
): Promise<TavilyResult[]> {
  const maxResults = options.maxResults ?? 50;
  const allResults: TavilyResult[] = [];
  const seenUrls = new Set<string>();

  const sources = SOURCE_PRIORITY.filter((source) => {
    if (source === "web-scraper" && !options.includeWebScraping) {
      return false;
    }
    return true;
  });

  const startTime = Date.now();

  /*
   * Run every enabled source in parallel. Order of the
   * `sources` array determines union priority: PR
   * distribution sites first, then news aggregators as
   * fallback.
   */
  const sourcePromises = sources.map(
    (source): Promise<TavilyResult[]> => {
      switch (source) {
        case "media-outreach":
          return searchMediaOutreach(query);
        case "pr-newswire":
          return searchPRNewswire(query);
        case "business-wire":
          return searchBusinessWire(query);
        case "globe-newswire":
          return searchGlobeNewswire(query);
        case "google-news-rss":
          return searchGoogleNewsRss(query);
        case "newsapi":
          return searchNewsApi(query);
        case "gnews":
          return searchGNews(query);
        case "web-scraper":
          return Promise.resolve([]);
        default:
          return Promise.resolve([]);
      }
    }
  );

  const settled = await Promise.allSettled(sourcePromises);

  for (let i = 0; i < settled.length; i++) {
    const outcome = settled[i];

    if (outcome.status === "rejected") {
      console.error(
        `[Search] ${sources[i]} failed:`,
        outcome.reason instanceof Error
          ? outcome.reason.message
          : "Unknown error"
      );
      continue;
    }

    for (const result of outcome.value) {
      if (!result.url || seenUrls.has(result.url)) {
        continue;
      }

      seenUrls.add(result.url);
      allResults.push(result);

      if (allResults.length >= maxResults) {
        break;
      }
    }

    if (allResults.length >= maxResults) {
      break;
    }
  }

  const responseTime = Date.now() - startTime;

  console.log(
    `[Search] Found ${allResults.length} results from ${sources.length} sources in ${responseTime}ms`
  );

  return allResults;
}
