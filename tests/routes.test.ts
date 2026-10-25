import { describe, expect, it } from 'vitest';
import { makeCode } from '../src/engine/assemble';
import { resolveRoute, testHref } from '../src/ui/routes';

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

  it.each(['#/unknown', '#/t/%E0%A4%A', '#/t/SEED.g5.p1.v0', '#/t/SEED.g8.p1.v1', '#/t/'])('shows an explicit error for %s', hash => {
    expect(resolveRoute(hash).kind).toBe('error');
  });
});
