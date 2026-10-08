export type Conference = "health" | "education";

export type Category =
  | "healthcare"
  | "education"
  | "both"
  | "unknown";

export type Signal =
  | "funding"
  | "launch"
  | "expansion"
  | "partnership"
  | "leadership"
  | "research"
  | "initiative"
  | "award";

export type SourceType =
  | "PR_DISTRIBUTION"
  | "OFFICIAL_COMPANY"
  | "NEWS"
  | "OTHER";

export type Market =
  | "Singapore"
  | "Malaysia"
  | "Hong Kong";

export interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
  raw_content?: string;
  published_date?: string;
  score?: number;
}

export interface Prospect {
  id: string;

  organization: {
    name: string;
    country: Market | null;
    category: Category;
  };

  announcement: {
    title: string;
    description: string;
    url: string;
    publishedAt: string | null;
    source: string;
    sourceType: SourceType;
    signals: Signal[];
  };

  conferences: Conference[];

  fit: {
    score: number;
    reasons: string[];
  };

  discovery: {
    query: string;
    discoveredAt: string;
  };
}

export interface DiscoveryResponse {
  success: boolean;

  prospects: Prospect[];

  meta: {
    rawResults: number;
    uniqueResults: number;
    finalResults: number;
    queriesExecuted: number;
  };
}



export interface Contact {
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  title: string | null;
  email: string | null;
  emailType: string | null;
  confidence: number | null;
  verificationStatus: string | null;
}

export interface ContactEnrichmentResponse {
  contact: Contact | null;
  error?: string;
}


export interface Contact {
  name: string | null;

  firstName: string | null;

  lastName: string | null;

  title: string | null;

  email: string | null;

  emailType: string | null;

  confidence: number | null;

  verificationStatus: string | null;
}