import { TavilyResult } from "@/lib/types";
import {
  fetchSearchHtml,
  extractArticleLinks,
  toTavilyResult,
} from "./pr-distribution-base";

const BASE_URL = "https://www.businesswire.com";

function isArticleHref(href: string): boolean {
  try {
    const url = new URL(href);
    const host = url.hostname.replace(/^www\./, "");

    if (
      host !== "businesswire.com" &&
      !host.endsWith(".businesswire.com")
    ) {
      return false;
    }

    /*
     * Business Wire article URLs:
     *   /news/home/<id>/en/<slug>
     *   /portal/site/home/news/release-details/?ndmViewId=...
     */
    return /\/news\/home\/\d+\/en\//i.test(
      url.pathname
    );
  } catch {
    return false;
  }
}

export async function searchBusinessWire(
  query: string
): Promise<TavilyResult[]> {
  const encoded = encodeURIComponent(query);

  /*
   * Business Wire's public search endpoint. The portal URL
   * is the user-facing search; results page lists release
   * detail pages linked via /news/home/{id}/en/{slug}.
   */
  const searchUrls = [
    `${BASE_URL}/portal/site/home/news/?searchQuery=${encoded}&newsLang=en`,
    `${BASE_URL}/portal/site/home/?ndmViewId=news_view&newsLang=en&searchType=all&searchQuery=${encoded}`,
  ];

  const results: TavilyResult[] = [];
  const seen = new Set<string>();

  for (const searchUrl of searchUrls) {
    const html = await fetchSearchHtml(searchUrl);

    if (!html) continue;

    const links = extractArticleLinks(
      html,
      isArticleHref,
      BASE_URL
    );

    for (const link of links) {
      if (seen.has(link.url)) continue;
      seen.add(link.url);
      results.push(toTavilyResult(link, "Business Wire"));
    }

    if (results.length >= 20) break;
  }

  console.log(
    `[BusinessWire] "${query}" → ${results.length} results`
  );

  return results;
}
