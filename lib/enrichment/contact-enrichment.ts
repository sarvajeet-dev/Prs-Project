import { Contact } from "@/lib/types";
import { findEmailPatterns } from "./email-patterns";
import { searchLinkedInExecutive } from "./linkedin-search";
import { scrapeCompanyContacts } from "./website-scraper";

export interface EnrichmentResult {
  contacts: Contact[];
  primaryContact: Contact | null;
  confidence: number;
  enrichmentSources: string[];
}

async function enrichOrganization(
  organizationName: string,
  domain?: string
): Promise<EnrichmentResult> {
  const results: Contact[] = [];
  const sources: string[] = [];

  try {
    if (domain) {
      const patterns =
        findEmailPatterns(
          organizationName,
          domain
        );

      if (patterns.length > 0) {
        results.push(...patterns);
        sources.push("email-patterns");
      }

      const websiteContacts =
        await scrapeCompanyContacts(
          domain
        );

      if (websiteContacts.length > 0) {
        results.push(...websiteContacts);
        sources.push("website-scraper");
      }
    }

    const linkedInContact =
      await searchLinkedInExecutive(
        organizationName
      );

    if (linkedInContact) {
      results.push(linkedInContact);
      sources.push("linkedin");
    }
  } catch (error) {
    console.error(
      "[ContactEnrichment] Error:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );
  }

  const deduped = deduplicateContacts(
    results
  );

  const primaryContact =
    deduped.length > 0
      ? deduped[0]
      : null;

  const avgConfidence =
    deduped.length > 0
      ? Math.round(
          deduped.reduce(
            (sum, c) =>
              sum +
              (c.confidence || 0),
            0
          ) / deduped.length
        )
      : 0;

  return {
    contacts: deduped,
    primaryContact,
    confidence: avgConfidence,
    enrichmentSources: sources,
  };
}

function deduplicateContacts(
  contacts: Contact[]
): Contact[] {
  const seen = new Set<string>();
  const deduped: Contact[] = [];

  const sortedByConfidence = contacts.sort(
    (a, b) =>
      (b.confidence || 0) -
      (a.confidence || 0)
  );

  for (const contact of sortedByConfidence) {
    const key =
      (contact.email || "") +
      (contact.name || "");

    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(contact);
    }
  }

  return deduped;
}

export const contactEnrichment = {
  enrichOrganization,
  deduplicateContacts,
};
