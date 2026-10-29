import { Prospect, Contact } from "@/lib/types";
import {
  CONFERENCE_NAMES,
  HEALTH_KEYWORDS,
  EDUCATION_KEYWORDS,
} from "@/lib/config";

export interface EmailDraft {
  subject: string;
  body: string;
  preheader: string;
}

export function generateEmailDraft(
  prospect: Prospect,
  contact: Contact | null
): EmailDraft {
  const isHealth =
    prospect.organization.category ===
    "healthcare" ||
    prospect.organization.category ===
    "both";

  const conference = isHealth
    ? CONFERENCE_NAMES.health
    : CONFERENCE_NAMES.education;

  const conferenceUrl = isHealth
    ? "https://www.health2conf.com"
    : "https://www.education2conf.com";

  const contactName =
    contact?.firstName || "there";

  const orgName =
    prospect.organization.name;

  const announcement =
    prospect.announcement.title;

  const signals = prospect.announcement
    .signals.map((s) => s.toLowerCase())
    .join(", ");

  const relevancePoints =
    generateRelevancePoints(prospect);

  const subject =
    generateSubjectLine(
      orgName,
      prospect.announcement.signals[0] ?? "funding"
    );

  const body = `Hi ${contactName},

I came across ${orgName}'s recent announcement about ${announcement.toLowerCase()}, and I think you'd be a great fit for ${conference}.

We're bringing together the leading innovators in ${isHealth ? "healthcare" : "education"} tech, and based on your work with ${prospect.announcement.signals.includes("expansion") ? "expansion into new markets" : prospect.announcement.signals.includes("funding") ? "raising capital and scaling" : "driving innovation"}, I think ${orgName} would be a valuable addition to the community.

${relevancePoints}

${conference} 2025 brings together:
• Top-tier organizations (${isHealth ? "healthcare systems, medtech, biotech, pharma" : "schools, universities, edtech platforms"})
• 500+ attendees from across the region
• Speaking opportunities & sponsorship options
• Networking with key decision-makers

Would you be open to a quick call to discuss how ${orgName} could participate?

Best regards,
PR Team
${conference}
${conferenceUrl}`;

  const preheader = `Join ${conference} 2025 - Perfect for ${orgName}`;

  return {
    subject,
    body,
    preheader,
  };
}

function generateSubjectLine(
  organizationName: string,
  primarySignal: string
): string {
  const signals: Record<
    string,
    string[]
  > = {
    funding: [
      "Exciting news about your recent funding!",
      "Growth opportunity for innovators",
      "Let's accelerate together",
    ],
    launch: [
      "Love what you're launching",
      "Your new solution caught our eye",
      "Speaking opportunity inside",
    ],
    expansion: [
      "Regional expansion looks promising",
      "Growth partnerships for scaling",
      "Your expansion aligns perfectly",
    ],
    partnership: [
      "Partnership that makes sense",
      "Collaboration opportunity",
      "Let's talk partnerships",
    ],
    leadership: [
      "Congrats on the new leadership!",
      "Great news about your team",
      "Leadership opportunity ahead",
    ],
    research: [
      "Research-backed innovation",
      "Science-driven approach impressed us",
      "Your research aligns with our vision",
    ],
  };

  const key = (primarySignal || "").toLowerCase();

  const templates =
    signals[key] ||
    signals.funding;

  const template =
    templates[
      Math.floor(
        Math.random() * templates.length
      )
    ];

  return `${template} - ${organizationName} @ Education 2.0`;
}

function generateRelevancePoints(
  prospect: Prospect
): string {
  const reasons = prospect.fit.reasons
    .slice(0, 2)
    .map((r) => `• ${r}`)
    .join("\n");

  return `Why we think this is a great fit:\n${reasons}`;
}

export function generateOutreachAngle(
  prospect: Prospect
): string {
  const signals = prospect.announcement
    .signals;

  const baseMessage = `${prospect.organization.name} is an excellent fit for ${prospect.organization.category === "healthcare" || prospect.organization.category === "both" ? "Health 2.0" : "Education 2.0"} because they're actively`;

  if (signals.includes("funding")) {
    return (
      baseMessage +
      ` raising capital and scaling their operations in ${prospect.organization.country}.`
    );
  }

  if (signals.includes("expansion")) {
    return (
      baseMessage +
      ` expanding into new markets and geographies like ${prospect.organization.country}.`
    );
  }

  if (signals.includes("partnership")) {
    return (
      baseMessage +
      ` forming strategic partnerships to grow their reach and impact.`
    );
  }

  if (signals.includes("launch")) {
    return (
      baseMessage +
      ` launching innovative solutions in the ${prospect.organization.category} space.`
    );
  }

  if (signals.includes("leadership")) {
    return (
      baseMessage +
      ` building their team with experienced leaders.`
    );
  }

  return (
    baseMessage +
    ` demonstrating growth and commitment to their industry.`
  );
}
