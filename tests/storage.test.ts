import { describe, expect, it } from 'vitest';
import { emptyProgress, parseProgress } from '../src/ui/storage';

describe('persisted progress validation', () => {
  it('round-trips answers, flags, submission and position', () => {
    const progress = { answers: { q1: 'A', q3: '1/2' }, flags: ['q2'], submitted: true, currentIndex: 4 };
    expect(parseProgress(JSON.stringify({ schema: 1, ...progress }), 20)).toEqual({ ...emptyProgress(), ...progress });
    expect(parseProgress(JSON.stringify({ schema: 1, ...emptyProgress() }), 20)).toEqual(emptyProgress());
  });

  it('migrates old untimed attempts without losing answers', () => {
    const old = { schema: 1, answers: { q1: 'A' }, flags: ['q2'], submitted: false, currentIndex: 3 };
    const migrated = parseProgress(JSON.stringify(old), 20);
    expect(migrated.answers).toEqual(old.answers);
    expect(migrated.startedAt).toBeNull();
    expect(migrated.durationMs).toBe(900000);
    expect(migrated.currentIndex).toBe(3);
  });

  it('round-trips a timed attempt with separate deadline and practice answers', () => {
    const timed = {
      ...emptyProgress(60000, 'attempt-1'), answers: { q1: 'B', q2: '3/4' },
      startedAt: 1000, expiredAnswers: { q1: 'A' }, acknowledgedExpiry: true,
      submitted: true, finishedAt: 75000,
    };
    expect(parseProgress(JSON.stringify({ schema: 2, ...timed }), 20)).toEqual(timed);
  });

  it.each([
    { durationMs: 0 }, { durationMs: -1 }, { durationMs: Infinity },
    { startedAt: -1 }, { startedAt: '1000' }, { startedAt: 1.5 },
    { finishedAt: 1000 }, { expiredAnswers: {} }, { acknowledgedExpiry: true },
    { attemptId: 123 }, { expiredAnswers: { q21: 'A' }, startedAt: 1000 },
    { submitted: true, startedAt: 1000, finishedAt: null },
    { submitted: true, startedAt: 1000, finishedAt: 999 },
    { startedAt: Number.MAX_SAFE_INTEGER },
  ])('rejects malformed or inconsistent timer state %j', overrides => {
    expect(() => parseProgress(JSON.stringify({ schema: 2, ...emptyProgress(), ...overrides }), 20)).toThrow();
  });

  it.each([
    'not json', 'null', '{}',
    JSON.stringify({ schema: 3, ...emptyProgress() }),
    JSON.stringify({ schema: 1, ...emptyProgress(), currentIndex: 20 }),
    JSON.stringify({ schema: 1, ...emptyProgress(), currentIndex: -1 }),
    JSON.stringify({ schema: 1, ...emptyProgress(), currentIndex: 1.5 }),
    JSON.stringify({ schema: 1, ...emptyProgress(), answers: { q21: 'A' } }),
    JSON.stringify({ schema: 1, ...emptyProgress(), answers: { q1: 1 } }),
    JSON.stringify({ schema: 1, ...emptyProgress(), answers: { q1: 'A'.repeat(81) } }),
    JSON.stringify({ schema: 1, ...emptyProgress(), answers: [] }),
    JSON.stringify({ schema: 1, ...emptyProgress(), flags: ['q1', 'q1'] }),
    JSON.stringify({ schema: 1, ...emptyProgress(), flags: ['q0'] }),
  ])('refuses corrupt or incompatible stored data', raw => {
    expect(() => parseProgress(raw, 20)).toThrow();
  });
});
