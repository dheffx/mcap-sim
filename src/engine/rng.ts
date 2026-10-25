function hash(text: string): [number, number, number, number] {
  let a = 1779033703;
  let b = 3144134277;
  let c = 1013904242;
  let d = 2773480762;
  for (let i = 0; i < text.length; i++) {
    const k = text.charCodeAt(i);
    a = b ^ Math.imul(a ^ k, 597399067);
    b = c ^ Math.imul(b ^ k, 2869860233);
    c = d ^ Math.imul(c ^ k, 951274213);
    d = a ^ Math.imul(d ^ k, 2716044179);
  }
  a = Math.imul(c ^ (a >>> 18), 597399067);
  b = Math.imul(d ^ (b >>> 22), 2869860233);
  c = Math.imul(a ^ (c >>> 17), 951274213);
  d = Math.imul(b ^ (d >>> 19), 2716044179);
  return [(a ^ b ^ c ^ d) >>> 0, (b ^ a) >>> 0, (c ^ a) >>> 0, (d ^ a) >>> 0];
}

export class Rng {
  private state: [number, number, number, number];

  constructor(seed: string) {
    this.state = hash(seed);
    for (let i = 0; i < 12; i++) this.next();
  }

  private next(): number {
    let [a, b, c, d] = this.state;
    const t = ((a + b | 0) + d | 0) >>> 0;
    d = d + 1 | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = (c << 21 | c >>> 11) + t | 0;
    this.state = [a, b, c, d];
    return t / 4294967296;
  }

  int(min: number, max: number): number {
    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max ||
        !Number.isSafeInteger(max - min + 1) || max - min + 1 > 4294967296) {
      throw new Error('RNG bounds must be ordered safe integers spanning at most 2^32 values.');
    }
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick<T>(values: readonly T[]): T {
    if (values.length === 0) throw new Error('Cannot pick from an empty list.');
    return values[this.int(0, values.length - 1)]!;
  }

  shuffle<T>(values: readonly T[]): T[] {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [result[i], result[j]] = [result[j]!, result[i]!];
    }
    return result;
  }
}

export function slotRng(code: string, slot: number, stream = 'content'): Rng {
  return new Rng(JSON.stringify([code, slot, stream]));
}
