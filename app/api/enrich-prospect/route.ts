import {
  NextRequest,
  NextResponse,
} from "next/server";

import { enrichProspect } from "@/lib/enrichment/prospect-enrichment";
import { Prospect } from "@/lib/types";

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

    if (!prospect) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Prospect data is required",
        },
        {
          status: 400,
        }
      );
    }

    const result = await enrichProspect(prospect);

    return NextResponse.json({
      success: true,
      contact: result.primaryContact,
      contacts: result.contacts,
      website: result.website,
      diagnostics: result.diagnostics,
    });
  } catch (error) {
    console.error(
      "Enrich prospect error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Enrichment failed",
      },
      {
        status: 500,
      }
    );
  }
}
