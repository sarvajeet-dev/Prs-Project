import { getDomain } from "./utils";

export async function findCompanyDomain(
  organization: string
): Promise<string | null> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is missing");
  }

  const response = await fetch(
    "https://api.tavily.com/search",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,

        query: `"${organization}" official website`,

        search_depth: "basic",

        max_results: 5,

        include_answer: false,

        include_raw_content: false,

        include_images: false,
      }),

      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error("Tavily company lookup failed");
  }

  const data = await response.json();

  const results = data.results || [];

  const blockedDomains = [
    "prnewswire.com",
    "globenewswire.com",
    "businesswire.com",
    "reuters.com",
    "bloomberg.com",
    "forbes.com",
    "linkedin.com",
    "facebook.com",
    "instagram.com",
    "x.com",
  ];

  for (const result of results) {
    const domain = getDomain(result.url);

    if (!domain) continue;

    const blocked = blockedDomains.some((blocked) =>
      domain.includes(blocked)
    );

    if (blocked) continue;

    return domain;
  }

  return null;
}