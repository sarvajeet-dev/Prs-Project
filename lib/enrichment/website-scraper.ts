import { Contact } from "@/lib/types";

const WEBSITE_CACHE: Record<
  string,
  {
    contacts: Contact[];
    timestamp: number;
  }
> = {};

const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

const EMAIL_REGEX =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/*
 * Emails we never treat as contacts: tracking pixels, assets,
 * platform noreplies, legal/privacy mailboxes, etc.
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
  "legal@",
  "dpo@",
  "abuse@",
  "advertise@",
  "copyright@",
];

/*
 * If an email's local-part matches one of these, it's a role
 * mailbox (not a person). We still capture it, but without
 * trying to infer a human name/title.
 */
const ROLE_LOCAL_PARTS = new Set([
  "info",
  "contact",
  "support",
  "admin",
  "hello",
  "hi",
  "team",
  "media",
  "press",
  "pr",
  "sales",
  "help",
  "office",
  "enquiries",
  "inquiries",
  "general",
  "marketing",
  "hr",
  "careers",
  "jobs",
]);

const TITLE_WORDS = [
  "co-founder",
  "cofounder",
  "founder",
  "ceo",
  "chief executive",
  "cto",
  "cfo",
  "coo",
  "cmo",
  "president",
  "vice president",
  "vp",
  "director",
  "head of",
  "manager",
  "lead",
  "owner",
  "partner",
  "principal",
  "chair",
];

