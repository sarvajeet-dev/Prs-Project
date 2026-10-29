/**
 * Converts a Google News RSS redirect URL into one that works
 * in a browser.
 *
 * Two strategies, in order:
 *   1. If the base64 slug decodes to a plain article URL
 *      (older URL format), return that directly.
 *   2. Otherwise, strip `/rss/` from the path. The resulting
 *      `news.google.com/articles/...` URL is a regular Google
 *      News article page — opening it in a browser triggers
 *      Google's own redirect to the real publisher URL (the
 *      `/rss/` prefix is what causes the "invalid web address"
 *      error for non-RSS clients).
 *
 * Non-Google URLs are returned unchanged.
 */
export function decodeGoogleNewsUrl(url: string): string {
  if (!url) return url;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (
      host !== "news.google.com" &&
      !host.endsWith(".news.google.com")
    ) {
      return url;
    }

    const match = parsed.pathname.match(
      /\/articles\/([^/?#]+)/
    );

    if (match) {
      const slug = match[1]
        .replace(/-/g, "+")
        .replace(/_/g, "/");

      const padded =
        slug + "=".repeat((4 - (slug.length % 4)) % 4);

      try {
        const decoded =
          typeof window !== "undefined"
            ? atob(padded)
            : Buffer.from(padded, "base64").toString(
                "binary"
              );

        const urlMatch = decoded.match(
          /https?:\/\/[^\x00-\x1F\x7F"'<>]+/
        );

        if (
          urlMatch &&
          !/(?:^|\.)google\.com\//.test(urlMatch[0])
        ) {
          return urlMatch[0];
        }
      } catch {
        /* fall through to /rss/ strip */
      }
    }

    /*
     * Fallback: just strip the `/rss/` prefix. The resulting
     * URL opens Google News's own article page, which handles
     * the redirect to the real publisher natively.
     */
    if (parsed.pathname.startsWith("/rss/")) {
      const stripped = parsed.pathname.replace(
        /^\/rss\//,
        "/"
      );
      return `${parsed.protocol}//${parsed.host}${stripped}${parsed.search}${parsed.hash}`;
    }

    return url;
  } catch {
    return url;
  }
}
