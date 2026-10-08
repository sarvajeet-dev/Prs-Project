
import { NextRequest, NextResponse } from "next/server";
import { findSeniorContacts } from "@/lib/hunter";
import { getDomain } from "@/lib/utils";

export async function POST(
  request: NextRequest
) {
  try {
    // -----------------------------------------
    // 1. Read request body
    // -----------------------------------------

    const body =
      await request.json();

    const {
      organization,
      url,
      domain: providedDomain,
    } = body;

    // -----------------------------------------
    // 2. Validate input
    // -----------------------------------------

    if (
      !organization &&
      !url &&
      !providedDomain
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Organization, URL, or domain is required",
        },
        {
          status: 400,
        }
      );
    }

    // -----------------------------------------
    // 3. Determine domain
    // -----------------------------------------

    let domain: string | null =
      null;

    if (providedDomain) {
      domain = providedDomain;
    } else if (url) {
      domain = getDomain(url);
    }

    // -----------------------------------------
    // 4. Make sure domain exists
    // -----------------------------------------

    if (!domain) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Could not determine company domain",
        },
        {
          status: 400,
        }
      );
    }

    // -----------------------------------------
    // 5. Find senior contacts
    // -----------------------------------------

    const contacts =
      await findSeniorContacts(
        domain
      );

    // -----------------------------------------
    // 6. Return result
    // -----------------------------------------

    return NextResponse.json({
      success: true,

      organization:
        organization || null,

      domain,

      count:
        contacts.length,

      contacts,
    });
  } catch (error) {
    console.error(
      "Contact enrichment error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Contact enrichment failed",
      },
      {
        status: 500,
      }
    );
  }
}
