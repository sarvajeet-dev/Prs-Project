import { scheduleDaily } from "./background-jobs/discovery-scheduler";

let schedulerInitialized = false;

export function initializeScheduler() {
  if (schedulerInitialized) {
    return;
  }

  if (typeof window !== "undefined") {
    console.log(
      "[Init] Skipping scheduler initialization in browser environment"
    );
    return;
  }

  try {
    console.log(
      "[Init] Initializing daily discovery scheduler..."
    );

    scheduleDaily(2);

    schedulerInitialized = true;

    console.log(
      "[Init] Daily discovery scheduler initialized (2 AM UTC)"
    );
  } catch (error) {
    console.error(
      "[Init] Failed to initialize scheduler:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );
  }
}
