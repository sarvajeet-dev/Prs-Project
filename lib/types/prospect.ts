export type Country =
  | "Singapore"
  | "Malaysia"
  | "Hong Kong";

export type Category =
  | "Healthcare"
  | "Education";

export type Signal =
  | "Funding"
  | "Launch"
  | "Expansion"
  | "Partnership"
  | "Leadership Change"
  | "Research"
  | "New Initiative"
  | "Award";

export type ContactConfidence =
  | "high"
  | "medium"
  | "low";

export type SearchResult = {
  title: string;
  url: string;
  content?: string;
  rawContent?: string;
  publishedDate?: string;
};

export type VerifiedPR = {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: string;
  organization: string;
  country: Country;
  category: Category;
  isPressRelease: boolean;
  isOfficialSource: boolean;
};

export type Contact = {
  name: string;
  title: string;
  email?: string;
  emailSource?: string;
  linkedinUrl?: string;
  sourceUrl?: string;
  confidence: ContactConfidence;
};

export type Prospect = {
  id: string;

  organization: {
    name: string;
    website?: string;
    country: Country;
    category: Category;
  };

  announcement: {
    title: string;
    description: string;
    url: string;
    publishedAt: string;
    source: string;
    isPressRelease: boolean;
    isOfficialSource: boolean;
    signals: Signal[];
  };

  fit: {
    score: number;
    reasons: string[];
  };

  contact?: Contact;

  outreach?: {
    angle: string;
    subject: string;
    email: string;
  };
};  