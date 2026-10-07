import type {
  Category,
  Country,
} from "@/lib/types/prospect";

const COUNTRY_KEYWORDS: Record<
  Country,
  string[]
> = {
  Singapore: [
    "singapore",
    "singaporean",
  ],

  Malaysia: [
    "malaysia",
    "malaysian",
    "kuala lumpur",
    "penang",
    "johor",
    "selangor",
    "putrajaya",
  ],

  "Hong Kong": [
    "hong kong",
    "hong-kong",
    "hongkong",
    "hong kong sar",
  ],
};

const HEALTH_KEYWORDS = [
  "healthcare",
  "health care",
  "hospital",
  "medical",
  "medtech",
  "biotech",
  "biotechnology",
  "pharma",
  "pharmaceutical",
  "clinical",
  "patient",
  "diagnostic",
  "diagnostics",
  "digital health",
  "health technology",
  "health innovation",
];

const EDUCATION_KEYWORDS = [
  "education",
  "university",
  "school",
  "college",
  "edtech",
  "education technology",
  "learning",
  "learning platform",
  "training",
  "academic",
  "student",
  "higher education",
];

export function detectCountry(
  text: string
): Country | null {
  const normalized =
    text.toLowerCase();

  for (const [
    country,
    keywords,
  ] of Object.entries(
    COUNTRY_KEYWORDS
  )) {
    if (
      keywords.some((keyword) =>
        normalized.includes(keyword)
      )
    ) {
      return country as Country;
    }
  }

  return null;
}

export function detectCategory(
  text: string
): Category | null {
  const normalized =
    text.toLowerCase();

  const healthScore =
    HEALTH_KEYWORDS.filter(
      (keyword) =>
        normalized.includes(keyword)
    ).length;

  const educationScore =
    EDUCATION_KEYWORDS.filter(
      (keyword) =>
        normalized.includes(keyword)
    ).length;

  if (
    healthScore === 0 &&
    educationScore === 0
  ) {
    return null;
  }

  return healthScore >= educationScore
    ? "Healthcare"
    : "Education";
}

export function isRelevantIndustry(
  text: string
): boolean {
  return (
    detectCategory(text) !== null
  );
}