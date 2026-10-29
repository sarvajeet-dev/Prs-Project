import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  scheduleDiscoveryJob,
} from "@/lib/background-jobs/discovery-scheduler";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest
) {
  try {
    const body =
      await request
        .json()
        .catch(() => ({}));

    const jobId =
      await scheduleDiscoveryJob({
        markets: body.markets,
        conferences: body.conferences,
      });

    return NextResponse.json({
      success: true,
      jobId,
      status: "scheduled",
      message:
        "Discovery job scheduled successfully",
    });
  } catch (error) {
    console.error(
      "Schedule discovery error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to schedule discovery",
      },
      {
        status: 500,
      }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message:
      "POST to this endpoint to schedule a discovery job",
    usage: {
      method: "POST",
      body: {
        markets: [
          "Singapore",
          "Malaysia",
          "Hong Kong",
        ],
        conferences: ["health", "education"],
      },
    },
  });
}
