export interface Job {
  id: string;
  type: string;
  status:
    | "pending"
    | "running"
    | "completed"
    | "failed";
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  progress: number;
  error: string | null;
  result: unknown;
}

interface JobConfig {
  maxConcurrent?: number;
  timeoutMs?: number;
}

class JobQueue {
  private jobs: Map<string, Job> =
    new Map();

  private running: Set<string> = new Set();

  private config: Required<JobConfig>;

  constructor(config: JobConfig = {}) {
    this.config = {
      maxConcurrent:
        config.maxConcurrent ?? 1,
      timeoutMs: config.timeoutMs ?? 300000,
    };
  }

  addJob(
    id: string,
    type: string
  ): Job {
    const job: Job = {
      id,
      type,
      status: "pending",
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
      progress: 0,
      error: null,
      result: null,
    };

    this.jobs.set(id, job);

    return job;
  }

  getJob(id: string): Job | null {
    return this.jobs.get(id) || null;
  }

  updateJob(
    id: string,
    updates: Partial<Job>
  ): void {
    const job = this.jobs.get(id);

    if (!job) {
      return;
    }

    Object.assign(job, updates);
  }

  markRunning(id: string): void {
    const job = this.jobs.get(id);

    if (!job) {
      return;
    }

    job.status = "running";
    job.startedAt = new Date();
    this.running.add(id);
  }

  markCompleted(
    id: string,
    result?: unknown
  ): void {
    const job = this.jobs.get(id);

    if (!job) {
      return;
    }

    job.status = "completed";
    job.completedAt = new Date();
    job.progress = 100;
    job.result = result;
    this.running.delete(id);
  }

  markFailed(
    id: string,
    error: string
  ): void {
    const job = this.jobs.get(id);

    if (!job) {
      return;
    }

    job.status = "failed";
    job.completedAt = new Date();
    job.error = error;
    this.running.delete(id);
  }

  setProgress(
    id: string,
    progress: number
  ): void {
    const job = this.jobs.get(id);

    if (!job) {
      return;
    }

    job.progress = Math.min(100, progress);
  }

  getRunningCount(): number {
    return this.running.size;
  }

  canRunMoreJobs(): boolean {
    return (
      this.running.size <
      this.config.maxConcurrent
    );
  }

  getStats() {
    const jobs = Array.from(
      this.jobs.values()
    );

    return {
      total: jobs.length,
      pending: jobs.filter(
        (j) => j.status === "pending"
      ).length,
      running: this.running.size,
      completed: jobs.filter(
        (j) => j.status === "completed"
      ).length,
      failed: jobs.filter(
        (j) => j.status === "failed"
      ).length,
    };
  }

  clear(): void {
    this.jobs.clear();
    this.running.clear();
  }
}

export const jobQueue = new JobQueue({
  maxConcurrent: 2,
  timeoutMs: 600000,
});
