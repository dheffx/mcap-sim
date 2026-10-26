import { generateTest, makeCode } from '../engine/assemble';

export function resolveTestInput(input: string, assessmentId: string, existingCode?: string): string {
  if (existingCode && !input.includes('.')) {
    const [seed, existingAssessment] = existingCode.split('.');
    if (input.trim().toUpperCase() === seed && assessmentId === existingAssessment) return generateTest(existingCode).code;
  }
  return input.includes('.') ? generateTest(input.trim()).code : makeCode(input, assessmentId);
}

export function testHref(code: string): string {
  return `#/t/${encodeURIComponent(code)}`;
}

export function resolveRoute(hash: string) {
  if (hash === '' || hash === '#' || hash === '#/') return { kind: 'home' as const };
  try {
    const prefix = '#/t/';
    if (!hash.startsWith(prefix)) throw new Error('This page does not exist. Open a test link or return home.');
    return { kind: 'test' as const, test: generateTest(decodeURIComponent(hash.slice(prefix.length))) };
  } catch (error) {
    return { kind: 'error' as const, message: error instanceof Error ? error.message : String(error) };
  }
}
