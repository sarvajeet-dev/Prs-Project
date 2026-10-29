import { TavilyResult } from "@/lib/types";

const cheerio = require("cheerio");

/*
 * These sites fingerprint and 403 anything that looks like a
 * bot. Match a real Chrome request as closely as we can.
 */
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/122.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;" +
    "q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "identity",
};

export async function fetchSearchHtml(
  url: string,
  timeoutMs = 10000
): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: BROWSER_HEADERS,
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    } as RequestInit & { signal: AbortSignal });

    if (!response.ok) {
      console.warn(
        `[PR source] fetch ${url} → ${response.status}`
      );
      return null;
    }

    return await response.text();
  } catch (error) {
    console.warn(
      `[PR source] fetch ${url} failed:`,
      error instanceof Error ? error.message : "error"
    );
    return null;
  }
}

export interface ArticleLink {
  title: string;
  url: string;
}

/*
 * Extract article links from a search results page. Caller
 * supplies a predicate that decides whether a given <a> href
 * points to an article (vs. navigation / taxonomy links).
 */
export function extractArticleLinks(
  html: string,
  isArticleHref: (href: string) => boolean,
  baseUrl: string
): ArticleLink[] {
  const $ = cheerio.load(html);
  const links: ArticleLink[] = [];
  const seen = new Set<string>();

  $("a[href]").each((_: number, element: any) => {
    const $a = $(element);
    const rawHref = ($a.attr("href") || "").trim();

    if (!rawHref) return;

    let href = rawHref;

    /* Resolve relative URLs against the site base. */
    if (href.startsWith("/")) {
      try {
        href = new URL(href, baseUrl).toString();
      } catch {
        return;
      }
    }

    if (!/^https?:\/\//i.test(href)) return;
    if (!isArticleHref(href)) return;
    if (seen.has(href)) return;
    seen.add(href);

    const title = ($a.text() || "")
      .replace(/\s+/g, " ")
      .trim();

    if (!title || title.length < 10) return;

    links.push({ title, url: href });
  });

  return links;
}

export function toTavilyResult(
  link: ArticleLink,
  sourceLabel: string
): TavilyResult {
  return {
    title: link.title,
    url: link.url,
    content: link.title,
    raw_content: `[${sourceLabel}] ${link.title}`,
    published_date: new Date().toISOString(),
    score: 0.95,
  };
}
