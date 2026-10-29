import { TavilyResult } from "@/lib/types";

interface GNewsArticle {
  title: string;
  url: string;
  description: string;
  content: string;
  image: string;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
}

interface GNewsResponse {
  totalArticles: number;
  articles: GNewsArticle[];
}

const GNEWS_CACHE: Record<
  string,
  {
    results: TavilyResult[];
    timestamp: number;
  }
> = {};

const CACHE_TTL_MS = 1000 * 60 * 60;

/**
 * When GNews returns 429 (daily quota exhausted), there's no point
 * calling it again for the rest of this process — the quota resets
 * on a 24h window, and we'd just burn CPU on guaranteed failures.
 */
let rateLimitedUntil = 0;

/**
 * Translates RSS-style operators (e.g. `when:7d`) that other sources
 * accept but GNews rejects with a 400. Returns `{ query, from }` where
 * `query` is the stripped text and `from` is an ISO date for GNews's
 * native `from=` parameter.
 */
function parseQueryForGNews(raw: string): {
  query: string;
  from?: string;
} {
  const match = raw.match(/\bwhen:(\d+)d\b/i);

  if (!match) {
    return { query: raw.trim() };
  }

  const days = parseInt(match[1], 10);
  const since = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000
  );

  return {
    query: raw.replace(match[0], "").trim(),
    from: since.toISOString(),
  };
}

export async function searchGNews(
  query: string
): Promise<TavilyResult[]> {
  const apiKey =
    process.env.GNEWS_API_KEY;

  if (!apiKey) {
    console.warn(
      "[GNews] GNEWS_API_KEY not configured, skipping"
    );
    return [];
  }

  if (Date.now() < rateLimitedUntil) {
    return [];
  }

  const cacheKey = `gnews:${query}`;
  const cached = GNEWS_CACHE[cacheKey];

  if (
    cached &&
    Date.now() - cached.timestamp <
      CACHE_TTL_MS
  ) {
    return cached.results;
  }

  try {
    const { query: cleaned, from } =
      parseQueryForGNews(query);

    if (!cleaned) {
      return [];
    }

    const params = new URLSearchParams({
      q: cleaned,
      lang: "en",
      sortby: "publishedAt",
      max: "10",
      apikey: apiKey,
    });

    if (from) {
      params.set("from", from);
    }

    const url = `https://gnews.io/api/v4/search?${params.toString()}`;

    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response
        .text()
        .catch(() => "");

      console.error(
        "[GNews] Error:",
        response.status,
        body
      );

      if (response.status === 429) {
        rateLimitedUntil =
          Date.now() + 60 * 60 * 1000;
      }

      return [];
    }

    const data =
      (await response.json()) as GNewsResponse;

    if (!data.articles) {
      return [];
    }

    const results: TavilyResult[] =
      data.articles.map((article) => ({
        title: article.title,

        url: article.url,

        content: article.content || "",

        raw_content: article.description,

        published_date:
          article.publishedAt,

        score: 0.82,
      }));

    GNEWS_CACHE[cacheKey] = {
      results,
      timestamp: Date.now(),
    };

    return results;
  } catch (error) {
    console.error(
      "[GNews] Search failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return [];
  }
}
