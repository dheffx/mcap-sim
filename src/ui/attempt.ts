export const DEFAULT_DURATION_MS = 15 * 60 * 1000;

export interface Preparation {
  id: string;
  durationMs: number;
  startedAt: number | null;
}

export interface Progress {
  answers: Record<string, string>;
  flags: string[];
  currentIndex: number;
  submitted: boolean;
  durationMs: number;
  startedAt: number | null;
  finishedAt: number | null;
  expiredAnswers: Record<string, string> | null;
  acknowledgedExpiry: boolean;
  attemptId: string | null;
}

export function emptyProgress(durationMs = DEFAULT_DURATION_MS, attemptId: string | null = null): Progress {
  return {
    answers: {}, flags: [], currentIndex: 0, submitted: false,
    durationMs, startedAt: null, finishedAt: null, expiredAnswers: null,
    acknowledgedExpiry: false, attemptId,
  };
}

export function durationFromMinutes(input: string): number {
  const minutes = Number(input);
  const duration = minutes * 60000;
  if (!Number.isSafeInteger(minutes) || minutes < 1 || !Number.isSafeInteger(duration) ||
      duration > Number.MAX_SAFE_INTEGER - Date.now()) {
    throw new Error('Enter a positive whole number of minutes.');
  }
  return duration;
}

export function beginAttempt(progress: Progress, now: number, durationMs = progress.durationMs): Progress {
  if (progress.startedAt !== null || progress.submitted) return progress;
  return { ...progress, startedAt: now, durationMs, currentIndex: 0 };
}

export function expireAttempt(progress: Progress, now: number): Progress {
  if (progress.startedAt === null || progress.submitted || progress.expiredAnswers !== null ||
      now < progress.startedAt + progress.durationMs) return progress;
  return { ...progress, expiredAnswers: { ...progress.answers } };
}

export function recordAnswer(progress: Progress, id: string, answer: string, now: number): Progress {
  if (progress.startedAt === null || progress.submitted) return progress;
  const updated = expireAttempt(progress, now);
  return { ...updated, answers: { ...updated.answers, [id]: answer } };
}

export function finishAttempt(progress: Progress, now: number): Progress {
  if (progress.startedAt === null || progress.submitted) return progress;
  const updated = expireAttempt(progress, now);
  return { ...updated, submitted: true, finishedAt: now, acknowledgedExpiry: updated.expiredAnswers !== null };
}

export function remainingSeconds(progress: Progress, now: number): number {
  if (progress.startedAt === null) return Math.ceil(progress.durationMs / 1000);
  if (progress.expiredAnswers !== null) return 0;
  return Math.max(0, Math.ceil((progress.startedAt + progress.durationMs - (progress.finishedAt ?? now)) / 1000));
}

export function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
