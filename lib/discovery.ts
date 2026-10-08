
import {
  EDUCATION_KEYWORDS,
  HEALTH_KEYWORDS,
  MARKETS,
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
} from "./utils";

import { searchTavily } from "./tavily";

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

  const signals: Signal[] =
    options.signals ?? SIGNALS;

  const queries: string[] = [];

  for (const conference of conferences) {
    for (const market of markets) {
      for (const signal of signals) {
        const industryKeywords =
          conference === "health"
            ? HEALTH_KEYWORDS
            : EDUCATION_KEYWORDS;

        const signalKeywords =
          SIGNAL_KEYWORDS[signal];

        const industryPart =
          industryKeywords
            .slice(0, 5)
            .map((keyword) => `"${keyword}"`)
            .join(" OR ");

        const signalPart =
          signalKeywords
            .slice(0, 5)
            .map((keyword) => `"${keyword}"`)
            .join(" OR ");

        const query = [
          `"${market}"`,
          `(${industryPart})`,
          `(${signalPart})`,
          `("press release" OR announcement OR news)`,
        ].join(" ");

        queries.push(query);
      }
    }
  }

  // Remove duplicate queries
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
   * 3. Detect business signals
   * -----------------------------------------
   */
  const signals =
    detectSignals(combinedText);

  /**
   * We are specifically looking for
   * meaningful business events.
   *
   * Example:
   *
   * Funding
   * Launch
   * Partnership
   * Expansion
   * Leadership
   * Research
   */
  if (signals.length === 0) {
    return null;
  }

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

  if (
    !organization ||
    organization === "Unknown Organization"
  ) {
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
  return {
    id,

    organization: {
      name: organization,
      country,
      category,
    },

    announcement: {
      title: result.title,

      description: (
        result.content ||
        result.raw_content ||
        ""
      )
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 1000),

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
   * 2. Search Tavily
   * -----------------------------------------
   *
   * Maximum 5 requests at the same time.
   */
  await runWithConcurrency(
    queries,
    5,
    async (query) => {
      const results =
        await searchTavily(query);

      rawResults += results.length;

      for (const result of results) {
        if (!result.url) {
          continue;
        }

        const normalizedUrl =
          normalizeUrl(result.url);

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
