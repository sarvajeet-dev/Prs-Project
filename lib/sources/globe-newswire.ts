import { TavilyResult } from "@/lib/types";
import {
  fetchSearchHtml,
  extractArticleLinks,
  toTavilyResult,
} from "./pr-distribution-base";

const BASE_URL = "https://www.globenewswire.com";

function isArticleHref(href: string): boolean {
  try {
    const url = new URL(href);
    const host = url.hostname.replace(/^www\./, "");

    if (
      host !== "globenewswire.com" &&
      !host.endsWith(".globenewswire.com")
    ) {
      return false;
    }

    /*
     * GlobeNewswire article URLs:
     *   /news-release/<yyyy>/<mm>/<dd>/<id>/en/<slug>.html
     *   /en/news-release/<yyyy>/<mm>/<dd>/<id>/<slug>.html
     */
    return /\/(?:en\/)?news-release\/\d{4}\//i.test(
      url.pathname
    );
  } catch {
    return false;
  }
}

export async function searchGlobeNewswire(
  query: string
): Promise<TavilyResult[]> {
  const encoded = encodeURIComponent(query);

  const searchUrls = [
    `${BASE_URL}/en/search/?keyword=${encoded}`,
    `${BASE_URL}/search/?keyword=${encoded}`,
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
      results.push(toTavilyResult(link, "GlobeNewswire"));
    }

    if (results.length >= 20) break;
  }

  console.log(
    `[GlobeNewswire] "${query}" → ${results.length} results`
  );

  return results;
}
