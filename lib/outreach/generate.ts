import type {
  Prospect,
} from "@/lib/types/prospect";

type Conference =
  | "Health 2.0"
  | "Education 2.0";

function getAngle(
  prospect: Prospect
): string {
  const {
    organization,
    announcement,
  } = prospect;

  const signal =
    announcement.signals[0] ||
    "recent initiative";

  if (
    organization.category ===
    "Healthcare"
  ) {
    return `${organization.name}'s recent ${signal.toLowerCase()} is particularly relevant to the healthcare innovation community. The announcement suggests active work in an area that would make the organization relevant to Health 2.0's ecosystem of healthcare, technology, innovation and industry leaders.`;
  }

  return `${organization.name}'s recent ${signal.toLowerCase()} is a strong reason to connect the organization with the Education 2.0 community, particularly given its focus on education, learning, technology and institutional innovation.`;
}

function getConferenceDetails(
  conference: Conference
) {
  if (
    conference ===
    "Health 2.0"
  ) {
    return {
      name: "Health 2.0 Conference",
      audience:
        "healthcare leaders, innovators, technology companies, providers, researchers and industry decision-makers",
    };
  }

  return {
    name: "Education 2.0 Conference",
    audience:
      "education leaders, educators, technology companies, learning innovators and institutional decision-makers",
  };
}

export function generateOutreach(
  prospect: Prospect,
  conference: Conference
) {
  const details =
    getConferenceDetails(
      conference
    );

  const angle =
    getAngle(prospect);

  const contactName =
    prospect.contact?.name ||
    "there";

  const subject =
    `${conference} — ${
      prospect.organization.name
    }`;

  const email = `Hi ${
    contactName === "there"
      ? "there"
      : contactName
  },

I came across ${
    prospect.organization.name
  }'s recent announcement regarding "${
    prospect.announcement.title
  }".

${angle}

Given this recent activity, I thought ${
    details.name
  } could be particularly relevant for your team. The conference brings together ${
    details.audience
  } and creates opportunities to connect with organizations working on similar areas of innovation and growth.

I would be happy to share the relevant conference details and explore whether it could be a fit for ${
    prospect.organization.name
  }.

Best regards,
Conference Team`;

  return {
    angle,
    subject,
    email,
  };
}