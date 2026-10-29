import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/122.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://news.google.com/",
};

/*
 * All Google-owned hosts we treat as "still Google" when
 * resolving — including usercontent/thumbnail hosts like
 * lh3.googleusercontent.com (which was being surfaced as
 * "View PR" targets since they appear in interstitial HTML).
 */
const GOOGLE_HOSTS = [
  "google.com",
  "news.google.com",
  "googleusercontent.com",
  "ggpht.com",
  "gstatic.com",
  "googleapis.com",
  "googletagmanager.com",
  "google-analytics.com",
  "googlesyndication.com",
  "doubleclick.net",
  "youtube.com",
  "ytimg.com",
  "blogger.com",
  "recaptcha.net",
];

function isGoogleHost(host: string): boolean {
  const normalized = host.replace(/^www\./, "");

  for (const g of GOOGLE_HOSTS) {
    if (
      normalized === g ||
      normalized.endsWith(`.${g}`)
    ) {
      return true;
    }
  }

  return false;
}

/*
 * File extensions that mean "this is an asset, not an article."
 */
const ASSET_EXTENSION_REGEX =
  /\.(jpg|jpeg|png|gif|svg|webp|ico|css|js|woff2?|ttf|otf|mp4|mp3|pdf)(\?|#|$)/i;

function looksLikeArticle(parsed: URL): boolean {
  if (ASSET_EXTENSION_REGEX.test(parsed.pathname)) {
    return false;
  }

  /*
   * Pure homepages (path = "/" or "") don't resolve to the
   * article either — require a meaningful path.
   */
  const trimmed = parsed.pathname.replace(/\/$/, "");
  if (trimmed.length < 4) return false;

  return true;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/*
 * Pulls the real article URL out of a Google News interstitial
 * HTML page. Tries several patterns in order of reliability.
 */
function extractRealUrl(html: string): string | null {
  const patterns: RegExp[] = [
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+http-equiv=["']refresh["'][^>]+url=([^"'>\s]+)/i,
    /data-n-au=["']([^"']+)["']/i,
    /<c-wiz[^>]+data-url=["']([^"']+)["']/i,
    /window\.location\.replace\(["']([^"']+)["']\)/i,
    /window\.location\s*=\s*["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      try {
        const parsed = new URL(match[1]);
        if (
          !isGoogleHost(parsed.hostname) &&
          looksLikeArticle(parsed)
        ) {
          return parsed.toString();
        }
      } catch {
        // Skip invalid URL
      }
    }
  }

  /*
   * Fallback: scan every absolute URL in the HTML and pick
   * the first candidate that's (a) not on a Google-owned host,
   * (b) not a schema/w3/social CDN, (c) looks like an article
   * (meaningful path, not an image/asset extension), and
   * (d) appears at least twice (so it's probably the real
   * subject article, not an incidental link).
   */
  const SOCIAL_HOSTS = [
    "schema.org",
    "w3.org",
    "ogp.me",
    "twitter.com",
    "x.com",
    "facebook.com",
    "linkedin.com",
    "instagram.com",
    "tiktok.com",
    "pinterest.com",
    "reddit.com",
    "whatsapp.com",
    "t.me",
    "fbcdn.net",
    "twimg.com",
  ];

  const allUrls = html.match(
    /https?:\/\/[^"'\s<>]+/g
  );

  if (!allUrls) return null;

  const counts = new Map<string, number>();

  for (const candidate of allUrls) {
    try {
      const parsed = new URL(candidate);
      const host = parsed.hostname.replace(/^www\./, "");

      if (isGoogleHost(parsed.hostname)) continue;
      if (SOCIAL_HOSTS.some((s) => host === s || host.endsWith(`.${s}`))) {
        continue;
      }
      if (!looksLikeArticle(parsed)) continue;

      const normalized = parsed.toString();
      counts.set(
        normalized,
        (counts.get(normalized) || 0) + 1
      );
    } catch {
      // skip
    }
  }

  if (counts.size === 0) return null;

  /* Prefer the URL that appears most often. */
  const sorted = [...counts.entries()].sort(
    (a, b) => b[1] - a[1]
  );

  return sorted[0][0];
}

async function fetchFollow(
  url: string
): Promise<{ html: string; finalUrl: string } | null> {
  try {
    const response = await fetch(url, {
      headers: BROWSER_HEADERS,
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    } as RequestInit & { signal: AbortSignal });

    if (!response.ok) {
      console.warn(
        `[ResolveUrl] fetch ${url} → ${response.status}`
      );
      return null;
    }

    return {
      html: await response.text(),
      finalUrl: response.url || url,
    };
  } catch (error) {
    console.warn(
      `[ResolveUrl] fetch ${url} failed:`,
      error instanceof Error ? error.message : "error"
    );
    return null;
  }
}

async function resolve(url: string): Promise<string | null> {
  if (!isGoogleHost(hostnameOf(url))) {
    return url;
  }

  console.log(`[ResolveUrl] Resolving ${url}`);

  const fetched = await fetchFollow(url);

  if (!fetched) {
    return null;
  }

  if (!isGoogleHost(hostnameOf(fetched.finalUrl))) {
    console.log(
      `[ResolveUrl] HTTP redirect took us to ${fetched.finalUrl}`
    );
    return fetched.finalUrl;
  }

  const extracted = extractRealUrl(fetched.html);

  if (extracted) {
    console.log(`[ResolveUrl] Extracted ${extracted}`);
    return extracted;
  }

  console.warn(
    `[ResolveUrl] Could not extract real URL from ${url}`
  );
  return null;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { success: false, error: "url is required" },
      { status: 400 }
    );
  }

  const resolved = await resolve(url);

  if (!resolved) {
    return NextResponse.json({
      success: false,
      url: null,
    });
  }

  return NextResponse.json({
    success: true,
    url: resolved,
  });
}
