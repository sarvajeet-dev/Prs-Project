import { XMLParser } from "fast-xml-parser";

export type Country =
  | "Singapore"
  | "Malaysia"
  | "Hong Kong";

export type Category =
  | "Healthcare"
  | "Education";

export type PressRelease = {
  id: string;
  title: string;

  // Actual company extraction can be added later.
  companies: string[];

  // Google News publisher
  publisher: string;

  country: Country;

  category: Category;

  publishedAt: string;

  description: string;

  url: string;

  source: string;
};

const parser = new XMLParser({
  ignoreAttributes: false,
});

/*
|--------------------------------------------------------------------------
| Healthcare keywords
|--------------------------------------------------------------------------
*/

const HEALTHCARE_KEYWORDS = [
  "healthcare",
  "health care",
  "healthtech",
  "health tech",
  "digital health",
  "hospital",
  "hospitals",
  "clinic",
  "clinics",
  "medical",
  "medical device",
  "medical technology",
  "medtech",
  "biotech",
  "biotechnology",
  "pharma",
  "pharmaceutical",
  "pharmaceuticals",
  "telemedicine",
  "telehealth",
  "diagnostics",
  "diagnostic",
  "patient",
  "patients",
  "health services",
  "healthcare services",
];

/*
|--------------------------------------------------------------------------
| Education keywords
|--------------------------------------------------------------------------
*/

const EDUCATION_KEYWORDS = [
  "education",
  "education technology",
  "edtech",
  "ed tech",
  "e-learning",
  "elearning",
  "online learning",
  "learning platform",
  "school",
  "schools",
  "university",
  "universities",
  "college",
  "colleges",
  "student",
  "students",
  "teacher",
  "teachers",
  "academic",
  "academia",
  "higher education",
  "vocational training",
  "training",
  "education platform",
];

/*
|--------------------------------------------------------------------------
| Search queries
|
| You can control exactly what we search for here.
|--------------------------------------------------------------------------
*/

const SEARCHES: Record<
  Country,
  Record<Category, string[]>
> = {
  Singapore: {
    Healthcare: [
      '"Singapore" healthcare',
      '"Singapore" healthtech',
      '"Singapore" hospital',
      '"Singapore" medtech',
      '"Singapore" biotech',
      '"Singapore" pharma',
      '"Singapore" "digital health"',
      '"Singapore" telemedicine',
      '"Singapore" diagnostics',
    ],

    Education: [
      '"Singapore" education',
      '"Singapore" edtech',
      '"Singapore" university',
      '"Singapore" school',
      '"Singapore" "learning platform"',
      '"Singapore" "education technology"',
      '"Singapore" "online learning"',
      '"Singapore" "higher education"',
    ],
  },

  Malaysia: {
    Healthcare: [
      '"Malaysia" healthcare',
      '"Malaysia" healthtech',
      '"Malaysia" hospital',
      '"Malaysia" medtech',
      '"Malaysia" biotech',
      '"Malaysia" pharma',
      '"Malaysia" "digital health"',
      '"Malaysia" telemedicine',
      '"Malaysia" diagnostics',
    ],

    Education: [
      '"Malaysia" education',
      '"Malaysia" edtech',
      '"Malaysia" university',
      '"Malaysia" school',
      '"Malaysia" "learning platform"',
      '"Malaysia" "education technology"',
      '"Malaysia" "online learning"',
      '"Malaysia" "higher education"',
    ],
  },

  "Hong Kong": {
    Healthcare: [
      '"Hong Kong" healthcare',
      '"Hong Kong" healthtech',
      '"Hong Kong" hospital',
      '"Hong Kong" medtech',
      '"Hong Kong" biotech',
      '"Hong Kong" pharma',
      '"Hong Kong" "digital health"',
      '"Hong Kong" telemedicine',
      '"Hong Kong" diagnostics',
    ],

    Education: [
      '"Hong Kong" education',
      '"Hong Kong" edtech',
      '"Hong Kong" university',
      '"Hong Kong" school',
      '"Hong Kong" "learning platform"',
      '"Hong Kong" "education technology"',
      '"Hong Kong" "online learning"',
      '"Hong Kong" "higher education"',
    ],
  },
};

/*
|--------------------------------------------------------------------------
| Create Google News RSS URL
|--------------------------------------------------------------------------
*/

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

/*
|--------------------------------------------------------------------------
| Clean RSS HTML
|--------------------------------------------------------------------------
*/

