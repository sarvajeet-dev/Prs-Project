import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  discoverProspects,
} from "@/lib/discovery";

import {
  Conference,
  Market,
  Signal,
} from "@/lib/types";

export const dynamic =
  "force-dynamic";

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request
        .json()
        .catch(() => ({}));

    const conferences =
      Array.isArray(
        body.conferences
      )
        ? (
            body.conferences as Conference[]
          )
        : undefined;

    const markets =
      Array.isArray(
        body.markets
      )
        ? (
            body.markets as Market[]
          )
        : undefined;

    const signals =
      Array.isArray(
        body.signals
      )
        ? (
            body.signals as Signal[]
          )
        : undefined;

    const result =
      await discoverProspects({
        conferences,
        markets,
        signals,
      });

    return NextResponse.json({
      success: true,

      prospects:
        result.prospects,

      meta:
        result.meta,
    });
  } catch (error) {
    console.error(
      "Discovery API error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Discovery failed",
      },
      {
        status: 500,
      }
    );
  }
}