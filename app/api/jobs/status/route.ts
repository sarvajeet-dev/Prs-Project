import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getJobStatus,
  getQueueStats,
} from "@/lib/background-jobs/discovery-scheduler";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest
) {
  try {
    const jobId =
      request.nextUrl.searchParams.get(
        "jobId"
      );

    if (jobId) {
      const status = getJobStatus(jobId);

      if (!status) {
        return NextResponse.json(
          {
            success: false,
            error: "Job not found",
          },
          {
            status: 404,
          }
        );
      }

      return NextResponse.json({
        success: true,
        job: status,
      });
    }

    const stats = getQueueStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Job status error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to get job status",
      },
      {
        status: 500,
      }
    );
  }
}
