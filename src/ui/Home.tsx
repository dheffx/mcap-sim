import { useState } from 'react';
import { grade5 } from '../engine/blueprint/g5';
import { TestSetup } from './TestSetup';
import type { PrepareTest } from './TestSetup';
import { testHref } from './routes';
import { readLastTest } from './storage';

export function Home({ onPrepare }: { onPrepare: PrepareTest }) {
  const [last] = useState(readLastTest);
  return <div className="home wrap">
    <h1>Math practice</h1>
    <p className="muted">Grade 5 · 20 questions · multiple choice and numeric entry</p>
    <section className="panel" aria-label="Test setup"><TestSetup onPrepare={onPrepare} showAssessment /></section>
    {last.code && <p className="resume-row"><a href={testHref(last.code)}>Resume last test</a><code>{last.code}</code></p>}
    {last.error && <p className="error-message" role="alert">{last.error}</p>}
    <p className="disclaimer">Original practice questions, not an official MCAP exam. The practice blueprint does not reproduce official item quotas. <a href={grade5.provenance.sourceUrl} target="_blank" rel="noreferrer">MSDE resources</a>.</p>
  </div>;
}
