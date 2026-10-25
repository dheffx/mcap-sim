function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) [x, y] = [y, x % y];
  return x;
}

export class Fraction {
  readonly n: bigint;
  readonly d: bigint;

  constructor(n: number | bigint, d: number | bigint = 1) {
    if ((typeof n === 'number' && !Number.isSafeInteger(n)) ||
        (typeof d === 'number' && !Number.isSafeInteger(d))) {
      throw new Error('Fraction components must be exact integers.');
    }
    const numerator = BigInt(n);
    const denominator = BigInt(d);
    if (denominator === 0n) throw new Error('A denominator cannot be zero.');
    const divisor = gcd(numerator, denominator);
    const sign = denominator < 0n ? -1n : 1n;
    this.n = numerator / divisor * sign;
    this.d = denominator / divisor * sign;
  }

  static parse(input: string): Fraction | null {
    const text = input.trim();
    if (text.length === 0 || text.length > 80) return null;
    const rational = /^([+-]?\d+)\s*\/\s*([+-]?\d+)$/.exec(text);
    if (rational) {
      const n = BigInt(rational[1]!);
      const d = BigInt(rational[2]!);
      return d === 0n ? null : new Fraction(n, d);
    }
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) return null;
    const sign = text.startsWith('-') ? -1n : 1n;
    const [whole = '0', decimal = ''] = text.replace(/^[+-]/, '').split('.');
    return new Fraction(sign * BigInt(`${whole || '0'}${decimal}`), 10n ** BigInt(decimal.length));
  }

  add(other: Fraction): Fraction {
    return new Fraction(this.n * other.d + other.n * this.d, this.d * other.d);
  }

  sub(other: Fraction): Fraction {
    return new Fraction(this.n * other.d - other.n * this.d, this.d * other.d);
  }

  mul(other: Fraction): Fraction {
    return new Fraction(this.n * other.n, this.d * other.d);
  }

  div(other: Fraction): Fraction {
    return new Fraction(this.n * other.d, this.d * other.n);
  }

  equals(other: Fraction): boolean {
    return this.n === other.n && this.d === other.d;
  }

  toString(): string {
    return this.d === 1n ? String(this.n) : `${this.n}/${this.d}`;
  }
}

export function decimal(value: number, places: number): string {
  const digits = String(value).padStart(places + 1, '0');
  return `${digits.slice(0, -places)}.${digits.slice(-places)}`;
}

export function latex(value: Fraction): string {
  return value.d === 1n ? String(value.n) : `\\frac{${value.n}}{${value.d}}`;
}
