import { TavilyResult } from "@/lib/types";
import {
  fetchSearchHtml,
  extractArticleLinks,
  toTavilyResult,
} from "./pr-distribution-base";

const BASE_URL = "https://www.prnewswire.com";

function isArticleHref(href: string): boolean {
  try {
    const url = new URL(href);
    const host = url.hostname.replace(/^www\./, "");

    if (
      host !== "prnewswire.com" &&
      !host.endsWith(".prnewswire.com")
    ) {
      return false;
    }

    /*
     * PR Newswire article URLs:
     *   /news-releases/<slug>-<id>.html
     *   /in/news-releases/<slug>-<id>.html  (India)
     *   /apac/news-releases/<slug>-<id>.html (Asia-Pacific)
     */
    return /\/news-releases\/[^?#]+\.html$/i.test(
      url.pathname
    );
  } catch {
    return false;
  }
}

export async function searchPRNewswire(
  query: string
): Promise<TavilyResult[]> {
  const encoded = encodeURIComponent(query);

  /*
   * PR Newswire exposes a public search at /search/news/. The
   * APAC subdomain often has more Asia PRs so hit that too.
   */
  const searchUrls = [
    `${BASE_URL}/search/news/?keyword=${encoded}`,
    `${BASE_URL}/apac/news-releases/?keyword=${encoded}`,
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
      results.push(toTavilyResult(link, "PR Newswire"));
    }

    if (results.length >= 20) break;
  }

  console.log(
    `[PRNewswire] "${query}" → ${results.length} results`
  );

  return results;
}
