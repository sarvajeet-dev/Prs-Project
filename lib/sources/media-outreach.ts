import { TavilyResult } from "@/lib/types";
import {
  fetchSearchHtml,
  extractArticleLinks,
  toTavilyResult,
} from "./pr-distribution-base";

const BASE_URL = "https://www.media-outreach.com";

/*
 * Media OutReach is on WordPress — its search endpoint is the
 * standard ?s= query. Article URLs live under /news-releases/.
 */
function isArticleHref(href: string): boolean {
  try {
    const url = new URL(href);
    const host = url.hostname.replace(/^www\./, "");

    if (host !== "media-outreach.com") return false;

    /*
     * Known article URL shapes:
     *   /news-releases/<slug>/
     *   /releases/<slug>/
     *   /en/news-releases/<slug>/
     */
    return /\/(?:en\/)?(?:news-releases|releases)\//.test(
      url.pathname
    );
  } catch {
    return false;
  }
}

export async function searchMediaOutreach(
  query: string
): Promise<TavilyResult[]> {
  const encoded = encodeURIComponent(query);

  /*
   * Try the WordPress search first, then fall back to the
   * dedicated releases search path if it exists.
   */
  const searchUrls = [
    `${BASE_URL}/?s=${encoded}`,
    `${BASE_URL}/releases/?s=${encoded}`,
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
      results.push(toTavilyResult(link, "Media OutReach"));
    }

    if (results.length >= 20) break;
  }

  console.log(
    `[MediaOutreach] "${query}" → ${results.length} results`
  );

  return results;
}
