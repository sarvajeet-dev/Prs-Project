import { Contact } from "@/lib/types";

const COMMON_PATTERNS = [
  "{first}.{last}@{domain}",
  "{first}{last}@{domain}",
  "{first}@{domain}",
  "f{last}@{domain}",
  "{first}.{last}@{domain}.com",
  "contact@{domain}",
  "info@{domain}",
  "hello@{domain}",
];

const EXECUTIVE_TITLES = [
  "CEO",
  "Chief Executive Officer",
  "President",
  "Founder",
  "Co-Founder",
  "CMO",
  "Chief Marketing Officer",
  "VP",
  "Vice President",
];

export function findEmailPatterns(
  organizationName: string,
  domain: string,
  titles: string[] = EXECUTIVE_TITLES
): Contact[] {
  const results: Contact[] = [];

  const nameParts =
    organizationName
      .toLowerCase()
      .split(/\s+/)
      .filter((p) => p.length > 0);

  const firstWord = nameParts[0] || "contact";
  const lastWord =
    nameParts[nameParts.length - 1] ||
    "info";

  const cleanDomain = domain
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/$/, "")
    .toLowerCase();

  const patterns = [
    `${firstWord}.${lastWord}@${cleanDomain}`,
    `${firstWord}@${cleanDomain}`,
    `contact@${cleanDomain}`,
    `info@${cleanDomain}`,
  ];

  const commonTitles = [
    "CEO",
    "Founder",
    "VP Operations",
  ];

  for (const pattern of patterns) {
    for (const title of commonTitles) {
      results.push({
        name: null,
        firstName: firstWord,
        lastName: lastWord,
        title,
        email: pattern,
        emailType: "domain_pattern",
        confidence: 25,
        verificationStatus: "unverified",
      });
    }
  }

  return results;
}

export function generateEmailVariations(
  firstName: string,
  lastName: string,
  domain: string
): string[] {
  const emails: string[] = [];

  const f = firstName.charAt(0).toLowerCase();
  const l = lastName.toLowerCase();
  const fn = firstName.toLowerCase();
  const ln = lastName.toLowerCase();

  emails.push(
    `${fn}.${ln}@${domain}`,
    `${fn}${ln}@${domain}`,
    `${f}${ln}@${domain}`,
    `${fn}@${domain}`,
    `${ln}@${domain}`
  );

  return [...new Set(emails)];
}
