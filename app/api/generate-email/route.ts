import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  generateEmailDraft,
  generateOutreachAngle,
} from "@/lib/outreach/email-generator";

import { Prospect, Contact } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request
        .json()
        .catch(() => ({}));

    const prospect =
      body.prospect as Prospect | undefined;

    const contact =
      body.contact as Contact | null;

    if (!prospect) {
      return NextResponse.json(
        {
          success: false,
          error: "Prospect data required",
        },
        {
          status: 400,
        }
      );
    }

    const emailDraft =
      generateEmailDraft(prospect, contact);

    const outreachAngle =
      generateOutreachAngle(prospect);

    return NextResponse.json({
      success: true,

      email: emailDraft,

      outreachAngle,

      meta: {
        organizationName:
          prospect.organization.name,

        contactName:
          contact?.firstName || "Decision Maker",

        contactEmail:
          contact?.email ?? null,

        signals:
          prospect.announcement
            .signals,
      },
    });
  } catch (error) {
    console.error(
      "Email generation error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Failed to generate email",
      },
      {
        status: 500,
      }
    );
  }
}
