import { XMLParser } from "fast-xml-parser";

export type Country =
  | "Singapore"
  | "Malaysia"
  | "Hong Kong";

export type PressRelease = {
  id: string;
  title: string;
  company: string;
  country: Country;
  publishedAt: string;
  description: string;
  url: string;
  source: string;
};

const parser = new XMLParser({
  ignoreAttributes: false,
});

const SEARCHES: Record<Country, string[]> = {
  Singapore: [
    '"Singapore" "press release"',
    '"Singapore" announcement',
    '"Singapore" launches',
    '"Singapore" partnership',
    '"Singapore" funding',
  ],

  Malaysia: [
    '"Malaysia" "press release"',
    '"Malaysia" announcement',
    '"Malaysia" launches',
    '"Malaysia" partnership',
    '"Malaysia" funding',
  ],

  "Hong Kong": [
    '"Hong Kong" "press release"',
    '"Hong Kong" announcement',
    '"Hong Kong" launches',
    '"Hong Kong" partnership',
    '"Hong Kong" funding',
  ],
};

function createGoogleNewsUrl(
  query: string
): string {
  const params = new URLSearchParams({
    q: query,
    hl: "en-US",
    gl: "US",
    ceid: "US:en",
  });

  return `https://news.google.com/rss/search?${params.toString()}`;
}

function cleanText(value: unknown): string {
  if (!value) return "";

  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractCompany(
  title: string,
  source?: string
): string {
  /*
   * Google News usually gives:
   *
   * Article title - Company/Publisher
   *
   * The publisher is more reliable than trying
   * to guess a company from the headline.
   */
  if (source) {
    return cleanText(source);
  }

  return "";
}

async function fetchGoogleNews(
  country: Country,
  query: string
): Promise<PressRelease[]> {
  const url = createGoogleNewsUrl(query);

  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent":
        "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Google News request failed: ${response.status}`
    );
  }

  const xml = await response.text();

  const parsed = parser.parse(xml);

  const items = parsed?.rss?.channel?.item;

  if (!items) {
    return [];
  }

  const itemArray = Array.isArray(items)
    ? items
    : [items];

  return itemArray
    .map((item: any) => {
      const title = cleanText(item.title);
      const description = cleanText(
        item.description
      );

      const publishedAt = new Date(
        item.pubDate
      );

      if (
        !title ||
        Number.isNaN(publishedAt.getTime())
      ) {
        return null;
      }

      const articleUrl = String(
        item.link || ""
      );

      if (!articleUrl) {
        return null;
      }

      const sourceName = cleanText(
        item.source?.["#text"] ||
          item.source ||
          ""
      );

      return {
        id: Buffer.from(
          articleUrl
        ).toString("base64url"),

        title,

        company: extractCompany(
          title,
          sourceName
        ),

        country,

        publishedAt:
          publishedAt.toISOString(),

        description,

        url: articleUrl,

        source: sourceName || "Google News",
      };
    })
    .filter(
      (
        release: PressRelease | null
      ): release is PressRelease =>
        release !== null
    );
}

export async function getPRNewswireReleases(): Promise<
  PressRelease[]
> {
  const results = await Promise.allSettled(
    Object.entries(SEARCHES).flatMap(
      ([country, queries]) =>
        queries.map((query) =>
          fetchGoogleNews(
            country as Country,
            query
          )
        )
    )
  );

  const releases: PressRelease[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      releases.push(...result.value);
    } else {
      console.error(
        "Google News error:",
        result.reason
      );
    }
  }

  /*
   * Remove duplicate articles.
   */
  const unique = Array.from(
    new Map(
      releases.map((release) => [
        release.url,
        release,
      ])
    ).values()
  );

  /*
   * Only keep the last 14 days.
   */
  const fourteenDaysAgo = new Date();

  fourteenDaysAgo.setDate(
    fourteenDaysAgo.getDate() - 14
  );

  const recent = unique.filter(
    (release) => {
      return (
        new Date(
          release.publishedAt
        ) >= fourteenDaysAgo
      );
    }
  );

  /*
   * Newest first.
   */
  recent.sort(
    (a, b) =>
      new Date(
        b.publishedAt
      ).getTime() -
      new Date(
        a.publishedAt
      ).getTime()
  );

  return recent;
}