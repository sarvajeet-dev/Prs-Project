export type EmailResult = {
  email?: string;

  source?: string;

  confidence:
    | "high"
    | "medium"
    | "low";
};

export async function findBusinessEmail(
  organization: string,
  personName: string,
  companyDomain: string
): Promise<EmailResult> {
  /*
   * Phase 1:
   * Search official website/public sources.
   *
   * Phase 2:
   * Integrate a dedicated email-enrichment provider.
   *
   * Never guess an email.
   */

  return {
    email: undefined,
    confidence: "low",
  };
}