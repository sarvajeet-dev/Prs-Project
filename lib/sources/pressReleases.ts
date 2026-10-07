import type {
  SearchResult,
  VerifiedPR,
  Country,
  Category,
} from "@/lib/types/prospect";

import {
  detectCountry,
  detectCategory,
} from "@/lib/intelligence/classify";

const NEWS_DOMAINS = [
  "reuters.com",
  "bloomberg.com",
  "forbes.com",
  "cnbc.com",
  "yahoo.com",
  "bbc.com",
  "theguardian.com",
  "scmp.com",
  "straitstimes.com",
  "channelnewsasia.com",
  "channelnewsasia.com",
  "thestar.com.my",
];

const PR_DOMAINS = [
  "prnewswire.com",
  "globenewswire.com",
  "businesswire.com",
  "media-outreach.com",
  "eqs-news.com",
];

const PR_KEYWORDS = [
  "press release",
  "press-release",
  "news release",
  "media release",
  "announcement",
  "announces",
  "announced",
  "official statement",
  "official announcement",
];

function getDomain(url: string): string {
  try {
    return new URL(url)
      .hostname
      .toLowerCase()
      .replace(/^www\./, "");
  } catch {
    return "";
  }
}

function isNewsWebsite(url: string): boolean {
  const domain = getDomain(url);

  return NEWS_DOMAINS.some(
    (newsDomain) =>
      domain === newsDomain ||
      domain.endsWith(`.${newsDomain}`)
  );
}

function isPRDistributionWebsite(
  url: string
): boolean {
  const domain = getDomain(url);

  return PR_DOMAINS.some(
    (prDomain) =>
      domain === prDomain ||
      domain.endsWith(`.${prDomain}`)
  );
}

function containsPRLanguage(
  text: string
): boolean {
  const normalized = text.toLowerCase();

  return PR_KEYWORDS.some((keyword) =>
    normalized.includes(keyword)
  );
}

function extractDate(
  result: SearchResult
): string | null {
  if (result.publishedDate) {
    const date = new Date(
      result.publishedDate
    );

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  const text = [
    result.title,
    result.content || "",
    result.rawContent || "",
  ].join(" ");

  const datePatterns = [
    /\b(20\d{2}-\d{2}-\d{2})\b/,

    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+20\d{2}\b/i,

    /\b\d{1,2}\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2}\b/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);

    if (!match) {
      continue;
    }

    const date = new Date(match[0]);

    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }

  return null;
}

function isWithinLast14Days(
  dateString: string
): boolean {
  const publishedDate =
    new Date(dateString);

  if (
    Number.isNaN(
      publishedDate.getTime()
    )
  ) {
    return false;
  }

  const now = Date.now();

  const fourteenDays =
    14 * 24 * 60 * 60 * 1000;

  const difference =
    now - publishedDate.getTime();

  return (
    difference >= 0 &&
    difference <= fourteenDays
  );
}

function cleanOrganizationName(
  name: string
): string {
  return name
    .replace(
      /^(press release|news release|announcement):\s*/i,
      ""
    )
    .replace(
      /\s+(announces|announced|launches|launched|unveils|introduces).*$/i,
      ""
    )
    .replace(/\s+/g, " ")
    .trim();
}

function extractOrganization(
  title: string,
  description: string
): string | null {
  const text = `${title} ${description}`;

  const patterns = [
    /^(.+?)\s+(?:announces|announced|launches|launched|unveils|unveiled|introduces|introduced)\b/i,

    /^(.+?)\s+(?:partners|partnered|teams up|collaborates)\b/i,

    /^(.+?)\s+(?:raises|raised|secures|secured)\b/i,

    /^(.+?)\s+(?:expands|expanded|opens|opened)\b/i,

    /^(?:press release|news release):\s*(.+?)\s+(?:announces|announced)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      const organization =
        cleanOrganizationName(
          match[1]
        );

      if (
        organization.length >= 2 &&
        organization.length <= 120
      ) {
        return organization;
      }
    }
  }

  return null;
}

function getSourceName(
  url: string
): string {
  const domain = getDomain(url);

  if (domain.includes("prnewswire")) {
    return "PR Newswire";
  }

  if (domain.includes("globenewswire")) {
    return "GlobeNewswire";
  }

  if (domain.includes("businesswire")) {
    return "Business Wire";
  }

  if (domain.includes("media-outreach")) {
    return "Media OutReach";
  }

  if (domain.includes("eqs-news")) {
    return "EQS News";
  }

  return domain;
}

function normalizeCountry(
  country: Country | null
): Country | null {
  return country;
}

function normalizeCategory(
  category: Category | null
): Category | null {
  return category;
}

export async function verifyPR(
  result: SearchResult
): Promise<VerifiedPR | null> {
  try {
    if (!result.url) {
      return null;
    }

    const combinedText = [
      result.title,
      result.content || "",
      result.rawContent || "",
    ]
      .join(" ")
      .trim();

    // ---------------------------------------------
    // Reject obvious generic news articles
    // ---------------------------------------------

    if (isNewsWebsite(result.url)) {
      return null;
    }

    // ---------------------------------------------
    // Country detection
    // ---------------------------------------------

    const country =
      normalizeCountry(
        detectCountry(combinedText)
      );

    if (!country) {
      return null;
    }

    // ---------------------------------------------
    // Category detection
    // ---------------------------------------------

    const category =
      normalizeCategory(
        detectCategory(combinedText)
      );

    if (!category) {
      return null;
    }

    // ---------------------------------------------
    // Verify PR language
    // ---------------------------------------------

    const prDistribution =
      isPRDistributionWebsite(
        result.url
      );

    const hasPRLanguage =
      containsPRLanguage(
        combinedText
      );

    if (
      !prDistribution &&
      !hasPRLanguage
    ) {
      return null;
    }

    // ---------------------------------------------
    // Published date
    // ---------------------------------------------

    const publishedAt =
      extractDate(result);

    if (!publishedAt) {
      return null;
    }

    // ---------------------------------------------
    // Last 14 days
    // ---------------------------------------------

    if (
      !isWithinLast14Days(
        publishedAt
      )
    ) {
      return null;
    }

    // ---------------------------------------------
    // Organization extraction
    // ---------------------------------------------

    const organization =
      extractOrganization(
        result.title,
        result.content || ""
      );

    if (!organization) {
      return null;
    }

    // ---------------------------------------------
    // Official source
    // ---------------------------------------------

    const isOfficialSource =
      !prDistribution &&
      !isNewsWebsite(result.url);

    // ---------------------------------------------
    // Build verified PR
    // ---------------------------------------------

    return {
      title: result.title,

      description:
        result.content ||
        result.rawContent ||
        "",

      url: result.url,

      publishedAt,

      source:
        getSourceName(result.url),

      organization,

      country,

      category,

      isPressRelease: true,

      isOfficialSource,
    };
  } catch (error) {
    console.error(
      "verifyPR error:",
      result.url,
      error
    );

    return null;
  }
}