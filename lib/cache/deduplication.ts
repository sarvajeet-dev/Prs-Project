import { createHash } from "crypto";

export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);

    urlObj.search = "";
    urlObj.hash = "";
    urlObj.pathname =
      urlObj.pathname.replace(/\/$/, "");

    return urlObj.toString();
  } catch {
    return url.toLowerCase();
  }
}

export function createUrlHash(
  url: string
): string {
  const normalized = normalizeUrl(url);

  return createHash("sha256")
    .update(normalized)
    .digest("hex");
}

class DeduplicationStore {
  private seenUrls: Set<string> = new Set();

  private seenHashes: Set<string> =
    new Set();

  private maxSize = 10000;

  add(url: string): boolean {
    const normalized = normalizeUrl(url);
    const hash = createUrlHash(url);

    if (
      this.seenUrls.has(normalized) ||
      this.seenHashes.has(hash)
    ) {
      return false;
    }

    this.seenUrls.add(normalized);
    this.seenHashes.add(hash);

    if (
      this.seenUrls.size > this.maxSize
    ) {
      const urls = Array.from(
        this.seenUrls
      );

      this.seenUrls.clear();
      this.seenHashes.clear();

      const recent = urls.slice(
        -this.maxSize
      );

      for (const u of recent) {
        this.seenUrls.add(u);
        const h = createHash("sha256")
          .update(u)
          .digest("hex");

        this.seenHashes.add(h);
      }
    }

    return true;
  }

  has(url: string): boolean {
    const normalized = normalizeUrl(url);
    const hash = createUrlHash(url);

    return (
      this.seenUrls.has(normalized) ||
      this.seenHashes.has(hash)
    );
  }

  clear(): void {
    this.seenUrls.clear();
    this.seenHashes.clear();
  }

  size(): number {
    return this.seenUrls.size;
  }

  stats() {
    return {
      totalSeen: this.seenUrls.size,
      capacity: this.maxSize,
      usagePercent: Math.round(
        (this.seenUrls.size /
          this.maxSize) *
          100
      ),
    };
  }
}

export const deduplicationStore =
  new DeduplicationStore();
