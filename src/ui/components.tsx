import katex from 'katex';
import type { Figure as FigureSpec } from '../engine/types';

export function MathText({ value, block = false }: { value: string; block?: boolean }) {
  const html = katex.renderToString(value, { output: 'htmlAndMathml', displayMode: block, throwOnError: true, trust: false });
  return <span className={block ? 'math-block' : 'math-inline'} dangerouslySetInnerHTML={{ __html: html }} />;
}

const paths = {
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  back: 'M20 12H4m6-6-6 6 6 6',
  shuffle: 'm16 3 4 4-4 4M4 7h3c4 0 6 10 10 10h3m-4-4 4 4-4 4M4 17h3c1.5 0 3-2 4-4m2-2c1-2 2.5-4 4-4h3',
  copy: 'M9 9h11v11H9zM15 9V4H4v11h5',
  check: 'm5 12 4 4L19 6',
  flag: 'M5 21V4c5-4 9 4 14 0v10c-5 4-9-4-14 0',
  lock: 'M5 10h14v11H5zM8 10V6a4 4 0 0 1 8 0v4',
  book: 'M3 4c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2zM12 6v15',
  close: 'm6 6 12 12M6 18 18 6',
  link: 'm10 14 4-4M8 16l-2 2a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 1 2-2a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0',
} as const;

export function Icon({ name }: { name: keyof typeof paths }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

export function Brand() {
  return <a className="brand" href="#/" aria-label="MCAP Math home">MCAP Math</a>;
}

export function Figure({ figure }: { figure: FigureSpec }) {
  if (figure.kind === 'box') {
    const description = `Rectangular prism, length ${figure.length} cm, width ${figure.width} cm, height ${figure.height ?? 'unknown'} cm. Diagram not to scale.`;
    return <figure className="figure">
      <svg viewBox="0 0 360 230" role="img" aria-label={description}>
        <path d="m80 75 70-40 140 0-70 40z" fill="#f1f3f5" stroke="#475569" strokeWidth="2" />
        <path d="M80 75h140v100H80z" fill="#fafafa" stroke="#475569" strokeWidth="2" />
        <path d="m220 75 70-40v100l-70 40z" fill="#e2e6ec" stroke="#475569" strokeWidth="2" />
        <text x="150" y="202" textAnchor="middle">{figure.length} cm</text>
        <text x="277" y="174">{figure.width} cm</text>
        <text x="43" y="129" textAnchor="middle">{figure.height ?? '?'} cm</text>
      </svg>
      <figcaption>Diagram not to scale</figcaption>
    </figure>;
  }
  if (figure.kind === 'coordinate') {
    const scale = 27;
    return <figure className="figure coordinate">
      <svg viewBox="0 0 310 285" role="img" aria-label={`Coordinate plane with axes from 0 to 8. Point P is ${figure.x} units to the right and ${figure.y} units up from the origin.`}>
        {Array.from({ length: 9 }, (_, i) => <g key={i}>
          <path d={`M45 ${245 - i * scale}H261M${45 + i * scale} 29V245`} stroke="#dce0e5" />
          <text x={45 + i * scale} y="265" textAnchor="middle" fontSize="12">{i}</text>
          {i > 0 && <text x="31" y={249 - i * scale} textAnchor="middle" fontSize="12">{i}</text>}
        </g>)}
        <path d="M45 21v224h225" stroke="#475569" strokeWidth="2" fill="none" />
        <text x="280" y="250" fontStyle="italic">x</text><text x="40" y="16" fontStyle="italic">y</text>
        <circle cx={45 + figure.x * scale} cy={245 - figure.y * scale} r="6" fill="#1a5bbf" />
        <text x={57 + figure.x * scale} y={239 - figure.y * scale} fontWeight="700">P</text>
      </svg>
    </figure>;
  }
  return <figure className="figure">
    <svg viewBox="0 0 380 205" role="img" aria-label={`Ribbon lengths in meters. ${figure.counts.map((count, i) => `${count} ribbons of length ${i + 1}/${figure.denominator}`).join('; ')}.`}>
      <path d="M35 140h310" stroke="#475569" strokeWidth="2" />
      {figure.counts.map((count, i) => <g key={i}>
        <path d={`M${70 + i * 80} 134v12`} stroke="#475569" strokeWidth="2" />
        <text x={70 + i * 80} y="165" textAnchor="middle">{i + 1 === figure.denominator ? '1' : `${i + 1}/${figure.denominator}`}</text>
        {Array.from({ length: count }, (_, j) => <circle key={j} cx={70 + i * 80} cy={115 - j * 24} r="7" fill="#475569" />)}
      </g>)}
      <text x="190" y="194" textAnchor="middle" fontSize="13">Ribbon length (meters)</text>
    </svg>
  </figure>;
}