async function fetchWebsitePage(
  domain: string,
  path: string
): Promise<string> {
  const url = `https://${domain}${path}`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
          "AppleWebKit/537.36 (KHTML, like Gecko) " +
          "Chrome/122.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
      redirect: "follow",
    } as RequestInit & {
      signal: AbortSignal;
    });

    if (!response.ok) {
      return "";
    }

    return await response.text();
  } catch {
    return "";
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function capitalize(word: string): string {
  if (!word) return word;
  return (
    word.charAt(0).toUpperCase() +
    word.slice(1).toLowerCase()
  );
}

/*
 * From an email like "mark@foo.com" or "mark.jones@foo.com",
 * derive a human-looking first/last name. Returns null for role
 * mailboxes.
 */
function inferNameFromEmail(email: string): {
  firstName: string | null;
  lastName: string | null;
  name: string | null;
} {
  const local = email.split("@")[0].toLowerCase();

  if (ROLE_LOCAL_PARTS.has(local)) {
    return {
      firstName: null,
      lastName: null,
      name: null,
    };
  }

  const parts = local
    .split(/[._+-]/)
    .filter((p) => p && /^[a-z]+$/.test(p));

  if (parts.length === 0) {
    return {
      firstName: null,
      lastName: null,
      name: null,
    };
  }

  const firstName = capitalize(parts[0]);
  const lastName =
    parts.length > 1
      ? capitalize(parts[parts.length - 1])
      : null;

  return {
    firstName,
    lastName,
    name: lastName
      ? `${firstName} ${lastName}`
      : firstName,
  };
}

/*
 * Scan the plain-text content around the email for name/title
 * phrases. Patterns we catch:
 *   - "My name is Mark, co-founder of Student First Technologies"
 *   - "I'm Mark Johnson, CEO"
 *   - "Mark Johnson — Founder" / "Mark Johnson, Founder"
 */
function enrichContactFromContext(
  contact: Contact,
  pageText: string
): Contact {
  if (!contact.email) return contact;

  const emailIndex = pageText
    .toLowerCase()
    .indexOf(contact.email.toLowerCase());

  if (emailIndex < 0) return contact;

  const windowStart = Math.max(0, emailIndex - 400);
  const windowEnd = Math.min(
    pageText.length,
    emailIndex + 200
  );
  const window = pageText.slice(windowStart, windowEnd);

  let name = contact.name;
  let title = contact.title;

  const nameMatch =
    window.match(
      /\b(?:my name is|i['’]m|i am|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i
    );

  if (nameMatch) {
    name = nameMatch[1];
  }

  if (!title) {
    for (const word of TITLE_WORDS) {
      const pattern = new RegExp(
        `\\b([a-z-]*\\s*${word}[a-z\\s-]*?)(?:[.,\\n]|\\s+of\\s+|$)`,
        "i"
      );

      const match = window.match(pattern);

      if (match) {
        title = match[1].trim().replace(/\s+/g, " ");
        break;
      }
    }
  }

  if (name && !contact.firstName) {
    const nameParts = name.split(/\s+/);
    contact.firstName = nameParts[0] || null;
    contact.lastName =
      nameParts[1] || contact.lastName;
  }

  return {
    ...contact,
    name: name || contact.name,
    title: title || contact.title,
  };
}

function extractContactsFromPage(
  html: string,
  domain: string,
  sourceUrl: string
): Contact[] {
  const matches = html.match(EMAIL_REGEX);

  if (!matches) {
    return [];
  }

  const pageText = stripHtml(html);
  const contacts: Contact[] = [];
  const seen = new Set<string>();

  for (const rawEmail of matches) {
    const email = rawEmail.toLowerCase();

    if (seen.has(email)) continue;
    seen.add(email);

    if (
      EMAIL_BLOCKLIST.some((b) => email.includes(b))
    ) {
      continue;
    }

    /*
     * Only keep emails on the company's own domain —
     * sidesteps emails from third-party widgets (intercom,
     * analytics, etc.) that happen to appear in the HTML.
     */
    const emailDomain = email.split("@")[1] || "";

    if (
      !emailDomain.endsWith(domain) &&
      !domain.endsWith(emailDomain)
    ) {
      continue;
    }

    const nameInfo = inferNameFromEmail(email);
    const isRole =
      nameInfo.firstName === null;

    const base: Contact = {
      name: nameInfo.name,
      firstName: nameInfo.firstName,
      lastName: nameInfo.lastName,
      title: null,
      email,
      emailType: isRole ? "role-mailbox" : "website",
      confidence: isRole ? 70 : 75,
      verificationStatus: "unverified",
      source: isRole
        ? "Company website (role)"
        : "Company website",
      sourceUrl,
    };

    const enriched = isRole
      ? base
      : enrichContactFromContext(base, pageText);

    contacts.push(enriched);
  }

  return contacts;
}

export async function scrapeCompanyContacts(
  domain: string
): Promise<Contact[]> {
  if (!domain) return [];

  const cacheKey = `website:${domain}`;
  const cached = WEBSITE_CACHE[cacheKey];

  if (
    cached &&
    Date.now() - cached.timestamp < CACHE_TTL_MS
  ) {
    return cached.contacts;
  }

  const pagePaths = [
    "/",
    "/contact",
    "/contact-us",
    "/about",
    "/about-us",
    "/team",
    "/people",
    "/leadership",
    "/our-team",
  ];

  const pageResults = await Promise.allSettled(
    pagePaths.map(async (path) => {
      const html = await fetchWebsitePage(domain, path);
      if (!html) return [] as Contact[];

      return extractContactsFromPage(
        html,
        domain,
        `https://${domain}${path}`
      );
    })
  );

  const allContacts: Contact[] = [];

  for (const outcome of pageResults) {
    if (outcome.status === "fulfilled") {
      allContacts.push(...outcome.value);
    }
  }

  /*
   * Dedupe by email, preferring the entry with the richest info
   * (name + title present wins over bare email).
   */
  const byEmail = new Map<string, Contact>();

  for (const contact of allContacts) {
    if (!contact.email) continue;

    const key = contact.email.toLowerCase();
    const existing = byEmail.get(key);

    if (!existing) {
      byEmail.set(key, contact);
      continue;
    }

    const existingScore =
      (existing.name ? 2 : 0) +
      (existing.title ? 1 : 0);
    const newScore =
      (contact.name ? 2 : 0) +
      (contact.title ? 1 : 0);

    if (newScore > existingScore) {
      byEmail.set(key, contact);
    }
  }

  const deduped = Array.from(byEmail.values());

  WEBSITE_CACHE[cacheKey] = {
    contacts: deduped,
    timestamp: Date.now(),
  };

  return deduped;
}

export function clearWebsiteCache(): void {
  Object.keys(WEBSITE_CACHE).forEach((key) => {
    delete WEBSITE_CACHE[key];
  });
}
