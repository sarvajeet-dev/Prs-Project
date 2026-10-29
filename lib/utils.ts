import crypto from "crypto";

export function normalizeText(value: string = ""): string {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    parsed.hash = "";

    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "fbclid",
      "gclid",
    ];

    trackingParams.forEach((param) => {
      parsed.searchParams.delete(param);
    });

    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url;
  }
}

export function createId(value: string): string {
  return crypto
    .createHash("sha256")
    .update(value)
    .digest("hex")
    .slice(0, 24);
}

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function containsKeyword(
  text: string,
  keywords: string[]
): boolean {
  const normalized = normalizeText(text);

  return keywords.some((keyword) =>
    normalized.includes(normalizeText(keyword))
  );
}

export function countKeywordMatches(
  text: string,
  keywords: string[]
): number {
  const normalized = normalizeText(text);

  return keywords.reduce((count, keyword) => {
    return normalized.includes(normalizeText(keyword))
      ? count + 1
      : count;
  }, 0);
}

export function safeDate(date?: string): string | null {
  if (!date) {
    return null;
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

export function isRecent(
  date: string | null,
  days = 30
): boolean {
  if (!date) {
    return false;
  }

  const published = new Date(date);

  if (Number.isNaN(published.getTime())) {
    return false;
  }

  const now = Date.now();

  const difference =
    now - published.getTime();

  const maxAge =
    days * 24 * 60 * 60 * 1000;

  return difference >= 0 && difference <= maxAge;
}

export function stripHtml(
  content: string = ""
): string {
  if (!content) return "";

  let cleaned = content;

  // First, remove all HTML tags (anchor tags, font tags, etc.)
  cleaned = cleaned.replace(/<[^>]*>/g, " ");

  // Decode common HTML entities
  const entities: Record<string, string> = {
    "&nbsp;": " ",
    "&quot;": '"',
    "&#39;": "'",
    "&#x27;": "'",
    "&apos;": "'",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&hellip;": "...",
    "&mdash;": "—",
    "&ndash;": "–",
    "&rsquo;": "'",
    "&lsquo;": "'",
    "&rdquo;": '"',
    "&ldquo;": '"',
  };

  Object.entries(entities).forEach(
    ([entity, replacement]) => {
      cleaned = cleaned.replace(
        new RegExp(entity, "g"),
        replacement
      );
    }
  );

  // Decode numeric HTML entities (&#123; or &#x7B;)
  cleaned = cleaned.replace(
    /&#(\d+);/g,
    (_, code) =>
      String.fromCharCode(
        parseInt(code, 10)
      )
  );

  cleaned = cleaned.replace(
    /&#x([0-9a-fA-F]+);/g,
    (_, code) =>
      String.fromCharCode(
        parseInt(code, 16)
      )
  );

  // Remove any remaining HTML entities
  cleaned = cleaned.replace(/&[a-z]+;/gi, " ");

  // Collapse whitespace
  cleaned = cleaned
    .replace(/\s+/g, " ")
    .trim();

  return cleaned;
}