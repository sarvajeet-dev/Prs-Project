import { NextResponse } from "next/server";

import {
  getPRNewswireReleases,
} from "@/lib/sources/prNewswire";

export async function GET() {
  try {
    const releases =
      await getPRNewswireReleases();

    return NextResponse.json({
      success: true,

      count: releases.length,

      lastUpdated:
        new Date().toISOString(),

      data: releases,
    });
  } catch (error) {
    console.error(
      "Press release error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Failed to fetch press releases",

        data: [],
      },
      {
        status: 500,
      }
    );
  }
}