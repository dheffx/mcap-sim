import { describe, expect, it } from 'vitest';
import { makeCode } from '../src/engine/assemble';
import { assessments } from '../src/engine/assessments';
import { resolveRoute, resolveTestInput, testHref } from '../src/ui/routes';

describe('shareable hash routes', () => {
  it.each(['BAYTRAIL', 'X', 'BROWSER-CHECK', 'A'.repeat(40)])('round-trips the entire seed %s without dropping characters', seed => {
    const code = makeCode(seed);
    const route = resolveRoute(testHref(code));
    expect(route.kind).toBe('test');
    if (route.kind !== 'test') throw new Error('Expected a test route.');
    expect(route.test.code).toBe(code);
    expect(route.test.seed).toBe(seed);
  });

  it.each(['', '#', '#/'])('opens the home page at %j', hash => {
    expect(resolveRoute(hash).kind).toBe('home');
  });

  it.each(assessments)('round-trips a shared $id test and resolves seeds in that assessment', assessment => {
    const code = makeCode(' sharing ', assessment.id);
    expect(resolveTestInput(' sharing ', assessment.id)).toBe(code);
    expect(resolveTestInput(` ${code} `, assessment.id === 'g5' ? 'alg1' : 'g5')).toBe(code);
    const route = resolveRoute(testHref(code));
    expect(route.kind).toBe('test');
    if (route.kind === 'test') expect(route.test.code).toBe(code);
  });

  it.each(assessments)('preserves a loaded $id legacy code on Start, but not on Use seed', assessment => {
    const legacy = makeCode('SHARING', assessment.id, 'v1');
    expect(resolveTestInput(' sharing ', assessment.id, legacy)).toBe(legacy);
    expect(resolveTestInput(' sharing ', assessment.id)).toBe(makeCode('SHARING', assessment.id));
    expect(resolveTestInput('OTHER', assessment.id, legacy)).toBe(makeCode('OTHER', assessment.id));
    const other = assessment.id === 'g5' ? 'alg1' : 'g5';
    expect(resolveTestInput('SHARING', other, legacy)).toBe(makeCode('SHARING', other));
    const updated = makeCode('SHARING', assessment.id);
    expect(resolveTestInput(updated, assessment.id, legacy)).toBe(updated);
    expect(resolveRoute(testHref(legacy)).kind).toBe('test');
    const reviewed = makeCode('SHARING', assessment.id, 'v2');
    expect(resolveTestInput(' sharing ', assessment.id, reviewed)).toBe(reviewed);
    expect(resolveRoute(testHref(reviewed)).kind).toBe('test');
  });

  it.each(['#/unknown', '#/t/%E0%A4%A', '#/t/SEED.g5.p1.v0', '#/t/SEED.g6.p1.v1', '#/t/'])('shows an explicit error for %s', hash => {
    expect(resolveRoute(hash).kind).toBe('error');
  });
});
