
import {
  EDUCATION_KEYWORDS,
  HEALTH_KEYWORDS,
  MARKETS,
  PR_KEYWORDS,
  SIGNAL_KEYWORDS,
  SIGNALS,
} from "./config";

import {
  Conference,
  Market,
  Prospect,
  Signal,
  TavilyResult,
} from "./types";

import {
  createId,
  getDomain,
  normalizeUrl,
  safeDate,
  stripHtml,
} from "./utils";

import { searchMultipleSources } from "./sources/search-orchestrator";
import {
  withRateLimit,
  rateLimiter,
} from "./cache/rate-limiter";
import { deduplicationStore } from "./cache/deduplication";
import { enrichProspect } from "./enrichment/prospect-enrichment";

import {
  calculateScore,
  detectCategory,
  detectConferences,
  detectCountry,
  detectSignals,
  detectSourceType,
  extractOrganization,
} from "./scoring";

interface DiscoveryOptions {
  conferences?: Conference[];
  markets?: Market[];
  signals?: Signal[];
}

function hasPRLanguage(text: string): boolean {
  if (!text) return false;
  const normalized = text.toLowerCase();
  return PR_KEYWORDS.some((keyword) =>
    normalized.includes(keyword)
  );
}

function extractOrgFromTitle(
  title: string
): string {
  if (!title) return "";

  const cleaned = title
    .replace(/\s*[-|–—]\s*.+$/, "")
    .trim();

  const words = cleaned.split(/\s+/);

  if (words.length <= 6) {
    return cleaned;
  }

  return words.slice(0, 6).join(" ");
}

/**
 * Build all Tavily search queries.
 *
 * Example:
 *
 * Singapore + Health + Funding
 * Singapore + Health + Launch
 * Singapore + Education + Funding
 * etc.
 */
function buildQueries(
  options: DiscoveryOptions = {}
): string[] {
  const conferences: Conference[] =
    options.conferences ?? [
      "health",
      "education",
    ];

  const markets: Market[] =
    options.markets ?? MARKETS;

  const queries: string[] = [];

  const broadIndustryTerms: Record<
    Conference,
    string[]
  > = {
    health: [
      "healthcare",
      "hospital",
      "medtech",
      "biotech",
      "digital health",
      "pharma",
      "clinical",
      "telehealth",
      "medical",
    ],
    education: [
      "edtech",
      "university",
      "school",
      "learning platform",
      "higher education",
      "online learning",
      "training",
      "academic",
    ],
  };

  const broadSignalTerms = [
    "funding",
    "raises",
    "launch",
    "expansion",
    "partnership",
    "appointed",
    "announcement",
  ];

  for (const conference of conferences) {
    const industryTerms =
      broadIndustryTerms[conference];

    for (const market of markets) {
      for (const industry of industryTerms) {
        const query = `${market} ${industry} when:7d`;
        queries.push(query);
      }

      for (const signal of broadSignalTerms) {
        const primaryTerm =
          conference === "health"
            ? "healthcare"
            : "education";

        const query = `${market} ${primaryTerm} ${signal} when:7d`;
        queries.push(query);
      }
    }
  }

  return [...new Set(queries)];
}

/**
 * Run async tasks with limited concurrency.
 *
 * We don't want to fire 42 Tavily requests
 * simultaneously.
 */
async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  let currentIndex = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      const index = currentIndex++;

      if (index >= items.length) {
        return;
      }

      const item = items[index];

      try {
        await worker(item);
      } catch (error) {
        console.error(
          "Discovery worker failed:",
          error
        );
      }
    }
  }

  const workerCount = Math.min(
    concurrency,
    items.length
  );

  const workers: Promise<void>[] = [];

  for (let i = 0; i < workerCount; i++) {
    workers.push(runWorker());
  }

  await Promise.all(workers);
}

/**
 * Convert one Tavily result into our Prospect format.
 */
function createProspect(
  result: TavilyResult,
  query: string
): Prospect | null {
  // Tavily result must have URL
  if (!result.url) {
    return null;
  }

  // Tavily result must have title
  if (!result.title) {
    return null;
  }

  const content =
    result.raw_content ||
    result.content ||
    "";

  const combinedText = [
    result.title,
    content,
  ].join(" ");

  /**
   * -----------------------------------------
   * 1. Detect category
   * -----------------------------------------
   */
  const category =
    detectCategory(combinedText);

  if (category === "unknown") {
    return null;
  }

  /**
   * -----------------------------------------
   * 2. Detect conference
   * -----------------------------------------
   */
  const conferences =
    detectConferences(category);

  if (conferences.length === 0) {
    return null;
  }

  /**
   * -----------------------------------------
   * 3. Detect business signals (optional)
   * -----------------------------------------
   */
  const signals =
    detectSignals(combinedText);

  /**
   * -----------------------------------------
   * 4. Detect country
   * -----------------------------------------
   */
  const country =
    detectCountry(combinedText);

  /**
   * -----------------------------------------
   * 5. Published date
   * -----------------------------------------
   */
  const publishedAt =
    safeDate(result.published_date);

  /**
   * -----------------------------------------
   * 6. Source
   * -----------------------------------------
   */
  const sourceType =
    detectSourceType(result.url);

  /*
   * PR-only filter.
   *
   * - PR_DISTRIBUTION (prnewswire, globenewswire, businesswire, ...)
   *   is always kept.
   * - NEWS (reuters, bloomberg, CNA, Straits Times, ...) is always
   *   rejected — the user explicitly asked for PRs, not news.
   * - OTHER domains are kept only if the title/content uses press
   *   release language ("announces", "launches", "press release", ...).
   */
  if (sourceType === "NEWS") {
    return null;
  }

  if (
    sourceType !== "PR_DISTRIBUTION" &&
    !hasPRLanguage(combinedText)
  ) {
    return null;
  }

  /**
   * -----------------------------------------
   * 7. Organization
   * -----------------------------------------
   */
  const organization =
    extractOrganization(
      result.title,
      content
    );

  const finalOrgName =
    organization &&
    organization !== "Unknown Organization"
      ? organization
      : extractOrgFromTitle(result.title);

  if (!finalOrgName) {
    return null;
  }

  /**
   * -----------------------------------------
   * 8. Calculate fit score
   * -----------------------------------------
   */
  const fit = calculateScore(
    result,
    category,
    signals,
    sourceType,
    publishedAt
  );

  /**
   * -----------------------------------------
   * 9. Create stable ID
   * -----------------------------------------
   */
  const normalizedUrl =
    normalizeUrl(result.url);

  const id = createId(normalizedUrl);

  /**
   * -----------------------------------------
   * 10. Create final Prospect
   * -----------------------------------------
   */
  const cleanTitle = stripHtml(result.title);

  const cleanDescription = stripHtml(
    result.content ||
      result.raw_content ||
      ""
  ).slice(0, 1000);

  return {
    id,

    organization: {
      name: finalOrgName,
      country,
      category,
    },

    announcement: {
      title: cleanTitle,

      description: cleanDescription,

      url: result.url,

      publishedAt,

      source: getDomain(result.url),

      sourceType,

      signals,
    },

    conferences,

    fit,

    discovery: {
      query,

      discoveredAt:
        new Date().toISOString(),
    },
  };
}

