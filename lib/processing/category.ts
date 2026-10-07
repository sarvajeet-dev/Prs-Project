import type {
  Category,
} from "@/lib/types/prospect";

const HEALTHCARE_KEYWORDS = [
  "healthcare",
  "health care",
  "healthtech",
  "health tech",
  "digital health",
  "hospital",
  "hospitals",
  "clinic",
  "clinical",
  "medical",
  "medical device",
  "medtech",
  "biotech",
  "biotechnology",
  "pharma",
  "pharmaceutical",
  "telemedicine",
  "telehealth",
  "diagnostics",
  "diagnostic",
  "patient",
  "health services",
  "health research",
];

const EDUCATION_KEYWORDS = [
  "education",
  "education technology",
  "edtech",
  "ed tech",
  "e-learning",
  "elearning",
  "online learning",
  "learning platform",
  "school",
  "schools",
  "university",
  "universities",
  "college",
  "colleges",
  "student",
  "students",
  "teacher",
  "teachers",
  "academic",
  "academia",
  "higher education",
  "training",
  "education platform",
  "curriculum",
];

export function detectCategory(
  title: string,
  description: string
): Category | null {
  const text =
    `${title} ${description}`.toLowerCase();

  const healthcareMatch =
    HEALTHCARE_KEYWORDS.some(
      (keyword) =>
        text.includes(
          keyword.toLowerCase()
        )
    );

  const educationMatch =
    EDUCATION_KEYWORDS.some(
      (keyword) =>
        text.includes(
          keyword.toLowerCase()
        )
    );

  /*
   * If both categories match,
   * don't guess.
   */

  if (
    healthcareMatch &&
    educationMatch
  ) {
    /*
     * Look at which category has
     * more keyword matches.
     */

    const healthcareScore =
      HEALTHCARE_KEYWORDS.filter(
        (keyword) =>
          text.includes(
            keyword.toLowerCase()
          )
      ).length;

    const educationScore =
      EDUCATION_KEYWORDS.filter(
        (keyword) =>
          text.includes(
            keyword.toLowerCase()
          )
      ).length;

    return healthcareScore >=
      educationScore
      ? "Healthcare"
      : "Education";
  }

  if (healthcareMatch) {
    return "Healthcare";
  }

  if (educationMatch) {
    return "Education";
  }

  return null;
}