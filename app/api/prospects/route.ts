// import { NextApiResponse } from "next";
import { NextResponse } from "next/server";

const TAVILY_API_URL = "https://api.tavily.com/search";

const COUNTRIES = [
  "Singapore",
  "Malaysia",
  "Hong Kong",
];

const HEALTHCARE_QUERIES = [
  "healthcare press release",
  "hospital press release",
  "medtech press release",
  "biotech press release",
  "digital health press release",
  "pharma press release",
  "healthcare company announcement",
];

const EDUCATION_QUERIES = [
  "university press release",
  "school press release",
  "edtech press release",
  "education company announcement",
  "education technology announcement",
  "learning platform announcement",
  "higher education announcement",
];

const HEALTHCARE_KEYWORDS = [
  "healthcare",
  "health care",
  "hospital",
  "medical",
  "medtech",
  "biotech",
  "pharma",
  "pharmaceutical",
  "digital health",
  "telemedicine",
  "clinical",
  "health technology",
  "life sciences",
  "patient care",
];

const EDUCATION_KEYWORDS = [
  "education",
  "school",
  "university",
  "college",
  "edtech",
  "learning",
  "training",
  "student",
  "teacher",
  "higher education",
  "academic",
  "e-learning",
  "online learning",
];

const PR_KEYWORDS = [
  "press release",
  "press-release",
  "news release",
  "media release",
  "announcement",
  "announces",
  "announced",
  "official statement",
  "official announcement",
];

const SIGNAL_RULES: Record<
  string,
  string[]
> = {
  Funding: [
    "funding",
    "funded",
    "investment",
    "invested",
    "raised",
    "raises",
    "series a",
    "series b",
    "series c",
    "venture capital",
  ],

  Launch: [
    "launch",
    "launched",
    "launches",
    "unveil",
    "unveiled",
    "introduces",
    "introduced",
    "new product",
    "new platform",
    "new service",
  ],

  Expansion: [
    "expansion",
    "expand",
    "expands",
    "expanded",
    "new office",
    "new facility",
    "enters the market",
    "market expansion",
  ],

  Partnership: [
    "partnership",
    "partnered",
    "partners",
    "collaboration",
    "collaborates",
    "strategic partnership",
    "agreement",
    "alliance",
  ],

  "Leadership Change": [
    "appointed",
    "appoints",
    "new ceo",
    "new chief",
    "joins as",
    "leadership",
    "executive",
  ],

  Research: [
    "research",
    "study",
    "clinical trial",
    "research findings",
    "researchers",
    "published study",
  ],

  "New Initiative": [
    "initiative",
    "program",
    "programme",
    "new initiative",
    "campaign",
    "project",
  ],

  Award: [
    "award",
    "awarded",
    "recognition",
    "recognized",
    "winner",
    "honored",
  ],
};

const NEWS_DOMAINS = [
  "reuters.com",
  "bloomberg.com",
  "forbes.com",
  "cnbc.com",
  "bbc.com",
  "theguardian.com",
  "scmp.com",
  "straitstimes.com",
  "channelnewsasia.com",
  "thestar.com.my",
];

const PR_DOMAINS = [
  "prnewswire.com",
  "globenewswire.com",
  "businesswire.com",
  "media-outreach.com",
  "eqs-news.com",
];

type TavilyResult = {
  title?: string;
  url?: string;
  content?: string;
  raw_content?: string;
  published_date?: string;
};

type TavilyResponse = {
  results?: TavilyResult[];
};

type Candidate = {
  title: string;
  url: string;
  content: string;
  rawContent: string;
  publishedDate?: string;
};

type Prospect = {
  id: string;

  organization: {
    name: string;
    country: string;
    category: string;
  };

  announcement: {
    title: string;
    description: string;
    url: string;
    publishedAt: string;
    source: string;
    signals: string[];
    isPressRelease: boolean;
  };

  fit: {
    score: number;
    reasons: string[];
  };
};

async function searchTavily(
  query: string
): Promise<Candidate[]> {
  const apiKey =
    process.env.TAVILY_API_KEY;

  if (!apiKey) {
    throw new Error(
      "TAVILY_API_KEY is missing"
    );
  }

  const response = await fetch(
    TAVILY_API_URL,
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
    throw new Error(
      `Tavily error: ${response.status}`
    );
  }

  const data =
    (await response.json()) as TavilyResponse;

  return (data.results || [])
    .filter(
      (item) =>
        item.url &&
        item.title
    )
    .map((item) => ({
      title: item.title!,
      url: item.url!,
      content:
        item.content || "",
      rawContent:
        item.raw_content || "",
      publishedDate:
        item.published_date,
    }));
}

function getDomain(
  url: string
): string {
  try {
    return new URL(url)
      .hostname
      .replace(/^www\./, "")
      .toLowerCase();
  } catch {
    return "";
  }
}

