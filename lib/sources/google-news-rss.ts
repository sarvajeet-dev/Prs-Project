import { TavilyResult } from "@/lib/types";
import { GOOGLE_NEWS_REGIONS } from "@/lib/config";

const cheerio = require("cheerio");

interface RssItem {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
}

async function parseRssFeed(
  feedUrl: string
): Promise<RssItem[]> {
  try {
    const response = await fetch(feedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PRDiscovery/1.0)",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `RSS fetch failed: ${response.status}`
      );
    }

    const text = await response.text();
    const $ = cheerio.load(text, {
      xmlMode: true,
    });

    const items: RssItem[] = [];

    $("item").each((index: number, element: any) => {
      if (index >= 50) return;

      const $item = $(element);

      let title = $item
        .find("title")
        .text()
        .trim();

      let link = $item
        .find("link")
        .text()
        .trim();

      const pubDate = $item
        .find("pubDate")
        .text()
        .trim();

      let description = $item
        .find("description")
        .text()
        .trim();

      // Clean HTML entities and tags from title
      title = cleanHtmlContent(title);

      // Extract URL from link (may contain HTML)
      link = extractUrl(link);

      // Clean HTML content from description
      description = cleanHtmlContent(description);

      if (title && link) {
        items.push({
          title,
          link,
          pubDate,
          description,
        });
      }
    });

    return items;
  } catch (error) {
    console.error(
      "[GoogleNewsRSS] Parse failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );
    return [];
  }
}

function cleanHtmlContent(
  content: string
): string {
  if (!content) return "";

  // Remove HTML tags
  let cleaned = content
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  // Remove extra whitespace
  cleaned = cleaned
    .replace(/\s+/g, " ")
    .trim();

  return cleaned;
}

function extractUrl(
  content: string
): string {
  if (!content) return "";

  // Try to extract href from anchor tag
  const hrefMatch = content.match(
    /href=["']([^"']+)["']/i
  );
  if (hrefMatch && hrefMatch[1]) {
    return hrefMatch[1];
  }

  // If no href found, try to find a plain URL
  const urlMatch = content.match(
    /https?:\/\/[^\s<>"{}|\\^`\[\]]*[^\s<>"{}|\\^`\[\],.]/
  );
  if (urlMatch) {
    return urlMatch[0];
  }

  return content;
}

export async function searchGoogleNewsRss(
  query: string,
  region?: string
): Promise<TavilyResult[]> {
  const regions = region
    ? [region]
    : Object.values(GOOGLE_NEWS_REGIONS);

  const encoded = encodeURIComponent(query);

  /*
   * Fetch every region in parallel instead of sequentially —
   * 3 regions × 42 queries was ~5 minutes of serial HTTP waits.
   */
  const regionResults = await Promise.allSettled(
    regions.map((reg) => {
      const feedUrl =
        `https://news.google.com/rss/search?q=${encoded}&gl=${reg}&hl=en`;

      return parseRssFeed(feedUrl);
    })
  );

  const results: TavilyResult[] = [];

  for (const outcome of regionResults) {
    if (outcome.status === "rejected") {
      console.error(
        "[GoogleNewsRSS] Region search failed:",
        outcome.reason instanceof Error
          ? outcome.reason.message
          : "Unknown error"
      );
      continue;
    }

    for (const item of outcome.value) {
      results.push({
        title: item.title,

        url: item.link,

        content:
          item.description ||
          item.title,

        raw_content: item.description,

        published_date:
          item.pubDate ||
          new Date().toISOString(),

        score: 0.8,
      });
    }
  }

  return results;
}