function cleanText(value: unknown): string {
  if (!value) {
    return "";
  }

  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/*
|--------------------------------------------------------------------------
| Check whether article belongs to category
|--------------------------------------------------------------------------
*/

function matchesCategory(
  title: string,
  description: string,
  category: Category
): boolean {
  const text =
    `${title} ${description}`.toLowerCase();

  const keywords =
    category === "Healthcare"
      ? HEALTHCARE_KEYWORDS
      : EDUCATION_KEYWORDS;

  return keywords.some((keyword) =>
    text.includes(keyword.toLowerCase())
  );
}

/*
|--------------------------------------------------------------------------
| Get publisher
|--------------------------------------------------------------------------
*/

function getPublisher(item: any): string {
  if (!item.source) {
    return "";
  }

  if (
    typeof item.source === "object" &&
    "#text" in item.source
  ) {
    return cleanText(
      item.source["#text"]
    );
  }

  return cleanText(item.source);
}

/*
|--------------------------------------------------------------------------
| Fetch one Google News RSS query
|--------------------------------------------------------------------------
*/

async function fetchGoogleNews(
  country: Country,
  category: Category,
  query: string
): Promise<PressRelease[]> {
  const rssUrl =
    createGoogleNewsUrl(query);

  const response = await fetch(
    rssUrl,
    {
      cache: "no-store",

      headers: {
        "User-Agent":
          "Mozilla/5.0",
        Accept:
          "application/rss+xml, application/xml, text/xml",
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Google News request failed: ${response.status}`
    );
  }

  const xml =
    await response.text();

  const parsed =
    parser.parse(xml);

  const items =
    parsed?.rss?.channel?.item;

  if (!items) {
    return [];
  }

  const itemArray =
    Array.isArray(items)
      ? items
      : [items];

  const releases: PressRelease[] =
    [];

  for (const item of itemArray) {
    const title =
      cleanText(item.title);

    const description =
      cleanText(item.description);

    const articleUrl =
      String(item.link || "").trim();

    const publishedDate =
      new Date(item.pubDate);

    /*
     * Basic validation
     */
    if (!title) {
      continue;
    }

    if (!articleUrl) {
      continue;
    }

    if (
      Number.isNaN(
        publishedDate.getTime()
      )
    ) {
      continue;
    }

    /*
     * IMPORTANT:
     *
     * Even though our Google query already contains
     * healthcare/education terms, we perform another
     * check before returning the article.
     */
    if (
      !matchesCategory(
        title,
        description,
        category
      )
    ) {
      continue;
    }

    const publisher =
      getPublisher(item);

    releases.push({
      id: Buffer.from(
        articleUrl
      ).toString("base64url"),

      title,

      companies: [],

      publisher,

      country,

      category,

      publishedAt:
        publishedDate.toISOString(),

      description,

      url: articleUrl,

      source:
        publisher || "Google News",
    });
  }

  return releases;
}

/*
|--------------------------------------------------------------------------
| Main function
|--------------------------------------------------------------------------
*/

export async function getPRNewswireReleases(): Promise<
  PressRelease[]
> {
  const requests: Promise<
    PressRelease[]
  >[] = [];

  /*
   * Loop:
   *
   * Singapore
   *   Healthcare
   *   Education
   *
   * Malaysia
   *   Healthcare
   *   Education
   *
   * Hong Kong
   *   Healthcare
   *   Education
   */

  for (const country of Object.keys(
    SEARCHES
  ) as Country[]) {
    for (const category of Object.keys(
      SEARCHES[country]
    ) as Category[]) {
      for (const query of
        SEARCHES[country][category]) {
        requests.push(
          fetchGoogleNews(
            country,
            category,
            query
          )
        );
      }
    }
  }

  /*
   * If one Google News query fails,
   * don't kill the entire request.
   */

  const results =
    await Promise.allSettled(
      requests
    );

  const releases: PressRelease[] =
    [];

  for (const result of results) {
    if (
      result.status ===
      "fulfilled"
    ) {
      releases.push(
        ...result.value
      );
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

  const uniqueMap = new Map<
    string,
    PressRelease
  >();

  for (const release of releases) {
    const existing =
      uniqueMap.get(
        release.url
      );

    /*
     * If the same article was found
     * under multiple queries, keep it once.
     */
    if (!existing) {
      uniqueMap.set(
        release.url,
        release
      );
    }
  }

  const unique =
    Array.from(
      uniqueMap.values()
    );

  /*
   * Last 14 days only
   */

  const fourteenDaysAgo =
    new Date();

  fourteenDaysAgo.setDate(
    fourteenDaysAgo.getDate() -
      14
  );

  const recent =
    unique.filter(
      (release) => {
        return (
          new Date(
            release.publishedAt
          ) >= fourteenDaysAgo
        );
      }
    );

  /*
   * Newest first
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