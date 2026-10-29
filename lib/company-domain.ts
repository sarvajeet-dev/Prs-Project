import { getDomain } from "./utils";

const DOMAIN_CACHE = new Map<
  string,
  { domain: string | null; timestamp: number }
>();

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

const BLOCKED_DOMAINS = [
  "prnewswire.com",
  "globenewswire.com",
  "businesswire.com",
  "reuters.com",
  "bloomberg.com",
  "forbes.com",
  "linkedin.com",
  "facebook.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "youtube.com",
  "wikipedia.org",
  "google.com",
  "bing.com",
  "yahoo.com",
  "news.google.com",
  "scmp.com",
  "straitstimes.com",
  "channelnewsasia.com",
  "thestar.com.my",
  "cnbc.com",
  "bbc.com",
  "cnn.com",
];

export async function getCompanyDomain(
  organization: string
): Promise<string | null> {
  const cacheKey =
    organization.toLowerCase().trim();

  const cached = DOMAIN_CACHE.get(cacheKey);

  if (
    cached &&
    Date.now() - cached.timestamp <
      CACHE_TTL_MS
  ) {
    return cached.domain;
  }

  try {
    const domain =
      await searchDuckDuckGoForDomain(
        organization
      );

    DOMAIN_CACHE.set(cacheKey, {
      domain,
      timestamp: Date.now(),
    });

    return domain;
  } catch (error) {
    console.error(
      `[CompanyDomain] Lookup failed for ${organization}:`,
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    DOMAIN_CACHE.set(cacheKey, {
      domain: null,
      timestamp: Date.now(),
    });

    return null;
  }
}

async function searchDuckDuckGoForDomain(
  organization: string
): Promise<string | null> {
  const query = `${organization} official website`;
  const encoded =
    encodeURIComponent(query);

  const url = `https://html.duckduckgo.com/html/?q=${encoded}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    } as RequestInit & {
      signal: AbortSignal;
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    const urlPattern =
      /uddg=([^&"']+)/g;

    const matches = [
      ...html.matchAll(urlPattern),
    ];

    for (const match of matches.slice(
      0,
      10
    )) {
      try {
        const decoded =
          decodeURIComponent(match[1]);

        const domain = getDomain(decoded);

        if (!domain) continue;

        const blocked =
          BLOCKED_DOMAINS.some((b) =>
            domain.includes(b)
          );

        if (blocked) continue;

        return domain;
      } catch {
        continue;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

export async function findCompanyDomain(
  organization: string
): Promise<string | null> {
  return getCompanyDomain(organization);
}
