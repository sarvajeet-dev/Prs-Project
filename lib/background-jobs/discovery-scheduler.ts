import { jobQueue } from "./job-queue";
import { discoverProspects } from "@/lib/discovery";
import { MARKETS, CONFERENCES } from "@/lib/config";

export interface DiscoveryJobOptions {
  markets?: string[];
  conferences?: string[];
  incremental?: boolean;
}

export async function scheduleDiscoveryJob(
  options: DiscoveryJobOptions = {}
): Promise<string> {
  const jobId = `discovery-${Date.now()}`;

  const job = jobQueue.addJob(
    jobId,
    "discovery"
  );

  runDiscoveryJob(jobId, options).catch(
    (error) => {
      console.error(
        `[DiscoveryScheduler] Job ${jobId} failed:`,
        error
      );
    }
  );

  return jobId;
}

async function runDiscoveryJob(
  jobId: string,
  options: DiscoveryJobOptions
): Promise<void> {
  jobQueue.markRunning(jobId);

  try {
    const markets =
      options.markets || MARKETS;

    const conferences =
      options.conferences ||
      CONFERENCES;

    const startTime = Date.now();

    const result =
      await discoverProspects({
        markets: markets as any,
        conferences: conferences as any,
      });

    const duration = Date.now() - startTime;

    jobQueue.markCompleted(jobId, {
      prospects: result.prospects.length,
      meta: result.meta,
      duration,
    });

    console.log(
      `[DiscoveryScheduler] Job ${jobId} completed in ${duration}ms`
    );

    console.log(
      `[DiscoveryScheduler] Results: ${result.prospects.length} prospects from ${result.meta.queriesExecuted} queries`
    );
  } catch (error) {
    const errorMsg =
      error instanceof Error
        ? error.message
        : "Unknown error";

    jobQueue.markFailed(jobId, errorMsg);

    console.error(
      `[DiscoveryScheduler] Job ${jobId} failed:`,
      errorMsg
    );
  }
}

export function scheduleDaily(
  hourUtc: number = 2
): NodeJS.Timeout {
  const scheduleCron = () => {
    const now = new Date();

    const tomorrow = new Date(now);
    tomorrow.setUTCDate(
      tomorrow.getUTCDate() + 1
    );
    tomorrow.setUTCHours(hourUtc, 0, 0, 0);

    const msUntilNext =
      tomorrow.getTime() - now.getTime();

    console.log(
      `[DiscoveryScheduler] Next run in ${Math.round(msUntilNext / 1000 / 60)} minutes`
    );

    return setTimeout(() => {
      scheduleDiscoveryJob({
        markets: MARKETS as any,
      })
        .then((jobId) => {
          console.log(
            `[DiscoveryScheduler] Started daily job: ${jobId}`
          );
        })
        .catch((error) => {
          console.error(
            "[DiscoveryScheduler] Failed to start daily job:",
            error
          );
        });

      scheduleCron();
    }, msUntilNext);
  };

  return scheduleCron();
}

export function getJobStatus(jobId: string) {
  const job = jobQueue.getJob(jobId);

  if (!job) {
    return null;
  }

  return {
    id: job.id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    error: job.error,
    result: job.result,
  };
}

export function getQueueStats() {
  return jobQueue.getStats();
}
