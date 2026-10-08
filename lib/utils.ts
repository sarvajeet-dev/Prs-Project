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