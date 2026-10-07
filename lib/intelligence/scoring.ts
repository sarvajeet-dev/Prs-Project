import type {
  VerifiedPR,
} from "@/lib/types/prospect";

export function scoreProspect(
  pr: VerifiedPR,
  signals: string[]
) {
  let score = 0;

  const reasons: string[] = [];

  if (pr.isPressRelease) {
    score += 25;
    reasons.push(
      "Verified announcement or press release"
    );
  }

  if (pr.isOfficialSource) {
    score += 20;
    reasons.push(
      "Source appears official or is a recognized PR distribution platform"
    );
  }

  if (signals.length > 0) {
    score += 20;
    reasons.push(
      `Recent business signal: ${signals.join(", ")}`
    );
  }

  if (
    signals.includes("Funding") ||
    signals.includes("Partnership") ||
    signals.includes("Launch") ||
    signals.includes("Expansion")
  ) {
    score += 15;

    reasons.push(
      "Announcement indicates active organizational growth or change"
    );
  }

  if (
    pr.category === "Healthcare" ||
    pr.category === "Education"
  ) {
    score += 10;
  }

  const age =
    Date.now() -
    new Date(
      pr.publishedAt
    ).getTime();

  const days =
    age /
    (1000 * 60 * 60 * 24);

  if (days <= 3) {
    score += 10;

    reasons.push(
      "Announcement is less than 3 days old"
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