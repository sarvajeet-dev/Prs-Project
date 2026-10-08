import {
  CONFERENCE_NAMES,
  EDUCATION_KEYWORDS,
  HEALTH_KEYWORDS,
  PR_DOMAINS,
  NEWS_DOMAINS,
  SIGNAL_KEYWORDS,
} from "./config";

import {
  Category,
  Conference,
  Signal,
  SourceType,
  TavilyResult,
} from "./types";

import {
  containsKeyword,
  countKeywordMatches,
  getDomain,
  normalizeText,
  safeDate,
} from "./utils";

export function detectCategory(
  text: string
): Category {
  const healthScore =
    countKeywordMatches(
      text,
      HEALTH_KEYWORDS
    );

  const educationScore =
    countKeywordMatches(
      text,
      EDUCATION_KEYWORDS
    );

  if (
    healthScore === 0 &&
    educationScore === 0
  ) {
    return "unknown";
  }

  if (
    healthScore > 0 &&
    educationScore > 0 &&
    Math.abs(
      healthScore - educationScore
    ) <= 1
  ) {
    return "both";
  }

  return healthScore > educationScore
    ? "healthcare"
    : "education";
}

export function detectConferences(
  category: Category
): Conference[] {
  if (category === "healthcare") {
    return ["health"];
  }

  if (category === "education") {
    return ["education"];
  }

  if (category === "both") {
    return ["health", "education"];
  }

  return [];
}

export function detectSignals(
  text: string
): Signal[] {
  const normalized = normalizeText(text);

  const signals: Signal[] = [];

  (
    Object.entries(
      SIGNAL_KEYWORDS
    ) as [Signal, string[]][]
  ).forEach(
    ([signal, keywords]) => {
      const matched = keywords.some(
        (keyword) =>
          normalized.includes(
            normalizeText(keyword)
          )
      );

      if (matched) {
        signals.push(signal);
      }
    }
  );

  return signals;
}

export function detectCountry(
  text: string
): "Singapore" | "Malaysia" | "Hong Kong" | null {
  const normalized =
    normalizeText(text);

  if (
    normalized.includes("singapore")
  ) {
    return "Singapore";
  }

  if (
    normalized.includes("malaysia") ||
    normalized.includes("kuala lumpur") ||
    normalized.includes("selangor") ||
    normalized.includes("penang") ||
    normalized.includes("johor")
  ) {
    return "Malaysia";
  }

  if (
    normalized.includes("hong kong") ||
    normalized.includes("hongkong")
  ) {
    return "Hong Kong";
  }

  return null;
}

export function detectSourceType(
  url: string
): SourceType {
  const domain = getDomain(url);

  if (
    PR_DOMAINS.some(
      (item) =>
        domain === item ||
        domain.endsWith(`.${item}`)
    )
  ) {
    return "PR_DISTRIBUTION";
  }

  if (
    NEWS_DOMAINS.some(
      (item) =>
        domain === item ||
        domain.endsWith(`.${item}`)
    )
  ) {
    return "NEWS";
  }

  return "OTHER";
}

export function extractOrganization(
  title: string,
  content: string
): string {
  const combined =
    `${title} ${content}`;

  const patterns = [
    /^(.*?)\s+(?:announces|announced|launches|launched|introduces|introduced)/i,

    /^(.*?)\s+(?:partners|partnered|enters into partnership)/i,

    /^(.*?)\s+(?:raises|raised|secures|secured)\s+/i,

    /^(.*?)\s+(?:appoints|appointed|names|named)\s+/i,

    /^(.*?)\s+(?:expands|expanded|opens|opened)\s+/i,
  ];

  for (const pattern of patterns) {
    const match =
      title.match(pattern);

    if (match?.[1]) {
      const value =
        match[1].trim();

      if (
        value.length >= 2 &&
        value.length <= 100
      ) {
        return cleanOrganization(
          value
        );
      }
    }
  }

  // Common press release format:
  // "Company Name Announces..."

  const firstPart =
    title.split(/\s+(?:announces|launches|introduces|partners|raises|secures|appoints|expands)\s+/i)[0];

  if (
    firstPart &&
    firstPart.length <= 100
  ) {
    return cleanOrganization(
      firstPart
    );
  }

  return "Unknown Organization";
}

function cleanOrganization(
  value: string
): string {
  return value
    .replace(
      /^\[(.*?)\]\s*/,
      ""
    )
    .replace(
      /\s+\|\s+.*$/,
      ""
    )
    .trim();
}

export function calculateScore(
  result: TavilyResult,
  category: Category,
  signals: Signal[],
  sourceType: SourceType,
  publishedAt: string | null
): {
  score: number;
  reasons: string[];
} {
  let score = 0;

  const reasons: string[] = [];

  // Category relevance
  if (category === "healthcare") {
    score += 25;
    reasons.push(
      "Strong healthcare relevance"
    );
  }

  if (category === "education") {
    score += 25;
    reasons.push(
      "Strong education relevance"
    );
  }

  if (category === "both") {
    score += 30;
    reasons.push(
      "Relevant to both healthcare and education"
    );
  }

  // Signal score
  if (signals.length > 0) {
    const signalScore = Math.min(
      signals.length * 7,
      28
    );

    score += signalScore;

    reasons.push(
      `Business signals: ${signals.join(", ")}`
    );
  }

  // High-value signals
  const highValueSignals: Signal[] =
    [
      "funding",
      "launch",
      "expansion",
      "partnership",
    ];

  const highValueCount =
    signals.filter((signal) =>
      highValueSignals.includes(
        signal
      )
    ).length;

  score += Math.min(
    highValueCount * 8,
    24
  );

  // Source
  if (
    sourceType ===
    "PR_DISTRIBUTION"
  ) {
    score += 15;

    reasons.push(
      "Published through a PR distribution source"
    );
  }

  if (
    sourceType === "OFFICIAL_COMPANY"
  ) {
    score += 15;

    reasons.push(
      "Potential official company announcement"
    );
  }

  if (
    sourceType === "NEWS"
  ) {
    score += 8;

    reasons.push(
      "Covered by a major news source"
    );
  }

  // Date
  if (publishedAt) {
    score += 8;

    reasons.push(
      "Publication date available"
    );
  }

  // Search relevance score
  if (
    typeof result.score === "number"
  ) {
    if (result.score >= 0.8) {
      score += 5;
    } else if (
      result.score >= 0.6
    ) {
      score += 3;
    }
  }

  return {
    score: Math.min(score, 100),
    reasons,
  };
}