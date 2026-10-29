import { resolve4, resolveMx } from "dns/promises";
import { Contact, Prospect } from "@/lib/types";
import { scrapeCompanyContacts } from "./website-scraper";
import { getCompanyDomain } from "@/lib/company-domain";

export interface EnrichmentResult {
  contacts: Contact[];
  primaryContact: Contact | null;
  website: string | null;
  diagnostics: string[];
}

/**
 * Fast DNS check — returns true if the domain has either A
 * records or MX records. We use this to reject fabricated
 * guesses like `studentfirsttechnologies.com` before trying
 * to scrape them.
 */
async function domainResolves(
  domain: string
): Promise<boolean> {
  try {
    const [a, mx] = await Promise.allSettled([
      resolve4(domain),
      resolveMx(domain),
    ]);

    return (
      (a.status === "fulfilled" && a.value.length > 0) ||
      (mx.status === "fulfilled" && mx.value.length > 0)
    );
  } catch {
    return false;
  }
}

function orgNameToDomainCandidates(
  organizationName: string
): string[] {
  const base = organizationName
    .toLowerCase()
    .replace(
      /\s+(ltd|inc|llc|corp|co|pte|limited|holdings|technologies|technology)\.?$/i,
      ""
    )
    .replace(/[^a-z0-9 ]/g, "")
    .trim();

  if (!base) return [];

  const words = base.split(/\s+/).filter(Boolean);
  const joined = words.join("");
  const abbreviations: string[] = [joined];

  if (words.length > 1) {
    abbreviations.push(words[0]);
    abbreviations.push(words.slice(0, 2).join(""));
    abbreviations.push(
      words.map((w) => w[0]).join("")
    );
  }

  const tlds = [".com", ".io", ".co", ".ai", ".org"];
  const results: string[] = [];

  for (const stem of [...new Set(abbreviations)]) {
    if (stem.length < 3) continue;
    for (const tld of tlds) {
      results.push(`${stem}${tld}`);
    }
  }

  return results;
}

const ENRICHMENT_CACHE: Map<
  string,
  {
    result: EnrichmentResult;
    timestamp: number;
  }
> = new Map();

const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

const EMAIL_REGEX =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/*
 * Emails frequently embedded in article HTML/CSS that aren't
 * real press contacts. Filter them out before picking a best match.
 */
const EMAIL_BLOCKLIST = [
  "@example",
  "@test",
  "@sentry",
  "@wordpress",
  "@2x",
  "@3x",
  "noreply@",
  "no-reply@",
  "privacy@",
  "support@google",
  "support@facebook",
  "support@twitter",
  "advertise@",
  "copyright@",
];

const DISTRIBUTOR_DOMAINS = [
  "einpresswire.com",
  "prnewswire.com",
  "globenewswire.com",
  "businesswire.com",
  "media-outreach.com",
  "eqs-news.com",
  "news.google.com",
  "google.com",
];

/*
 * CDN / asset / platform hosts that appear all over article
 * HTML (favicons, images, trackers, embeds). If we don't
 * filter these, our "most frequent host wins" heuristic for
 * finding the company website latches onto `gstatic.com` etc.
 */
const ASSET_HOSTS = [
  "gstatic.com",
  "googleusercontent.com",
  "googleapis.com",
  "googletagmanager.com",
  "google-analytics.com",
  "googlesyndication.com",
  "doubleclick.net",
  "youtube.com",
  "ytimg.com",
  "cloudfront.net",
  "cloudflare.com",
  "akamaihd.net",
  "akamaized.net",
  "fastly.net",
  "jsdelivr.net",
  "unpkg.com",
  "jquery.com",
  "bootstrapcdn.com",
  "fontawesome.com",
  "typekit.net",
  "fonts.gstatic.com",
  "s.w.org",
  "wp.com",
  "gravatar.com",
  "bing.com",
  "yahoo.com",
  "duckduckgo.com",
  "amazonaws.com",
];

/*
 * Pretend to be a real browser so PR distributor sites
 * (einpresswire, globenewswire, scmp etc.) don't 403 us
 * or return a reduced-content "bot" page.
 */
const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
    "AppleWebKit/537.36 (KHTML, like Gecko) " +
    "Chrome/122.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;" +
    "q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "identity",
};