function isNewsWebsite(
  url: string
): boolean {
  const domain =
    getDomain(url);

  return NEWS_DOMAINS.some(
    (item) =>
      domain === item ||
      domain.endsWith(`.${item}`)
  );
}

function isPRWebsite(
  url: string
): boolean {
  const domain =
    getDomain(url);

  return PR_DOMAINS.some(
    (item) =>
      domain === item ||
      domain.endsWith(`.${item}`)
  );
}

function detectCountry(
  text: string
): string | null {
  const value =
    text.toLowerCase();

  if (
    value.includes("singapore")
  ) {
    return "Singapore";
  }

  if (
    value.includes("malaysia") ||
    value.includes("kuala lumpur") ||
    value.includes("selangor") ||
    value.includes("penang") ||
    value.includes("johor")
  ) {
    return "Malaysia";
  }

  if (
    value.includes("hong kong") ||
    value.includes("hongkong")
  ) {
    return "Hong Kong";
  }

  return null;
}

function detectCategory(
  text: string
): string | null {
  const value =
    text.toLowerCase();

  const healthcareScore =
    HEALTHCARE_KEYWORDS.filter(
      (keyword) =>
        value.includes(keyword)
    ).length;

  const educationScore =
    EDUCATION_KEYWORDS.filter(
      (keyword) =>
        value.includes(keyword)
    ).length;

  if (
    healthcareScore === 0 &&
    educationScore === 0
  ) {
    return null;
  }

  return healthcareScore >=
    educationScore
    ? "Healthcare"
    : "Education";
}

function detectSignals(
  text: string
): string[] {
  const value =
    text.toLowerCase();

  const signals: string[] = [];

  for (const [
    signal,
    keywords,
  ] of Object.entries(
    SIGNAL_RULES
  )) {
    if (
      keywords.some((keyword) =>
        value.includes(keyword)
      )
    ) {
      signals.push(signal);
    }
  }

  return signals;
}

function extractOrganization(
  title: string,
  description: string
): string {
  const text =
    `${title} ${description}`;

  const patterns = [
    /^(.+?)\s+(?:announces|announced|launches|launched|unveils|unveiled|introduces|introduced)\b/i,

    /^(.+?)\s+(?:partners|partnered|collaborates|collaborated)\b/i,

    /^(.+?)\s+(?:raises|raised|secures|secured)\b/i,

    /^(.+?)\s+(?:expands|expanded|opens|opened)\b/i,

    /^(.+?)\s+(?:appoints|appointed|names|named)\b/i,
  ];

  for (const pattern of patterns) {
    const match =
      text.match(pattern);

    if (match?.[1]) {
      const name =
        match[1]
          .replace(
            /^press release:\s*/i,
            ""
          )
          .trim();

      if (
        name.length >= 2 &&
        name.length <= 120
      ) {
        return name;
      }
    }
  }

  /*
   * Fallback:
   * Use the first meaningful portion
   * of the title instead of throwing
   * the candidate away.
   */

  const firstPart =
    title
      .split(/[|:–—-]/)
      .map((item) => item.trim())
      .filter(Boolean)[0];

  return (
    firstPart ||
    "Organization requires verification"
  );
}

function getDate(
  candidate: Candidate
): string {
  if (candidate.publishedDate) {
    const date = new Date(
      candidate.publishedDate
    );

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {
      return date.toISOString();
    }
  }

  /*
   * If Tavily doesn't provide a date,
   * keep the current date as an
   * unverified search date.
   *
   * We don't claim this is the
   * actual publication date.
   */
  return new Date().toISOString();
}

function calculateScore(
  candidate: Candidate,
  category: string,
  signals: string[],
  dateAvailable: boolean
) {
  let score = 0;

  const reasons: string[] = [];

  if (
    isPRWebsite(
      candidate.url
    )
  ) {
    score += 35;

    reasons.push(
      "PR distribution source"
    );
  } else {
    score += 15;

    reasons.push(
      "Announcement-style source"
    );
  }

  score += 15;

  reasons.push(
    `Relevant ${category.toLowerCase()} organization`
  );

  if (signals.length > 0) {
    score += Math.min(
      signals.length * 6,
      24
    );

    reasons.push(
      `Business signals: ${signals.join(
        ", "
      )}`
    );
  }

  if (
    signals.includes("Funding") ||
    signals.includes("Launch") ||
    signals.includes("Expansion") ||
    signals.includes("Partnership")
  ) {
    score += 15;

    reasons.push(
      "High-value business activity detected"
    );
  }

  if (dateAvailable) {
    score += 10;

    reasons.push(
      "Publication date available"
    );
  }

  return {
    score: Math.min(
      score,
      100
    ),
    reasons,
  };
}

function hasPRLanguage(
  text: string
): boolean {
  const value =
    text.toLowerCase();

  return PR_KEYWORDS.some(
    (keyword) =>
      value.includes(keyword)
  );
}

