import type {
  Contact,
  SearchResult,
  VerifiedPR,
} from "@/lib/types/prospect";

const TAVILY_URL =
  "https://api.tavily.com/search";

const CONTACT_ROLES = [
  "CEO",
  "Founder",
  "Chief Executive Officer",
  "Chief Marketing Officer",
  "Head of Marketing",
  "Marketing Director",
  "Head of Partnerships",
  "Partnerships Director",
  "Business Development Director",
  "Head of Business Development",
  "Corporate Communications",
  "Director of Communications",
  "Innovation Director",
];

async function searchWeb(
  query: string
): Promise<SearchResult[]> {
  const apiKey =
    process.env.TAVILY_API_KEY;

  if (!apiKey) {
    return [];
  }

  const response =
    await fetch(
      TAVILY_URL,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: "advanced",
          max_results: 8,
          include_raw_content: true,
        }),
        cache: "no-store",
      }
    );

  if (!response.ok) {
    return [];
  }

  const data =
    await response.json();

  return (
    data.results ?? []
  ).map(
    (item: any) => ({
      title:
        item.title ?? "",
      url:
        item.url ?? "",
      content:
        item.content ?? "",
      rawContent:
        item.raw_content ?? "",
      publishedDate:
        item.published_date,
    })
  );
}

function extractEmail(
  text: string
): string | undefined {
  const matches =
    text.match(
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
    );

  if (!matches?.length) {
    return undefined;
  }

  const invalid = [
    "example.com",
    "example.org",
    "sentry.io",
    "wixpress.com",
  ];

  return matches.find(
    (email) =>
      !invalid.some(
        (domain) =>
          email
            .toLowerCase()
            .endsWith(
              `@${domain}`
            )
      )
  );
}

function extractLinkedIn(
  text: string
) {
  const match =
    text.match(
      /https?:\/\/(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+/i
    );

  return match?.[0];
}

function guessPerson(
  text: string
) {
  const rolePattern =
    CONTACT_ROLES
      .map(
        (role) =>
          role.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
          )
      )
      .join("|");

  const pattern =
    new RegExp(
      `([A-Z][a-z]+(?:\\s+[A-Z][a-z]+){1,3})\\s+(?:,|-)?\\s*(${rolePattern})`,
      "i"
    );

  const match =
    text.match(pattern);

  if (!match) {
    return null;
  }

  return {
    name: match[1].trim(),
    title: match[2].trim(),
  };
}

function getConfidence(
  contact: Contact
) {
  if (
    contact.email &&
    contact.sourceUrl
  ) {
    return "high";
  }

  if (
    contact.name &&
    contact.sourceUrl
  ) {
    return "medium";
  }

  return "low";
}

export async function findDecisionMaker(
  pr: VerifiedPR
): Promise<Contact | undefined> {
  const queries = [
    `"${pr.organization}" CEO`,
    `"${pr.organization}" founder`,
    `"${pr.organization}" "Head of Marketing"`,
    `"${pr.organization}" "Head of Partnerships"`,
    `"${pr.organization}" "Business Development"`,
    `"${pr.organization}" "Corporate Communications"`,
  ];

  const allResults: SearchResult[] =
    [];

  for (const query of queries) {
    const results =
      await searchWeb(query);

    allResults.push(
      ...results
    );
  }

  for (const result of allResults) {
    const text =
      `${result.title} ${
        result.content ?? ""
      } ${
        result.rawContent ?? ""
      }`;

    const person =
      guessPerson(text);

    if (!person) {
      continue;
    }

    const email =
      extractEmail(text);

    const linkedinUrl =
      extractLinkedIn(text);

    const contact: Contact = {
      name: person.name,
      title: person.title,
      email,
      emailSource:
        email
          ? result.url
          : undefined,
      linkedinUrl,
      sourceUrl:
        result.url,
      confidence:
        "low",
    };

    contact.confidence =
      getConfidence(
        contact
      );

    return contact;
  }

  return undefined;
}