function isGoogleNewsHost(host: string): boolean {
  return (
    host === "news.google.com" ||
    host.endsWith(".news.google.com")
  );
}

/**
 * Decodes a Google News redirect URL via its base64 slug.
 * The slug after `/rss/articles/` is a base64-encoded
 * protobuf containing the destination URL as UTF-8.
 */
function decodeGoogleNewsSlug(
  url: string
): string | null {
  try {
    const parsed = new URL(url);

    if (!isGoogleNewsHost(parsed.hostname.replace(/^www\./, ""))) {
      return null;
    }

    const match = parsed.pathname.match(
      /\/articles\/([^/?#]+)/
    );

    if (!match) return null;

    const slug = match[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const padded =
      slug + "=".repeat((4 - (slug.length % 4)) % 4);

    const decoded = Buffer.from(
      padded,
      "base64"
    ).toString("utf-8");

    const urlMatch = decoded.match(
      /https?:\/\/[^\x00-\x1F\x7F"'<>]+/
    );

    return urlMatch ? urlMatch[0] : null;
  } catch {
    return null;
  }
}

/**
 * Pulls a real article URL out of a Google News interstitial
 * HTML page. The interstitial contains either a canonical link,
 * a meta-refresh, or a `data-n-au` attribute pointing at the
 * actual article.
 */
function extractUrlFromGoogleInterstitial(
  html: string
): string | null {
  const patterns = [
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    /<meta[^>]+http-equiv=["']refresh["'][^>]+url=([^"'>\s]+)/i,
    /data-n-au=["']([^"']+)["']/i,
    /<a[^>]+href=["'](https?:\/\/(?!(?:www\.)?(?:google\.com|news\.google\.com|accounts\.google\.com|gstatic\.com))[^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      try {
        new URL(match[1]);
        return match[1];
      } catch {
        continue;
      }
    }
  }

  return null;
}

/**
 * Many sites obfuscate contact emails to deter scraping:
 *   "press [at] foo [dot] com"
 *   "press(at)foo.com"
 *   "press AT foo DOT com"
 * Expand these back into real `@` and `.` so our regex catches
 * them like any other address.
 */
function deobfuscateEmails(html: string): string {
  return html
    .replace(
      /\s*(?:\[|\(|&#?x?\d*;?)\s*(?:at|@)\s*(?:\]|\)|&#?x?\d*;?)\s*/gi,
      "@"
    )
    .replace(
      /\s*(?:\[|\(|&#?x?\d*;?)\s*(?:dot|\.)\s*(?:\]|\)|&#?x?\d*;?)\s*/gi,
      "."
    )
    .replace(/\s+at\s+(?=\w+\s+dot\s+)/gi, "@")
    .replace(/\s+dot\s+/gi, ".");
}

interface PRPageScrape {
  contacts: Contact[];
  website: string | null;
  distributorHost: string | null;
}

/**
 * Scrapes the "Contact Us" page on the PR host — either a
 * known distributor (media-outreach.com, einpresswire.com)
 * or any news publisher (sinchew-i.com, manilatimes.net).
 * Returns real working emails that can at least route an
 * inquiry about the article even when the subject company
 * can't be identified.
 */
async function scrapePublisherContacts(
  publisherHost: string
): Promise<Contact[]> {
  const paths = [
    "/contact-us",
    "/contact",
    "/contactus",
    "/about/contact",
    "/about-us/contact",
    "/en/contact",
    "/about",
  ];

  const isKnownDistributor = DISTRIBUTOR_DOMAINS.some(
    (d) => publisherHost.endsWith(d)
  );

  for (const path of paths) {
    const url = `https://${publisherHost}${path}`;
    const fetched = await fetchHtml(url, 6000);

    if (!fetched) continue;

    const html = deobfuscateEmails(fetched.html);
    const matches = html.match(EMAIL_REGEX) || [];

    const emails = [
      ...new Set(matches.map((e) => e.toLowerCase())),
    ].filter((email) => {
      if (
        EMAIL_BLOCKLIST.some((b) => email.includes(b))
      ) {
        return false;
      }

      const emailDomain = email.split("@")[1] || "";

      /*
       * Keep only emails on the publisher's own domain or
       * close relatives (e.g. sinchew-i.com + chewmedia.com).
       */
      return (
        emailDomain === publisherHost ||
        emailDomain.endsWith(`.${publisherHost}`) ||
        publisherHost.endsWith(`.${emailDomain}`)
      );
    });

    if (emails.length === 0) continue;

    /*
     * Rank: media/press/pr → regional (hk@, sg@, …) → generic.
     * Regional offices are 2-char country prefixes like
     * `hk@`, `sg@`, `my@` — those are the most actionable.
     */
    const score = (email: string): number => {
      const local = email.split("@")[0];
      if (
        local === "media" ||
        local === "press" ||
        local === "pr"
      )
        return 0;
      if (/^[a-z]{2}$/.test(local)) return 1;
      if (
        local === "contact" ||
        local === "info" ||
        local === "hello"
      )
        return 2;
      return 3;
    };

    const sorted = emails.sort(
      (a, b) => score(a) - score(b)
    );

    const emailType = isKnownDistributor
      ? "pr-distributor"
      : "pr-publisher";
    const sourceLabel = isKnownDistributor
      ? `PR distributor (${publisherHost})`
      : `Publisher (${publisherHost})`;

    return sorted.map((email) => {
      const local = email.split("@")[0];
      const isRegional = /^[a-z]{2}$/.test(local);

      return {
        name: null,
        firstName: null,
        lastName: null,
        title: isRegional
          ? `${local.toUpperCase()} office`
          : null,
        email,
        emailType,
        confidence: 55,
        verificationStatus: "verified",
        source: sourceLabel,
        sourceUrl: url,
      };
    });
  }

  return [];
}

async function fetchHtml(
  url: string,
  timeoutMs = 10000
): Promise<{ html: string; finalUrl: string } | null> {
  try {
    const response = await fetch(url, {
      headers: BROWSER_HEADERS,
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    } as RequestInit & { signal: AbortSignal });

    if (!response.ok) {
      console.warn(
        `[Enrichment] fetch ${url} → ${response.status}`
      );
      return null;
    }

    const html = await response.text();
    return { html, finalUrl: response.url || url };
  } catch (error) {
    console.warn(
      `[Enrichment] fetch ${url} failed:`,
      error instanceof Error ? error.message : "error"
    );
    return null;
  }
}

/**
 * Fetches the actual PR article and extracts (a) any press
 * contact emails from the body and (b) the subject company's
 * own website URL so we can go deeper. Press releases almost
 * always include both inline (e.g. "media@foo.com" + a link
 * to "www.foo.com").
 */
async function scrapePRPage(
  prUrl: string
): Promise<PRPageScrape> {
  try {
    /*
     * Two-stage Google News resolution: first try to decode
     * the base64 slug (fast, works for most URLs). If the
     * fetched page is still a Google interstitial, parse its
     * HTML for the real article URL and re-fetch.
     */
    const slugDecoded = decodeGoogleNewsSlug(prUrl);
    const firstUrl = slugDecoded || prUrl;

    console.log(
      `[Enrichment] PR fetch: ${firstUrl}${slugDecoded ? " (decoded from Google News)" : ""}`
    );

    let fetched = await fetchHtml(firstUrl);

    if (!fetched) {
      return {
        contacts: [],
        website: null,
        distributorHost: null,
      };
    }

    let { html, finalUrl } = fetched;
    const landedOnGoogle = isGoogleNewsHost(
      new URL(finalUrl).hostname.replace(/^www\./, "")
    );

    if (landedOnGoogle) {
      const extracted =
        extractUrlFromGoogleInterstitial(html);

      if (extracted) {
        console.log(
          `[Enrichment] Landed on Google interstitial; re-fetching ${extracted}`
        );

        const secondFetch = await fetchHtml(extracted);
        if (secondFetch) {
          html = secondFetch.html;
          finalUrl = secondFetch.finalUrl;
        }
      }
    }

    /*
     * Deobfuscate "email [at] domain [dot] com" style
     * addresses so our regex catches them.
     */
    html = deobfuscateEmails(html);

    const finalHost = (() => {
      try {
        return new URL(finalUrl).hostname.replace(
          /^www\./,
          ""
        );
      } catch {
        return "";
      }
    })();

    /*
     * Pull every email we can find on the page, filter out
     * platform/distributor noise, and dedupe.
     */
    const emailMatches = html.match(EMAIL_REGEX) || [];
    /*
     * Role-mailbox local parts that we KEEP even when the
     * email is on the publisher's own domain. Footer contacts
     * like "info@sinchew-i.com" are legitimate press contacts
     * even though they live on the article's own host.
     */
    const PUBLISHER_ROLE_LOCALS = new Set([
      "info",
      "contact",
      "press",
      "media",
      "editor",
      "editors",
      "newsroom",
      "news",
      "hello",
      "enquiries",
      "inquiries",
    ]);

    const uniqueEmails = [
      ...new Set(
        emailMatches.map((e) => e.toLowerCase())
      ),
    ];

    const externalEmails: string[] = [];
    const publisherEmails: string[] = [];

    for (const email of uniqueEmails) {
      if (
        EMAIL_BLOCKLIST.some((b) => email.includes(b))
      ) {
        continue;
      }

      const [local, emailDomain] = email.split("@");
      if (!emailDomain) continue;

      if (
        DISTRIBUTOR_DOMAINS.some((d) =>
          emailDomain.endsWith(d)
        )
      ) {
        /*
         * Keep distributor role mailboxes as publisher-type
         * contacts (same bucket as publisher role mailboxes).
         */
        if (PUBLISHER_ROLE_LOCALS.has(local)) {
          publisherEmails.push(email);
        }
        continue;
      }

      if (finalHost && emailDomain === finalHost) {
        if (PUBLISHER_ROLE_LOCALS.has(local)) {
          publisherEmails.push(email);
        }
        continue;
      }

      externalEmails.push(email);
    }

    /*
     * Rank external (subject-company) emails:
     * media@ → press@ → pr@ → contact@ → everything else.
     */
    const prefixPriority = (email: string) => {
      const local = email.split("@")[0];
      if (local === "media") return 0;
      if (local === "press") return 1;
      if (local === "pr") return 2;
      if (local.startsWith("media")) return 3;
      if (local.startsWith("press")) return 4;
      if (local === "contact") return 5;
      if (local === "info") return 6;
      return 7;
    };

    const prioritizedExternal = externalEmails.sort(
      (a, b) => prefixPriority(a) - prefixPriority(b)
    );

    const prioritizedPublisher = publisherEmails.sort(
      (a, b) => prefixPriority(a) - prefixPriority(b)
    );

    const contacts: Contact[] = [
      ...prioritizedExternal.map((email) => {
        const nameParts = email
          .split("@")[0]
          .split(/[._+-]/);

        return {
          name: null,
          firstName: nameParts[0] || null,
          lastName: nameParts[1] || null,
          title: null,
          email,
          emailType: "pr-page",
          confidence: 90,
          verificationStatus: "verified",
          source: "Press release",
          sourceUrl: finalUrl,
        } as Contact;
      }),
      ...prioritizedPublisher.map((email) => {
        const emailDomain = email.split("@")[1];

        return {
          name: null,
          firstName: null,
          lastName: null,
          title: null,
          email,
          emailType: "pr-publisher",
          confidence: 55,
          verificationStatus: "verified",
          source: `Publisher (${emailDomain})`,
          sourceUrl: finalUrl,
        } as Contact;
      }),
    ];

    /*
     * Also try to find the subject company's own website URL
     * inside the PR body. We look for anchor links labelled
     * "Contact" / "Visit" / "Website" / "Learn more" first,
     * then fall back to the most-frequently-linked host.
     */
    const website = extractCompanyWebsiteFromHtml(
      html,
      finalHost
    );

    console.log(
      `[Enrichment] PR scrape done: ${contacts.length} emails, website=${website || "none"} (host=${finalHost})`
    );

    /*
     * The publisher host (the site hosting the article)
     * — could be a known PR distributor (media-outreach.com)
     * or a news publisher (sinchew-i.com, manilatimes.net).
     * Either way we may want to fall back to scraping its
     * /contact page.
     */
    return {
      contacts,
      website,
      distributorHost: finalHost || null,
    };
  } catch (error) {
    console.warn(
      "[Enrichment] PR scrape failed:",
      error instanceof Error ? error.message : "error"
    );
    return {
      contacts: [],
      website: null,
      distributorHost: null,
    };
  }
}

const SOCIAL_HOSTS = [
  "twitter.com",
  "x.com",
  "facebook.com",
  "linkedin.com",
  "instagram.com",
  "youtube.com",
  "tiktok.com",
  "github.com",
  "medium.com",
];

function isRejectedHost(
  host: string,
  prHost: string
): boolean {
  if (!host) return true;
  if (prHost && host === prHost) return true;
  if (
    DISTRIBUTOR_DOMAINS.some((d) => host.endsWith(d))
  ) {
    return true;
  }
  if (
    SOCIAL_HOSTS.some((s) => host.endsWith(s))
  ) {
    return true;
  }
  if (
    ASSET_HOSTS.some((a) => host.endsWith(a))
  ) {
    return true;
  }
  if (host.endsWith(".gov")) return true;
  if (
    host === "schema.org" ||
    host === "w3.org" ||
    host === "ogp.me"
  ) {
    return true;
  }
  return false;
}

/*
 * Scans the PR article HTML for the subject company's own
 * website. Strategy:
 *   1. First, look for anchor tags whose visible text says
 *      "Contact Us" / "Contact" / "Visit" / "Website" — those
 *      almost always point to the real company domain.
 *   2. Fallback: pick the most-frequently-linked non-asset
 *      host (homepage usually gets linked a few times).
 *
 * All asset / CDN / tracker / social / distributor hosts are
 * filtered out so Google Fonts / gstatic / youtube etc. can't
 * win by sheer frequency.
 */
function extractCompanyWebsiteFromHtml(
  html: string,
  prHost: string
): string | null {
  const anchorRegex =
    /<a\s+[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>([^<]*)<\/a>/gi;

  let anchorMatch: RegExpExecArray | null;
  const anchorCandidates: string[] = [];

  while ((anchorMatch = anchorRegex.exec(html)) !== null) {
    const linkUrl = anchorMatch[1];
    const linkText = anchorMatch[2]
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    if (
      !/contact|visit|website|home|learn more|about/i.test(
        linkText
      )
    ) {
      continue;
    }

    try {
      const host = new URL(linkUrl).hostname.replace(
        /^www\./,
        ""
      );

      if (isRejectedHost(host, prHost)) continue;

      anchorCandidates.push(host);
    } catch {
      // skip
    }
  }

  if (anchorCandidates.length > 0) {
    const counts = new Map<string, number>();
    for (const host of anchorCandidates) {
      counts.set(host, (counts.get(host) || 0) + 1);
    }

    const sorted = [...counts.entries()].sort(
      (a, b) => b[1] - a[1]
    );

    return sorted[0][0];
  }

  const hrefMatches = html.match(
    /href=["']https?:\/\/[^"'\s]+["']/gi
  );

  if (!hrefMatches) return null;

  const candidates: string[] = [];

  for (const raw of hrefMatches) {
    const match = raw.match(
      /href=["'](https?:\/\/[^"']+)["']/i
    );

    if (!match) continue;

    try {
      const url = new URL(match[1]);
      const host = url.hostname.replace(/^www\./, "");

      if (isRejectedHost(host, prHost)) continue;

      candidates.push(host);
    } catch {
      // skip
    }
  }

  if (candidates.length === 0) return null;

  const counts = new Map<string, number>();
  for (const host of candidates) {
    counts.set(host, (counts.get(host) || 0) + 1);
  }

  const sorted = [...counts.entries()].sort(
    (a, b) => b[1] - a[1]
  );

  /*
   * Guard: if the "winner" only appears once, we have no real
   * evidence it's the company website. Reject rather than
   * surface a bogus guess.
   */
  if (sorted[0][1] < 2) return null;

  return sorted[0][0];
}

async function detectCompanyDomain(
  prospect: Prospect,
  hintDomain: string | null,
  diagnostics: string[]
): Promise<string | null> {
  if (hintDomain) {
    const cleaned = cleanDomain(hintDomain);
    diagnostics.push(
      `Using domain hint from PR body: ${cleaned}`
    );
    return cleaned;
  }

  try {
    const detected = await getCompanyDomain(
      prospect.organization.name
    );

    if (detected) {
      const cleaned = cleanDomain(detected);
      diagnostics.push(
        `getCompanyDomain returned: ${cleaned}`
      );
      return cleaned;
    }
  } catch {
    // Fall through
  }

  try {
    const url = new URL(prospect.announcement.url);
    const hostname = url.hostname.replace(
      /^www\./,
      ""
    );

    const isDistributor =
      DISTRIBUTOR_DOMAINS.some((d) =>
        hostname.endsWith(d)
      ) ||
      ASSET_HOSTS.some((a) =>
        hostname.endsWith(a)
      );

    if (!isDistributor) {
      diagnostics.push(
        `Using article URL host: ${hostname}`
      );
      return hostname;
    }
  } catch {
    // Invalid URL
  }

  /*
   * Last resort: generate plausible domain candidates from the
   * org name and DNS-check each one. First that resolves wins.
   * This handles the common case where the company's domain
   * matches their name but we had no other evidence.
   */
  const candidates = orgNameToDomainCandidates(
    prospect.organization.name
  );

  if (candidates.length > 0) {
    diagnostics.push(
      `Trying DNS lookup on ${candidates.length} name-based candidates`
    );

    for (const candidate of candidates) {
      if (await domainResolves(candidate)) {
        diagnostics.push(
          `Candidate ${candidate} resolves — using it`
        );
        return candidate;
      }
    }

    diagnostics.push("No name-based candidate resolved");
  }

  return null;
}

function cleanDomain(domain: string): string {
  return domain
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
}

function rankContacts(contacts: Contact[]): Contact[] {
  /*
   * Rank order:
   *   1. Named person on company website (highest value for outreach)
   *   2. Press/media contact from PR page
   *   3. Role mailbox on company website (info@, contact@, …)
   *   4. Pattern-guessed email
   *   5. Fallback
   */
  const score = (contact: Contact): number => {
    const isNamed = Boolean(
      contact.name ||
        (contact.firstName && contact.lastName)
    );
    const hasTitle = Boolean(contact.title);

    switch (contact.emailType) {
      case "website":
        return 100 + (isNamed ? 20 : 0) + (hasTitle ? 10 : 0);
      case "pr-page":
        return 80 + (isNamed ? 10 : 0);
      case "role-mailbox":
        return 60;
      case "pr-publisher":
        return 50;
      case "pr-distributor":
        return 45;
      case "pattern":
        return 40;
      case "fallback":
        return 20;
      default:
        return 50;
    }
  };

  return [...contacts].sort((a, b) => score(b) - score(a));
}

function dedupeContacts(contacts: Contact[]): Contact[] {
  const byEmail = new Map<string, Contact>();

  for (const contact of contacts) {
    const key = (contact.email || "").toLowerCase();
    if (!key) continue;

    const existing = byEmail.get(key);

    if (!existing) {
      byEmail.set(key, contact);
      continue;
    }

    /*
     * Merge: keep the richer entry (name/title/source)
     * while preferring higher confidence.
     */
    const merged: Contact = {
      ...existing,
      name: existing.name || contact.name,
      firstName:
        existing.firstName || contact.firstName,
      lastName: existing.lastName || contact.lastName,
      title: existing.title || contact.title,
      confidence: Math.max(
        existing.confidence || 0,
        contact.confidence || 0
      ),
      emailType:
        (existing.confidence || 0) >=
        (contact.confidence || 0)
          ? existing.emailType
          : contact.emailType,
      source: existing.source || contact.source,
      sourceUrl:
        existing.sourceUrl || contact.sourceUrl,
    };

    byEmail.set(key, merged);
  }

  return Array.from(byEmail.values());
}

export async function enrichProspect(
  prospect: Prospect
): Promise<EnrichmentResult> {
  const cacheKey = prospect.organization.name
    .toLowerCase()
    .trim();

  const cached = ENRICHMENT_CACHE.get(cacheKey);

  if (
    cached &&
    Date.now() - cached.timestamp < CACHE_TTL_MS
  ) {
    return cached.result;
  }

  const allContacts: Contact[] = [];
  let website: string | null = null;
  let distributorHost: string | null = null;
  const diagnostics: string[] = [];

  console.log(
    `[Enrichment] Starting for "${prospect.organization.name}"`
  );

  try {
    /*
     * Step 1: scrape the PR article itself. Gives us the
     * press/media contact AND often a link to the company's
     * own website that we can go deeper on.
     */
    if (prospect.announcement.url) {
      const prScrape = await scrapePRPage(
        prospect.announcement.url
      );

      allContacts.push(...prScrape.contacts);
      website = prScrape.website;
      distributorHost = prScrape.distributorHost;

      diagnostics.push(
        `PR page: ${prScrape.contacts.length} email(s)` +
          (prScrape.website
            ? `, website hint: ${prScrape.website}`
            : ", no website hint") +
          (prScrape.distributorHost
            ? `, distributor: ${prScrape.distributorHost}`
            : "")
      );
    }

    /*
     * Step 2: resolve the company domain (using the PR page
     * hint if we found one). We scrape its homepage + /contact
     * + /team pages for person-level contacts.
     */
    const domain = await detectCompanyDomain(
      prospect,
      website,
      diagnostics
    );

    console.log(
      `[Enrichment] Domain resolved: ${domain || "none"}`
    );

    if (domain) {
      if (!website) {
        website = domain;
      }

      try {
        const websiteContacts =
          await scrapeCompanyContacts(domain);

        console.log(
          `[Enrichment] Company site (${domain}) → ${websiteContacts.length} contacts`
        );

        diagnostics.push(
          `Scraped ${domain}: ${websiteContacts.length} contact(s)`
        );

        allContacts.push(...websiteContacts);
      } catch (error) {
        const msg =
          error instanceof Error
            ? error.message
            : "Unknown error";
        console.error(
          `[Enrichment] Website scraping failed for ${domain}:`,
          msg
        );
        diagnostics.push(
          `Scraping ${domain} failed: ${msg}`
        );
      }
    } else {
      diagnostics.push(
        "No company domain could be identified"
      );
    }

    /*
     * Step 3: last-resort fallback — follow the "Contact Us"
     * link on the PR distributor itself (media-outreach.com,
     * einpresswire.com, etc.) and grab their regional office
     * emails. These aren't the subject company's contacts,
     * but they're real working inboxes that can route an
     * inquiry about the PR.
     */
    if (allContacts.length === 0 && distributorHost) {
      const distributorContacts =
        await scrapePublisherContacts(distributorHost);

      console.log(
        `[Enrichment] Distributor fallback (${distributorHost}) → ${distributorContacts.length} contacts`
      );

      diagnostics.push(
        `Distributor fallback (${distributorHost}): ${distributorContacts.length} contact(s)`
      );

      allContacts.push(...distributorContacts);
    }

    const deduped = dedupeContacts(allContacts);
    const ranked = rankContacts(deduped);

    console.log(
      `[Enrichment] Final: ${ranked.length} contact(s) for "${prospect.organization.name}"`
    );

    const result: EnrichmentResult = {
      contacts: ranked,
      primaryContact: ranked[0] || null,
      website: website
        ? website.startsWith("http")
          ? website
          : `https://${website}`
        : null,
      diagnostics,
    };

    /*
     * Only cache non-empty results. Caching empties would
     * freeze the "no contacts" state for 24h and make Refresh
     * useless.
     */
    if (ranked.length > 0) {
      ENRICHMENT_CACHE.set(cacheKey, {
        result,
        timestamp: Date.now(),
      });
    }

    return result;
  } catch (error) {
    console.error(
      `[Enrichment] Failed for ${prospect.organization.name}:`,
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    diagnostics.push(
      `Enrichment threw: ${error instanceof Error ? error.message : "unknown"}`
    );

    const result: EnrichmentResult = {
      contacts: [],
      primaryContact: null,
      website,
      diagnostics,
    };

    /* Don't cache failures — let the next click try again. */
    return result;
  }
}

/*
 * Backwards-compatible wrapper used by legacy call sites that
 * only want the single best contact.
 */
export async function enrichProspectContact(
  prospect: Prospect
): Promise<Contact | null> {
  const result = await enrichProspect(prospect);
  return result.primaryContact;
}

export function clearEnrichmentCache(): void {
  ENRICHMENT_CACHE.clear();
}