function createOutreach(
  prospect: Prospect
) {
  const conference =
    prospect.organization.category ===
    "Healthcare"
      ? "Health 2.0"
      : "Education 2.0";

  const signal =
    prospect.announcement
      .signals[0] ||
    "recent announcement";

  const subject =
    `${conference} — ${prospect.organization.name}`;

  const angle =
    `${prospect.organization.name}'s recent ${signal.toLowerCase()} makes the organization relevant to the ${conference} ecosystem.`;

  const email = `Hi there,

I came across ${
    prospect.organization.name
  }'s recent announcement regarding "${
    prospect.announcement.title
  }".

${angle}

Given this recent activity, I thought ${conference} could be relevant for your team.

I'd be happy to share the conference details and explore whether there may be a fit.

Best regards,
Conference Team`;

  return {
    subject,
    angle,
    email,
  };
}

export async function GET() {
  try {
    console.log(
      "Starting prospect discovery..."
    );

    /*
     * ----------------------------------------
     * SEARCH
     * ----------------------------------------
     */

    const queries =
      COUNTRIES.flatMap(
        (country) => [
          ...HEALTHCARE_QUERIES.map(
            (query) =>
              `${country} ${query}`
          ),

          ...EDUCATION_QUERIES.map(
            (query) =>
              `${country} ${query}`
          ),
        ]
      );

    const results =
      await Promise.all(
        queries.map((query) =>
          searchTavily(query)
        )
      );

    const candidates =
      results.flat();

    /*
     * ----------------------------------------
     * DEDUPLICATE
     * ----------------------------------------
     */

    const uniqueCandidates =
      Array.from(
        new Map(
          candidates.map(
            (item) => [
              item.url,
              item,
            ]
          )
        ).values()
      );

    console.log(
      `Candidates: ${candidates.length}`
    );

    console.log(
      `Unique: ${uniqueCandidates.length}`
    );

    /*
     * ----------------------------------------
     * PROCESS
     * ----------------------------------------
     */

    const prospects: Prospect[] =
      [];

    for (const candidate of uniqueCandidates) {
      const text =
        [
          candidate.title,
          candidate.content,
          candidate.rawContent,
        ].join(" ");

      /*
       * Country
       */

      const country =
        detectCountry(text);

      if (!country) {
        continue;
      }

      /*
       * Category
       */

      const category =
        detectCategory(text);

      if (!category) {
        continue;
      }

      /*
       * Don't accept obvious
       * mainstream news articles.
       */

      if (
        isNewsWebsite(
          candidate.url
        )
      ) {
        continue;
      }

      /*
       * PR / announcement detection
       */

      const prSource =
        isPRWebsite(
          candidate.url
        );

      const announcementLanguage =
        hasPRLanguage(text);

      if (
        !prSource &&
        !announcementLanguage
      ) {
        continue;
      }

      /*
       * Date
       */

      const dateAvailable =
        Boolean(
          candidate.publishedDate
        );

      const publishedAt =
        getDate(candidate);

      /*
       * Signals
       */

      const signals =
        detectSignals(text);

      /*
       * Organization
       */

      const organization =
        extractOrganization(
          candidate.title,
          candidate.content
        );

      /*
       * Score
       */

      const fit =
        calculateScore(
          candidate,
          category,
          signals,
          dateAvailable
        );

      /*
       * Prospect
       */

      prospects.push({
        id: Buffer.from(
          candidate.url
        ).toString(
          "base64url"
        ),

        organization: {
          name: organization,
          country,
          category,
        },

        announcement: {
          title:
            candidate.title,

          description:
            candidate.content,

          url:
            candidate.url,

          publishedAt,

          source:
            getDomain(
              candidate.url
            ),

          signals,

          isPressRelease:
            prSource ||
            announcementLanguage,
        },

        fit,
      });
    }

    /*
     * ----------------------------------------
     * SORT
     * ----------------------------------------
     */

    prospects.sort(
      (a, b) =>
        b.fit.score -
        a.fit.score
    );

    /*
     * ----------------------------------------
     * TOP 30
     * ----------------------------------------
     */

    const topProspects =
      prospects
        .slice(0, 30)
        .map((prospect) => ({
          ...prospect,

          outreach:
            createOutreach(
              prospect
            ),
        }));

    /*
     * ----------------------------------------
     * RESPONSE
     * ----------------------------------------
     */

    return NextResponse.json({
      success: true,

      count:
        topProspects.length,

      data:
        topProspects,

      meta: {
        candidatesFound:
          candidates.length,

        uniqueCandidates:
          uniqueCandidates.length,

        verifiedPRs:
          prospects.length,

        enriched:
          topProspects.length,
      },
    });
  } catch (error) {
    console.error(
      "Prospect API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unknown error",

        data: [],
      },
      {
        status: 500,
      }
    );
  }
}