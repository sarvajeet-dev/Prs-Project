
import type { Contact } from "./types";

const HUNTER_API = "https://api.hunter.io/v2";

interface HunterEmail {
  value?: string;
  type?: string;
  confidence?: number;
  first_name?: string;
  last_name?: string;
  position?: string;
}

interface HunterDomainResponse {
  data?: {
    organization?: string;
    domain?: string;
    emails?: HunterEmail[];
  };
}

// ---------------------------------------------
// Seniority keywords
// ---------------------------------------------

const SENIORITY_KEYWORDS = [
  "chief executive officer",
  "ceo",
  "founder",
  "co-founder",
  "president",
  "managing director",
  "chief",
  "vice president",
  "vp",
  "head",
  "director",
];

// ---------------------------------------------
// Priority titles
// ---------------------------------------------

const PRIORITY_TITLES = [
  "chief executive officer",
  "ceo",
  "founder",
  "co-founder",
  "president",
  "managing director",
  "chief innovation officer",
  "chief digital officer",
  "chief technology officer",
  "chief medical officer",
  "vp partnerships",
  "vice president partnerships",
  "head of partnerships",
  "head of business development",
  "business development director",
];

// ---------------------------------------------
// Normalize title
// ---------------------------------------------

function normalizeTitle(title?: string) {
  return (title || "").toLowerCase().trim();
}

// ---------------------------------------------
// Check whether person is senior
// ---------------------------------------------

function isSenior(title?: string) {
  const normalized = normalizeTitle(title);

  return SENIORITY_KEYWORDS.some((keyword) =>
    normalized.includes(keyword)
  );
}

// ---------------------------------------------
// Calculate priority
// ---------------------------------------------

function getPriority(title?: string) {
  const normalized = normalizeTitle(title);

  const index = PRIORITY_TITLES.findIndex(
    (keyword) =>
      normalized.includes(keyword)
  );

  return index === -1 ? 999 : index;
}

// ---------------------------------------------
// Convert Hunter contact → our Contact type
// ---------------------------------------------

function mapContact(
  person: HunterEmail
): Contact {
  return {
    name:
      [
        person.first_name,
        person.last_name,
      ]
        .filter(Boolean)
        .join(" ") || null,

    firstName:
      person.first_name || null,

    lastName:
      person.last_name || null,

    title:
      person.position || null,

    email:
      person.value || null,

    emailType:
      person.type || null,

    confidence:
      person.confidence ?? null,

    verificationStatus:
      null,
  };
}

// ---------------------------------------------
// Find ALL senior contacts
// ---------------------------------------------

export async function findSeniorContacts(
  domain: string
): Promise<Contact[]> {
  const apiKey =
    process.env.HUNTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "HUNTER_API_KEY is missing"
    );
  }

  const url = new URL(
    `${HUNTER_API}/domain-search`
  );

  url.searchParams.set(
    "domain",
    domain
  );

  url.searchParams.set(
    "api_key",
    apiKey
  );

  const response = await fetch(
    url.toString(),
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Hunter API failed: ${response.status}`
    );
  }

  const result =
    (await response.json()) as HunterDomainResponse;

  const emails =
    result.data?.emails || [];

  return emails
    // Only contacts with an email
    .filter(
      (person) => person.value
    )

    // Only senior people
    .filter(
      (person) =>
        isSenior(person.position)
    )

    // Convert Hunter format
    .map(mapContact)

    // Best people first
    .sort((a, b) => {
      const priorityA =
        getPriority(
          a.title || ""
        );

      const priorityB =
        getPriority(
          b.title || ""
        );

      // First compare title priority
      if (
        priorityA !== priorityB
      ) {
        return (
          priorityA - priorityB
        );
      }

      // Then compare confidence
      return (
        (b.confidence || 0) -
        (a.confidence || 0)
      );
    });
}

// ---------------------------------------------
// Verify email
// ---------------------------------------------

export async function verifyEmail(
  email: string
) {
  const apiKey =
    process.env.HUNTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      "HUNTER_API_KEY is missing"
    );
  }

  const url = new URL(
    `${HUNTER_API}/email-verifier`
  );

  url.searchParams.set(
    "email",
    email
  );

  url.searchParams.set(
    "api_key",
    apiKey
  );

  const response = await fetch(
    url.toString(),
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Hunter verification failed: ${response.status}`
    );
  }

  const result =
    await response.json();

  return {
    status:
      result.data?.status ||
      "unknown",

    score:
      result.data?.score ??
      null,
  };
}




