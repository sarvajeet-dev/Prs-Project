import type { SearchResult } from "@/lib/types/prospect";

const TAVILY_URL = "https://api.tavily.com/search";

const QUERIES = [
  "Singapore healthcare press release",
  "Singapore education press release",
  "Malaysia healthcare press release",
  "Malaysia education press release",
  "Hong Kong healthcare press release",
  "Hong Kong education press release",
  "Singapore healthcare announces",
  "Singapore education announces",
  "Malaysia healthcare announces",
  "Malaysia education announces",
  "Hong Kong healthcare announces",
  "Hong Kong education announces",
];

async function searchWeb(
  query: string
): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    return [];
  }

  const response = await fetch(TAVILY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "advanced",
      max_results: 8,
      include_raw_content: true,
      days: 14,
      topic: "news",
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();

  return (data.results ?? []).map(
    (item: {
      title?: string;
      url?: string;
      content?: string;
      raw_content?: string;
      published_date?: string;
    }) => ({
      title: item.title ?? "",
      url: item.url ?? "",
      content: item.content ?? "",
      rawContent: item.raw_content ?? "",
      publishedDate: item.published_date,
    })
  );
}

export async function discoverPRCandidates(): Promise<
  SearchResult[]
> {
  const batches = await Promise.all(
    QUERIES.map((query) => searchWeb(query))
  );

  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const batch of batches) {
    for (const result of batch) {
      if (!result.url || seen.has(result.url)) {
        continue;
      }

      seen.add(result.url);
      results.push(result);
    }
  }

  return results;
}
