export function extractOrganization(
  title: string,
  description: string,
  publisher: string
): string {
  /*
   * First try to extract the organization
   * from common PR headline patterns.
   *
   * Example:
   *
   * "Acme Health Launches AI Platform"
   *
   * -> Acme Health
   */

  const cleanTitle =
    title
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  /*
   * Common patterns:
   *
   * "Company announces..."
   * "Company launches..."
   * "Company partners..."
   */

  const patterns = [
    /^(.+?)\s+(announces|announce|launches|launch|unveils|unveil|introduces|introduce|appoints|appoint|partners|partner|expands|expand|raises|raised)\b/i,

    /^(.+?)\s*[-:]\s*(announces|launches|unveils|introduces)/i,
  ];

  for (const pattern of patterns) {
    const match =
      cleanTitle.match(
        pattern
      );

    if (
      match?.[1]
    ) {
      const organization =
        match[1].trim();

      if (
        organization.length >
          2 &&
        organization.length <
          120
      ) {
        return organization;
      }
    }
  }

  /*
   * Try quoted organization
   */

  const quoted =
    cleanTitle.match(
      /"([^"]+)"/
    );

  if (
    quoted?.[1]
  ) {
    return quoted[1].trim();
  }

  /*
   * Fallback.
   *
   * IMPORTANT:
   * Publisher is NOT necessarily the company.
   *
   * We therefore return "Unknown Organization"
   * instead of incorrectly claiming the publisher
   * is the company.
   */

  return "Unknown Organization";
}