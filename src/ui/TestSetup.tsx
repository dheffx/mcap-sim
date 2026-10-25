import { useState } from 'react';
import { generateTest, makeCode } from '../engine/assemble';
import { assessments } from '../engine/blueprint/g5';
import { DEFAULT_DURATION_MS, durationFromMinutes } from './attempt';
import { Icon } from './components';

export type PrepareTest = (code: string, durationMs: number, start?: boolean) => void;

export function randomSeed(): string {
  const values = crypto.getRandomValues(new Uint8Array(8));
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(values, value => alphabet[value % alphabet.length]).join('');
}

export function TestSetup({ initialSeed = '', durationMs = DEFAULT_DURATION_MS, onPrepare, onStart, showAssessment = false, active = false }: {
  initialSeed?: string;
  durationMs?: number;
  onPrepare: PrepareTest;
  onStart?: (code: string, durationMs: number) => void;
  showAssessment?: boolean;
  active?: boolean;
}) {
  const [seed, setSeed] = useState(initialSeed);
  const [minutes, setMinutes] = useState(String(durationMs / 60000));
  const [error, setError] = useState('');

  function submit(mode: 'seed' | 'random' | 'start') {
    try {
      const duration = durationFromMinutes(minutes);
      const code = mode === 'random' || !seed.trim()
        ? makeCode(randomSeed())
        : seed.includes('.') ? generateTest(seed.trim()).code : makeCode(seed);
      setError('');
      if (mode === 'start' && onStart) onStart(code, duration);
      else onPrepare(code, duration);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  return <div className="test-setup">
    <form className="setup-form" onSubmit={event => { event.preventDefault(); submit('seed'); }}>
      {showAssessment && <label className="assessment-select">Assessment<select defaultValue="g5">
        {assessments.map(assessment => <option key={assessment.id} value={assessment.id} disabled={assessment.status !== 'available'}>{assessment.title} — {assessment.subtitle}</option>)}
      </select></label>}
      <label className="seed-field">Seed or test code<input name="seed" value={seed} maxLength={65} autoCapitalize="characters" spellCheck={false} placeholder="Enter a seed, or generate a random test" onChange={event => { setSeed(event.target.value); setError(''); }} /></label>
      <label className="duration-field">Minutes<input name="minutes" type="number" min="1" step="1" value={minutes} onChange={event => { setMinutes(event.target.value); setError(''); }} /></label>
      <div className="setup-actions">
        <button className="button secondary" type="submit" disabled={!seed.trim()}>Use seed</button>
        <button className="button secondary" type="button" onClick={() => submit('random')}><Icon name="shuffle" />New test</button>
      </div>
    </form>
    {error && <p role="alert" className="error-message">{error}</p>}
    {onStart && <button className="button primary start-button" onClick={() => submit('start')}>Start test <Icon name="arrow" /></button>}
    <p className="input-hint">{active ? 'New test or Use seed resets this attempt and timer. ' : 'Questions stay hidden until you click Start test. '}The time limit applies to the next start.</p>
  </div>;
}
