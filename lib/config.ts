import { Conference, Market, Signal } from "./types";

export const MARKETS: Market[] = [
  "Singapore",
  "Malaysia",
  "Hong Kong",
];

export const CONFERENCES: Conference[] = [
  "health",
  "education",
];

export const SIGNALS: Signal[] = [
  "funding",
  "launch",
  "expansion",
  "partnership",
  "leadership",
  "research",
  "initiative",
];

export const CONFERENCE_NAMES: Record<Conference, string> = {
  health: "Health 2.0",
  education: "Education 2.0",
};

export const HEALTH_KEYWORDS = [
  "healthcare",
  "health care",
  "hospital",
  "clinic",
  "medical",
  "medtech",
  "medical technology",
  "digital health",
  "health technology",
  "healthtech",
  "biotech",
  "biotechnology",
  "pharma",
  "pharmaceutical",
  "life sciences",
  "clinical",
  "diagnostic",
  "diagnostics",
  "telemedicine",
  "telehealth",
  "wellness",
  "patient care",
  "health platform",
];

export const EDUCATION_KEYWORDS = [
  "education",
  "educational",
  "school",
  "university",
  "college",
  "higher education",
  "edtech",
  "education technology",
  "learning platform",
  "e-learning",
  "elearning",
  "training",
  "vocational",
  "academic",
  "student",
  "students",
  "teacher",
  "teachers",
  "curriculum",
  "online learning",
  "learning technology",
];

export const SIGNAL_KEYWORDS: Record<Signal, string[]> = {
  funding: [
    "funding",
    "funded",
    "investment",
    "invested",
    "raises",
    "raised",
    "raising",
    "series a",
    "series b",
    "series c",
    "series d",
    "venture capital",
    "capital",
  ],

  launch: [
    "launch",
    "launched",
    "launches",
    "unveil",
    "unveiled",
    "introduces",
    "introduced",
    "new product",
    "new platform",
    "new service",
    "new solution",
  ],

  expansion: [
    "expansion",
    "expand",
    "expanded",
    "expands",
    "new office",
    "new facility",
    "new campus",
    "enters market",
    "market expansion",
    "international expansion",
  ],

  partnership: [
    "partnership",
    "partnered",
    "partners",
    "collaboration",
    "collaborates",
    "strategic partnership",
    "agreement",
    "alliance",
    "joint venture",
  ],

  leadership: [
    "appointed",
    "appoints",
    "appointed as",
    "new ceo",
    "new chief",
    "chief executive",
    "joins as",
    "leadership",
    "executive",
    "management",
  ],

  research: [
    "research",
    "study",
    "clinical trial",
    "research findings",
    "researchers",
    "published study",
    "clinical research",
    "scientific",
  ],

  initiative: [
    "initiative",
    "program",
    "programme",
    "new initiative",
    "campaign",
    "project",
    "pilot",
    "new strategy",
  ],

  award: [
    "award",
    "awarded",
    "recognition",
    "recognized",
    "winner",
    "honored",
    "achievement",
  ],
};

export const PR_DOMAINS = [
  "prnewswire.com",
  "globenewswire.com",
  "businesswire.com",
  "media-outreach.com",
  "eqs-news.com",
];

export const OFFICIAL_HINTS = [
  "company",
  "corporate",
  "about",
  "news",
  "press",
  "media",
  "investor",
];

export const NEWS_DOMAINS = [
  "reuters.com",
  "bloomberg.com",
  "forbes.com",
  "cnbc.com",
  "bbc.com",
  "theguardian.com",
  "scmp.com",
  "straitstimes.com",
  "channelnewsasia.com",
  "thestar.com.my",
  "yahoo.com",
  "news.yahoo.com",
  "techcrunch.com",
  "techinasia.com",
  "e27.co",
  "nikkei.com",
  "asia.nikkei.com",
  "ft.com",
  "wsj.com",
  "theedgemalaysia.com",
  "nytimes.com",
];

export const PR_KEYWORDS = [
  "press release",
  "press-release",
  "news release",
  "media release",
  "announces",
  "announced",
  "announcement",
  "launches",
  "launched",
  "unveils",
  "unveiled",
  "introduces",
  "introduced",
  "official statement",
  "official announcement",
  "today announced",
];

export const RATE_LIMITS = {
  newsapi: 95,
  gnews: 95,
  generalRequests: 10,
};

export const CACHE_CONFIG = {
  ttlHours: 24,
  maxItems: 5000,
  deduplicationEnabled: true,
};

export const SOURCE_PRIORITY = [
  "media-outreach",
  "pr-newswire",
  "business-wire",
  "globe-newswire",
  "google-news-rss",
  "newsapi",
  "gnews",
  "web-scraper",
] as const;

/*
 * PR distribution sources are the primary signal. News
 * aggregators run too, but their results only survive the
 * PR-only filter in discovery.ts when they contain PR
 * language.
 */
export const PR_DISTRIBUTION_SOURCES = [
  "media-outreach",
  "pr-newswire",
  "business-wire",
  "globe-newswire",
] as const;

export const GOOGLE_NEWS_REGIONS = {
  Singapore: "SG",
  Malaysia: "MY",
  "Hong Kong": "HK",
} as const;