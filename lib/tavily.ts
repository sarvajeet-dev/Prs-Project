import { TavilyResult } from "./types";

const TAVILY_URL =
  "https://api.tavily.com/search";

interface TavilyResponse {
  results?: TavilyResult[];
}

export async function searchTavily(
  query: string
): Promise<TavilyResult[]> {
  const apiKey =
    process.env.TAVILY_API_KEY;

  if (!apiKey) {
    throw new Error(
      "TAVILY_API_KEY is missing"
    );
  }

  const response = await fetch(
    TAVILY_URL,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        api_key: apiKey,

        query,

        search_depth: "advanced",

        topic: "general",

        max_results: 10,

        include_answer: false,

        include_raw_content: true,

        include_images: false,
      }),

      cache: "no-store",
    }
  );

  if (!response.ok) {
    const errorText =
      await response.text();

    throw new Error(
      `Tavily error ${response.status}: ${errorText}`
    );
  }

  const data =
    (await response.json()) as TavilyResponse;

  return data.results || [];
}