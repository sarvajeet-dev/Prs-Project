import { TavilyResult } from "@/lib/types";

interface NewsApiArticle {
  title: string;
  url: string;
  description?: string;
  content?: string;
  publishedAt?: string;
  urlToImage?: string;
  source: {
    id: string | null;
    name: string;
  };
}

interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsApiArticle[];
}

const NEWSAPI_CACHE: Record<
  string,
  {
    results: TavilyResult[];
    timestamp: number;
  }
> = {};

const CACHE_TTL_MS = 1000 * 60 * 60;

/**
 * Translates RSS-style `when:Nd` operators (which other sources
 * accept) into NewsAPI's native `from=<ISO date>` parameter.
 */
function parseQueryForNewsApi(raw: string): {
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

export async function searchNewsApi(
  query: string
): Promise<TavilyResult[]> {
  const apiKey =
    process.env.NEWSAPI_API_KEY;

  if (!apiKey) {
    console.warn(
      "[NewsAPI] NEWSAPI_API_KEY not configured, skipping"
    );
    return [];
  }

  const cacheKey = `newsapi:${query}`;
  const cached = NEWSAPI_CACHE[cacheKey];

  if (
    cached &&
    Date.now() - cached.timestamp <
      CACHE_TTL_MS
  ) {
    return cached.results;
  }

  try {
    const { query: cleaned, from } =
      parseQueryForNewsApi(query);

    if (!cleaned) {
      return [];
    }

    const params = new URLSearchParams({
      q: cleaned,
      sortBy: "publishedAt",
      pageSize: "20",
      language: "en",
      apiKey,
    });

    if (from) {
      params.set("from", from);
    }

    const url = `https://newsapi.org/v2/everything?${params.toString()}`;

    const response = await fetch(url, {
      cache: "no-store",
    });

    if (!response.ok) {
      const text =
        await response.text();

      console.error(
        "[NewsAPI] Error:",
        response.status,
        text
      );

      return [];
    }

    const data =
      (await response.json()) as NewsApiResponse;

    if (
      data.status !== "ok" ||
      !data.articles
    ) {
      return [];
    }

    const results: TavilyResult[] =
      data.articles.map((article) => ({
        title: article.title,

        url: article.url,

        content:
          article.content ||
          article.description ||
          "",

        raw_content:
          article.description ||
          article.content,

        published_date:
          article.publishedAt,

        score: 0.85,
      }));

    NEWSAPI_CACHE[cacheKey] = {
      results,
      timestamp: Date.now(),
    };

    return results;
  } catch (error) {
    console.error(
      "[NewsAPI] Search failed:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return [];
  }
}
