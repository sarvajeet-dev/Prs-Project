import { Contact } from "@/lib/types";

const LINKEDIN_CACHE: Record<
  string,
  {
    contact: Contact | null;
    timestamp: number;
  }
> = {};

const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

export async function searchLinkedInExecutive(
  organizationName: string
): Promise<Contact | null> {
  const cacheKey = `linkedin:${organizationName.toLowerCase()}`;

  const cached = LINKEDIN_CACHE[cacheKey];

  if (
    cached &&
    Date.now() - cached.timestamp <
      CACHE_TTL_MS
  ) {
    return cached.contact;
  }

  try {
    const encoded =
      encodeURIComponent(organizationName);

    const searchUrl =
      `https://www.linkedin.com/search/results/companies/?keywords=${encoded}`;

    const response = await fetch(
      searchUrl,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return null;
    }

    const html =
      await response.text();

    const result =
      parseLinkedInSearchResults(
        html,
        organizationName
      );

    LINKEDIN_CACHE[cacheKey] = {
      contact: result,
      timestamp: Date.now(),
    };

    return result;
  } catch (error) {
    console.error(
      "[LinkedInSearch] Error:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return null;
  }
}

function parseLinkedInSearchResults(
  html: string,
  organizationName: string
): Contact | null {
  try {
    const nameMatch = html.match(
      /([A-Z][a-z]+\s+[A-Z][a-z]+)/
    );

    const titleMatch = html.match(
      /(CEO|Founder|President|VP|Director|Manager)/i
    );

    if (!nameMatch) {
      return null;
    }

    const nameParts = nameMatch[1].split(
      /\s+/
    );

    return {
      name: nameMatch[1],
      firstName: nameParts[0] || null,
      lastName: nameParts[1] || null,
      title: titleMatch
        ? titleMatch[1]
        : null,
      email: null,
      emailType: null,
      confidence: 35,
      verificationStatus: "needs_verification",
    };
  } catch {
    return null;
  }
}

export function clearLinkedInCache(): void {
  Object.keys(LINKEDIN_CACHE).forEach(
    (key) => {
      delete LINKEDIN_CACHE[key];
    }
  );
}