/**
 * Main discovery function.
 */
export async function discoverProspects(
  options: DiscoveryOptions = {}
): Promise<{
  prospects: Prospect[];

  meta: {
    rawResults: number;
    uniqueResults: number;
    finalResults: number;
    queriesExecuted: number;
  };
}> {
  /**
   * -----------------------------------------
   * 1. Build queries
   * -----------------------------------------
   */
  const queries =
    buildQueries(options);

  /*
   * The deduplication store is a module-level singleton that
   * persists across runs. On re-runs it would reject every URL
   * seen before, collapsing results to near-zero. Clear it so
   * each discovery starts with a clean slate — in-run duplicates
   * are already handled by `resultMap` below.
   */
  deduplicationStore.clear();

  /**
   * Map URL -> Tavily result
   *
   * This removes duplicate PRs.
   */
  const resultMap = new Map<
    string,
    {
      result: TavilyResult;
      query: string;
    }
  >();

  let rawResults = 0;

  /**
   * -----------------------------------------
   * 2. Search multiple sources
   * -----------------------------------------
   *
   * Maximum 3 concurrent searches.
   * Uses rate limiting and deduplication.
   */
  await runWithConcurrency(
    queries,
    3,
    async (query) => {
      try {
        const results =
          await withRateLimit(
            "general",
            () =>
              searchMultipleSources(
                query,
                {
                  maxResults: 50,
                }
              ),
            {
              fallback: [],
              delayMs: 100,
            }
          );

        rawResults += results.length;

        for (const result of results) {
          if (!result.url) {
            continue;
          }

          const normalizedUrl =
            normalizeUrl(result.url);

          if (
            deduplicationStore.add(result.url)
          ) {
            if (
              !resultMap.has(normalizedUrl)
            ) {
              resultMap.set(
                normalizedUrl,
                {
                  result,
                  query,
                }
              );
            }
          }
        }
      } catch (error) {
        console.error(
          `[Discovery] Query failed: ${query}`,
          error instanceof Error
            ? error.message
            : "Unknown error"
        );
      }
    }
  );

  /**
   * -----------------------------------------
   * 3. Convert results into prospects
   * -----------------------------------------
   */
  const prospects: Prospect[] = [];

  for (const {
    result,
    query,
  } of resultMap.values()) {
    const prospect =
      createProspect(
        result,
        query
      );

    if (!prospect) {
      continue;
    }

    prospects.push(prospect);
  }

  /**
   * -----------------------------------------
   * 4. Sort by highest score
   * -----------------------------------------
   */
  prospects.sort(
    (a, b) =>
      b.fit.score -
      a.fit.score
  );

  /**
   * -----------------------------------------
   * 4b. Enrich top prospects with contacts
   * -----------------------------------------
   *
   * Only enrich top 15 prospects to keep discovery fast.
   * Other prospects can be enriched on-demand later.
   */
  const enrichmentCount = Math.min(
    15,
    prospects.length
  );

  console.log(
    `[Discovery] Enriching top ${enrichmentCount} prospects with contacts...`
  );

  await runWithConcurrency(
    prospects.slice(0, enrichmentCount),
    3,
    async (prospect) => {
      try {
        const result = await enrichProspect(prospect);

        if (result.primaryContact) {
          prospect.organization.primaryContact =
            result.primaryContact;
        }

        if (result.contacts.length > 0) {
          prospect.organization.contacts =
            result.contacts;
        }

        if (result.website) {
          prospect.organization.website =
            result.website;
        }
      } catch (error) {
        console.error(
          `[Discovery] Enrichment failed for ${prospect.organization.name}:`,
          error instanceof Error
            ? error.message
            : "Unknown error"
        );
      }
    }
  );

  const enrichedCount = prospects.filter(
    (p) => p.organization.primaryContact
  ).length;

  console.log(
    `[Discovery] Enriched ${enrichedCount}/${enrichmentCount} prospects`
  );

  /**
   * -----------------------------------------
   * 5. Return
   * -----------------------------------------
   */
  return {
    prospects,

    meta: {
      rawResults,

      uniqueResults:
        resultMap.size,

      finalResults:
        prospects.length,

      queriesExecuted:
        queries.length,
    },
  };
}
