const GENERIC_WORDS = [
  "press release",
  "announcement",
  "news",
  "breaking news",
  "latest news",
  "official announcement",
];

export function cleanOrganizationName(
  value: string
): string {
  let result = value
    .replace(
      /\s*[-|–—]\s*(press release|announcement|news).*$/i,
      ""
    )
    .trim();

  for (const word of GENERIC_WORDS) {
    if (
      result.toLowerCase() ===
      word.toLowerCase()
    ) {
      return "";
    }
  }

  return result;
}

export function extractOrganization(
  title: string,
  description: string
): string {
  const combined =
    `${title} ${description}`;

  const patterns = [
    /^(.+?)\s+(?:announces|announce|launches|launch|unveils|introduces|partners|enters into|appoints)\b/i,

    /^(.+?)\s+(?:and|&)\s+(.+?)\s+(?:announce|launch|establish|sign|enter|partner)/i,

    /^(.+?):\s+/i,
  ];

  for (const pattern of patterns) {
    const match =
      combined.match(pattern);

    if (match?.[1]) {
      const organization =
        cleanOrganizationName(
          match[1]
        );

      if (organization.length >= 2) {
        return organization;
      }
    }
  }

  return "Organization requires verification";
}