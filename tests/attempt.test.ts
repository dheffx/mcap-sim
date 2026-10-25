import { describe, expect, it } from 'vitest';
import { generateTest, isCorrect, makeCode } from '../src/engine/assemble';
import {
  beginAttempt, DEFAULT_DURATION_MS, durationFromMinutes, emptyProgress, expireAttempt,
  finishAttempt, formatTime, recordAnswer, remainingSeconds,
} from '../src/ui/attempt';

describe('timed attempt lifecycle', () => {
  it('defaults to a stopped 15-minute timer and hides responses until started', () => {
    const ready = emptyProgress();
    expect(ready.durationMs).toBe(DEFAULT_DURATION_MS);
    expect(ready.startedAt).toBeNull();
    expect(remainingSeconds(ready, 100000000)).toBe(900);
    expect(recordAnswer(ready, 'q1', 'A', 1000)).toBe(ready);
    const started = beginAttempt(ready, 1000);
    expect(started.startedAt).toBe(1000);
    expect(remainingSeconds(started, 2000)).toBe(899);
    expect(beginAttempt(started, 9999)).toBe(started);
  });

  it('starts a custom duration at question 1, preserving migrated answers', () => {
    const ready = { ...emptyProgress(), answers: { q2: 'A' }, currentIndex: 8 };
    const started = beginAttempt(ready, 1000, 120000);
    expect(started.currentIndex).toBe(0);
    expect(started.answers).toEqual({ q2: 'A' });
    expect(remainingSeconds(started, 1000)).toBe(120);
  });

  it('uses a deadline rather than decrementing ticks, including after a closed tab', () => {
    const started = beginAttempt(emptyProgress(60000), 1000);
    expect(remainingSeconds(started, 15500)).toBe(46);
    expect(expireAttempt(started, 60999)).toBe(started);
    const expired = expireAttempt(started, 61000);
    expect(expired.expiredAnswers).toEqual({});
    expect(remainingSeconds(expired, 90000)).toBe(0);
    expect(expireAttempt(started, 1000000).expiredAnswers).toEqual({});
  });

  it('snapshots all timed answers exactly once and categorizes unanswered separately', () => {
    let progress = beginAttempt(emptyProgress(60000), 1000);
    progress = recordAnswer(progress, 'q1', 'A', 5000);
    progress = recordAnswer(progress, 'q2', '', 5001);
    progress = expireAttempt(progress, 61000);
    const snapshot = progress.expiredAnswers;
    expect(snapshot).toEqual({ q1: 'A', q2: '' });
    progress = recordAnswer(progress, 'q1', 'B', 62000);
    progress = recordAnswer(progress, 'q2', '1/2', 63000);
    expect(progress.expiredAnswers).toBe(snapshot);
    expect(progress.answers).toEqual({ q1: 'B', q2: '1/2' });
    expect(expireAttempt(progress, 64000)).toBe(progress);
  });

  it('does not count an answer at or after the deadline even if the timer callback was delayed', () => {
    const started = beginAttempt(emptyProgress(60000), 1000);
    const before = recordAnswer(started, 'q1', 'A', 60999);
    const at = recordAnswer(before, 'q2', 'B', 61000);
    expect(at.expiredAnswers).toEqual({ q1: 'A' });
    expect(at.answers).toEqual({ q1: 'A', q2: 'B' });
  });

  it('provides correct practice grading without changing timed score or unanswered count', () => {
    const test = generateTest(makeCode('TIMED-SCORE'));
    const first = test.items[0]!, second = test.items[1]!;
    const response = first.choices!.find(choice => choice.value === first.key)!.id;
    let progress = beginAttempt(emptyProgress(60000), 1000);
    progress = recordAnswer(progress, first.id, response, 1001);
    progress = expireAttempt(progress, 61000);
    progress = recordAnswer(progress, second.id, second.choices!.find(choice => choice.value === second.key)!.id, 62000);
    const timed = progress.expiredAnswers!;
    expect(test.items.filter(item => isCorrect(item, timed[item.id] ?? ''))).toHaveLength(1);
    expect(test.items.filter(item => !(timed[item.id] ?? '').trim())).toHaveLength(19);
    expect(test.items.filter(item => isCorrect(item, progress.answers[item.id] ?? ''))).toHaveLength(2);
  });

  it('stops on manual submission, locks responses, and preserves remaining time', () => {
    const submitted = finishAttempt(beginAttempt(emptyProgress(60000), 1000), 11000);
    expect(submitted.expiredAnswers).toBeNull();
    expect(submitted.acknowledgedExpiry).toBe(false);
    expect(remainingSeconds(submitted, 1000000)).toBe(50);
    expect(recordAnswer(submitted, 'q1', 'A', 12000)).toBe(submitted);
    expect(expireAttempt(submitted, 1000000)).toBe(submitted);
    expect(finishAttempt(submitted, 1000000)).toBe(submitted);
  });

  it('captures expiry on a late manual submission and quits without changing the snapshot', () => {
    const started = beginAttempt(emptyProgress(60000), 1000);
    const submitted = finishAttempt(started, 61000);
    expect(submitted.expiredAnswers).toEqual({});
    expect(submitted.acknowledgedExpiry).toBe(true);
    expect(submitted.submitted).toBe(true);
    expect(remainingSeconds(submitted, 62000)).toBe(0);
  });

  it('resetting clears all timing, score and navigation state', () => {
    const reset = emptyProgress(120000, 'new-attempt');
    expect(reset).toMatchObject({
      answers: {}, flags: [], currentIndex: 0, submitted: false, startedAt: null,
      finishedAt: null, expiredAnswers: null, acknowledgedExpiry: false, attemptId: 'new-attempt',
    });
    expect(remainingSeconds(reset, 999999)).toBe(120);
  });

  it.each(['', '0', '-1', '1.5', 'NaN', 'Infinity', '999999999999999999999'])('rejects invalid durations %j', input => {
    expect(() => durationFromMinutes(input)).toThrow();
  });

  it('parses positive whole minutes and formats time without wrapping after an hour', () => {
    expect(durationFromMinutes('15')).toBe(900000);
    expect(durationFromMinutes('60')).toBe(3600000);
    expect(formatTime(900)).toBe('15:00');
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(61)).toBe('1:01');
    expect(formatTime(3601)).toBe('60:01');
  });
});
