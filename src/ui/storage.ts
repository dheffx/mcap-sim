import { useEffect, useState } from 'react';
import { beginAttempt, emptyProgress, expireAttempt } from './attempt';
import type { Preparation, Progress } from './attempt';
export { emptyProgress } from './attempt';
const keyFor = (code: string) => `mcap-lab:progress:${code}`;
const lastKey = 'mcap-lab:last-test';

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function parseProgress(raw: string, total: number): Progress {
  const value: unknown = JSON.parse(raw);
  if (typeof value !== 'object' || value === null || !('schema' in value) || (value.schema !== 1 && value.schema !== 2) ||
      !('answers' in value) || typeof value.answers !== 'object' || value.answers === null || Array.isArray(value.answers) ||
      !('flags' in value) || !Array.isArray(value.flags) ||
      !('currentIndex' in value) || typeof value.currentIndex !== 'number' ||
      !Number.isInteger(value.currentIndex) || value.currentIndex < 0 || value.currentIndex >= total ||
      !('submitted' in value) || typeof value.submitted !== 'boolean') {
    throw new Error('Saved progress has an unsupported format.');
  }
  const validId = (id: string) => /^q[1-9]\d*$/.test(id) && Number(id.slice(1)) <= total;
  function parseAnswers(input: unknown): Record<string, string> {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) throw new Error('Saved answers are invalid.');
    const result: Record<string, string> = {};
    for (const [id, answer] of Object.entries(input)) {
      if (!validId(id) || typeof answer !== 'string' || answer.length > 80) throw new Error('A saved response is invalid.');
      result[id] = answer;
    }
    return result;
  }
  const answers = parseAnswers(value.answers);
  const flags: string[] = [];
  for (const flag of value.flags) {
    if (typeof flag !== 'string' || !validId(flag) || flags.includes(flag)) throw new Error('Saved review flags are invalid.');
    flags.push(flag);
  }
  const base = { ...emptyProgress(), answers, flags, currentIndex: value.currentIndex, submitted: value.submitted };
  if (value.schema === 1) return base;
  const validTime = (time: unknown): time is number | null =>
    time === null || (typeof time === 'number' && Number.isSafeInteger(time) && time >= 0);
  if (!('durationMs' in value) || typeof value.durationMs !== 'number' ||
      !Number.isSafeInteger(value.durationMs) || value.durationMs <= 0 ||
      !('startedAt' in value) || !validTime(value.startedAt) ||
      !('finishedAt' in value) || !validTime(value.finishedAt) ||
      !('expiredAnswers' in value) ||
      !('acknowledgedExpiry' in value) || typeof value.acknowledgedExpiry !== 'boolean' ||
      !('attemptId' in value) || (value.attemptId !== null && (typeof value.attemptId !== 'string' || value.attemptId.length > 100))) {
    throw new Error('Saved timer state is invalid.');
  }
  const expiredAnswers = value.expiredAnswers === null ? null : parseAnswers(value.expiredAnswers);
  if ((value.startedAt === null && (expiredAnswers !== null || value.finishedAt !== null)) ||
      (value.startedAt !== null && value.durationMs > Number.MAX_SAFE_INTEGER - value.startedAt) ||
      (value.startedAt !== null && value.finishedAt !== null && value.finishedAt < value.startedAt) ||
      (!value.submitted && value.finishedAt !== null) ||
      (value.submitted && value.startedAt !== null && value.finishedAt === null) ||
      (value.acknowledgedExpiry && expiredAnswers === null)) {
    throw new Error('Saved timer state is inconsistent.');
  }
  return {
    ...base, durationMs: value.durationMs, startedAt: value.startedAt, finishedAt: value.finishedAt,
    expiredAnswers, acknowledgedExpiry: value.acknowledgedExpiry, attemptId: value.attemptId,
  };
}

export function readLastTest(): { code: string | null; error: string | null } {
  try {
    return { code: localStorage.getItem(lastKey), error: null };
  } catch (error) {
    return { code: null, error: `Browser storage is unavailable. Progress cannot be restored: ${message(error)}` };
  }
}

export function useProgress(code: string, total: number, preparation?: Preparation) {
  const [loaded] = useState(() => {
    let fresh = emptyProgress(preparation?.durationMs, preparation?.id);
    if (preparation?.startedAt !== undefined && preparation.startedAt !== null) fresh = beginAttempt(fresh, preparation.startedAt);
    try {
      const raw = localStorage.getItem(keyFor(code));
      let progress = raw ? parseProgress(raw, total) : emptyProgress();
      if (preparation && progress.attemptId !== preparation.id) {
        progress = fresh;
      }
      return { progress: expireAttempt(progress, Date.now()), error: null };
    } catch (error) {
      return { progress: fresh, error: `Saved progress could not be loaded: ${message(error)}. It will not be overwritten unless you reset it.` };
    }
  });
  const [progress, setProgress] = useState(loaded.progress);
  const [blocked, setBlocked] = useState(loaded.error !== null);
  const [storageError, setStorageError] = useState<string | null>(loaded.error);

  useEffect(() => {
    if (blocked) return;
    try {
      localStorage.setItem(keyFor(code), JSON.stringify({ schema: 2, ...progress }));
      localStorage.setItem(lastKey, code);
      setStorageError(null);
    } catch (error) {
      setStorageError(`Progress is not being saved. Keep this tab open: ${message(error)}`);
    }
  }, [code, progress, blocked]);

  function reset() {
    try {
      localStorage.removeItem(keyFor(code));
      setProgress(emptyProgress(progress.durationMs, progress.attemptId));
      setBlocked(false);
      setStorageError(null);
      return true;
    } catch (error) {
      setStorageError(`Saved progress could not be reset: ${message(error)}`);
      return false;
    }
  }

  return { progress, setProgress, storageError, reset, blocked };
}
