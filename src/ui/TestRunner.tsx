import { useEffect, useRef, useState } from 'react';
import { answerLabel, distribution, isCorrect } from '../engine/assemble';
import { assessments } from '../engine/assessments';
import { Fraction } from '../engine/fraction';
import type { GeneratedTest, Item } from '../engine/types';
import { beginAttempt, expireAttempt, finishAttempt, formatTime, recordAnswer, remainingSeconds } from './attempt';
import type { Preparation } from './attempt';
import { Figure, Icon, MathText } from './components';
import { TestSetup } from './TestSetup';
import type { PrepareTest } from './TestSetup';
import { testHref } from './routes';
import { useProgress } from './storage';

function KeyValue({ item }: { item: Item }) {
  const label = answerLabel(item);
  const text = item.data.kind === 'shape' || item.choices?.find(choice => choice.value === item.key)?.text;
  return text ? <>{label}</> : <MathText value={label.includes('/') && item.type === 'numeric' ? `\\frac{${label.split('/')[0]}}{${label.split('/')[1]}}` : label} />;
}

function Confirmation({ title, children, onCancel, onConfirm, confirmLabel, cancelLabel = 'Cancel' }: {
  title: string; children: React.ReactNode; onCancel: () => void; onConfirm: () => void; confirmLabel: string; cancelLabel?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog className="confirm-dialog" ref={ref} onCancel={event => { event.preventDefault(); onCancel(); }} aria-labelledby="confirm-title">
    <h2 id="confirm-title">{title}</h2>
    {children}
    <div className="button-row"><button className="button secondary" onClick={onCancel} autoFocus>{cancelLabel}</button><button className="button primary" onClick={onConfirm}>{confirmLabel}</button></div>
  </dialog>;
}

export function TestRunner({ test, preparation, onPrepare }: { test: GeneratedTest; preparation?: Preparation; onPrepare: PrepareTest }) {
  const { progress, setProgress, storageError, reset, blocked } = useProgress(test.code, test.items.length, preparation);
  const [view, setView] = useState<'question' | 'results'>(() => progress.submitted ? 'results' : 'question');
  const [confirm, setConfirm] = useState<'submit' | 'reset' | null>(null);
  const [now, setNow] = useState(Date.now);
  const [copyStatus, setCopyStatus] = useState('');
  const [copyError, setCopyError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const item = test.items[progress.currentIndex]!;
  const answer = progress.answers[item.id] ?? '';
  const answered = test.items.filter(entry => (progress.answers[entry.id] ?? '').trim() !== '').length;
  const timedAnswers = progress.expiredAnswers ?? progress.answers;
  const correct = test.items.filter(entry => isCorrect(entry, timedAnswers[entry.id] ?? '')).length;
  const practiceCorrect = test.items.filter(entry => isCorrect(entry, progress.answers[entry.id] ?? '')).length;
  const unanswered = test.items.filter(entry => !(timedAnswers[entry.id] ?? '').trim()).length;
  const category = test.blueprint.categories.find(entry => entry.id === item.category)!;
  const flagged = progress.flags.includes(item.id);
  const expired = progress.expiredAnswers !== null;
  const ready = progress.startedAt === null && !progress.submitted;
  const running = !ready && !progress.submitted && !expired;
  const showExpiry = expired && !progress.acknowledgedExpiry && !progress.submitted;
  const showFeedback = progress.submitted || (expired && progress.acknowledgedExpiry && answer.trim() !== '');
  const invalidNumeric = item.type === 'numeric' && answer.trim() !== '' && Fraction.parse(answer) === null;
  const seconds = remainingSeconds(progress, now);
  const assessmentId = test.code.split('.')[1]!;
  const assessment = assessments.find(entry => entry.id === assessmentId)!;

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [progress.currentIndex, view, ready]);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      setProgress(previous => expireAttempt(previous, time));
    };
    tick();
    const interval = window.setInterval(tick, 250);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [running, setProgress]);

  function navigate(index: number) {
    setProgress(previous => ({ ...expireAttempt(previous, Date.now()), currentIndex: index }));
    setView('question');
  }

  function start(code: string, durationMs: number) {
    if (code !== test.code) {
      onPrepare(code, durationMs, true);
      return;
    }
    const time = Date.now();
    setNow(time);
    setProgress(previous => beginAttempt(previous, time, durationMs));
    setView('question');
  }

  function finish() {
    setProgress(previous => finishAttempt(previous, Date.now()));
    setView('results');
    setConfirm(null);
  }

  function keepWorking() {
    setProgress(previous => ({ ...previous, acknowledgedExpiry: true }));
    setConfirm(null);
  }

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(`${label} copied`);
      setCopyError('');
    } catch (error) {
      setCopyError(`Could not copy: ${error instanceof Error ? error.message : String(error)}. Copy the code below or the address bar URL.`);
    }
  }

  return <div className="runner wrap">
    {storageError && <div className="error-message" role="alert">{storageError} {blocked && <button className="text-button" onClick={() => setConfirm('reset')}>Reset saved progress</button>}</div>}
    {copyError && <p className="error-message" role="alert">{copyError}</p>}
    <div className="runner-heading">
      <h1 ref={heading} tabIndex={-1}>{ready ? 'Test ready' : view === 'results' ? `${assessment.title} results` : progress.submitted ? `${assessment.title} review` : assessment.title}</h1>
      {progress.startedAt !== null && <div className={`timer ${expired ? 'expired' : seconds <= 60 && running ? 'low-time' : ''}`} role="timer" aria-live="off" aria-label={`Time remaining: ${formatTime(seconds)}`}>
        <span>{expired ? 'Time is up' : progress.submitted ? 'Time remaining at submission' : 'Time remaining'}</span>
        <strong>{formatTime(seconds)}</strong>
      </div>}
    </div>
    <div className="share-tools">
      <code className="test-code">{test.code}</code>
      <button className="icon-button" onClick={() => copy(test.code, 'Code')} aria-label="Copy test code" title="Copy test code"><Icon name="copy" /></button>
      <button className="icon-button" onClick={() => copy(`${window.location.href.split('#')[0]}${testHref(test.code)}`, 'Link')} aria-label="Copy test link" title="Copy test link"><Icon name="link" /></button>
      <span className="copy-status" role="status">{copyStatus}</span>
    </div>
    <section className="panel setup-panel" aria-label="Test controls">
      <TestSetup initialSeed={test.seed} initialAssessmentId={assessmentId} durationMs={progress.durationMs} onPrepare={onPrepare} onStart={ready ? start : undefined} active={!ready} />
      {ready && <p className="ready-details">{test.items.length} questions · {test.blueprint.totalPoints} points · no calculator. Start test begins the timer and reveals question 1.{answered > 0 && ` ${answered} saved answers will be retained.`}</p>}
    </section>

    {!ready && (view === 'results' ? <>
      <div className="result-summary">
        <strong className="score">{correct} / {test.blueprint.totalPoints}</strong>
        <span>{Math.round(correct / test.blueprint.totalPoints * 100)}% · {expired ? 'timed score' : 'raw score'}</span>
        <span>{correct} correct · {test.items.length - correct - unanswered} incorrect · {unanswered} {expired ? 'unanswered at time limit' : 'unanswered'}</span>
        {expired && <span className="practice-score">Practice answers: {practiceCorrect} / {test.items.length} correct, including work after the time limit. These do not change the timed score.</span>}
      </div>
      <div className="results-layout">
        <section className="panel category-panel" aria-labelledby="category-heading">
          <h2 id="category-heading">Score by skill</h2>
          {test.blueprint.categories.map(entry => {
            const items = test.items.filter(question => question.category === entry.id);
            const score = items.filter(question => isCorrect(question, timedAnswers[question.id] ?? '')).length;
            return <div className="category-result" key={entry.id}>
              <div><span>{entry.title}</span><strong>{score} / {items.length}</strong></div>
              <progress max={items.length} value={score} aria-label={`${entry.title}: ${score} out of ${items.length}`} />
            </div>;
          })}
        </section>
        <section className="panel review-panel" aria-labelledby="review-heading">
          <h2 id="review-heading">Review questions</h2>
          <div className="review-grid">{test.items.map((entry, i) => {
            const right = isCorrect(entry, timedAnswers[entry.id] ?? '');
            const blank = !(timedAnswers[entry.id] ?? '').trim();
            const status = right ? 'Correct' : blank ? 'Unanswered' : 'Incorrect';
            const practiceAnswer = progress.answers[entry.id] ?? '';
            return <button key={entry.id} className={`review-tile ${right ? 'correct' : blank ? 'unanswered' : 'incorrect'}`} onClick={() => navigate(i)} aria-label={`Review question ${i + 1}: ${status.toLowerCase()}`}>
              <strong>{i + 1}</strong><span>{status}</span>
              {expired && practiceAnswer.trim() && <small>Practice: {isCorrect(entry, practiceAnswer) ? 'correct' : 'incorrect'}</small>}
            </button>;
          })}</div>
        </section>
      </div>
      <div className="results-actions"><button className="button secondary" onClick={() => setConfirm('reset')}>Retake same test</button><a className="text-button" href="#/">Test setup</a></div>
    </> : <>
      {expired && <p className="time-up-notice" role="status">Time is up. Your timed score is fixed. You can keep answering for practice; questions unanswered at the time limit stay in that category.</p>}
      <div className="test-layout">
        <section className="question-card" aria-label={`Question ${progress.currentIndex + 1}`}>
          <div className="question-topline"><span className="question-number">Question {progress.currentIndex + 1} of {test.items.length}</span><span className="skill-tag">{category.short}</span>{progress.submitted && <button className="text-button" onClick={() => setView('results')}>Back to results</button>}</div>
          <h2 className="question-prompt">{item.prompt}</h2>
          {item.math && <MathText value={item.math} block />}
          {item.figure && <Figure figure={item.figure} />}
          <div className="answer-area">
            {item.type === 'mc' ? <fieldset className="choices" disabled={progress.submitted}><legend className="sr-only">Choose one answer</legend>
              {item.choices!.map(choice => <label className={`choice ${answer === choice.id ? 'chosen' : ''} ${showFeedback && choice.value === item.key ? 'choice-correct' : ''} ${showFeedback && answer === choice.id && choice.value !== item.key ? 'choice-wrong' : ''}`} key={choice.id}>
                <input type="radio" name={item.id} checked={answer === choice.id} value={choice.id} onChange={() => setProgress(previous => recordAnswer(previous, item.id, choice.id, Date.now()))} />
                <span className="choice-letter">{choice.id}</span><span>{item.data.kind === 'shape' || choice.text ? choice.label : <MathText value={choice.label} />}</span>
                {showFeedback && choice.value === item.key && <Icon name="check" />}
              </label>)}
            </fieldset> : <div className="numeric-entry">
              <label htmlFor={`answer-${item.id}`}>Your answer</label>
              <div className="numeric-input-row"><input id={`answer-${item.id}`} value={answer} disabled={progress.submitted} maxLength={80} autoComplete="off" spellCheck={false} placeholder="Number or fraction" aria-invalid={invalidNumeric} aria-describedby={`hint-${item.id}`} onChange={event => { const value = event.target.value; setProgress(previous => recordAnswer(previous, item.id, value, Date.now())); }} />{item.unit && <span>{item.unit}</span>}</div>
              <p id={`hint-${item.id}`} className={invalidNumeric ? 'error-text' : 'input-hint'}>{invalidNumeric ? 'Enter a whole number, decimal, or fraction. Do not include units.' : 'Equivalent fractions and exact decimals are accepted. For 1½, enter 3/2 or 1.5.'}</p>
            </div>}
          </div>
          {showFeedback && <div className={`solution-box ${isCorrect(item, answer) ? 'solution-correct' : ''}`} aria-live={progress.submitted ? 'off' : 'polite'}>
            <h3>{expired && !progress.submitted ? 'Practice answer: ' : 'Your answer: '}{!answer.trim() ? 'Unanswered' : isCorrect(item, answer) ? 'Correct' : 'Incorrect'}</h3>
            {expired && <p className="timed-status">Timed result: {!(timedAnswers[item.id] ?? '').trim() ? 'Unanswered at time limit' : isCorrect(item, timedAnswers[item.id] ?? '') ? 'Correct' : 'Incorrect'}. {progress.submitted && answer !== (timedAnswers[item.id] ?? '') && `Answer at time limit: ${timedAnswers[item.id] || 'none'}.`}</p>}
            <h3>Correct answer: <KeyValue item={item} /> {item.unit && <small>{item.unit}</small>}</h3>
            <p>{item.solution}</p>
            {item.type === 'mc' && item.choices?.find(choice => choice.id === answer)?.misconception && <p className="misconception">{item.choices.find(choice => choice.id === answer)!.misconception}</p>}
            <span className="standard-tag">Standard {item.standard}</span>
          </div>}
          <div className="question-footer"><span>1 point · {item.type === 'mc' ? 'Choose one answer' : 'Numeric entry'}</span>
            {!progress.submitted && <button className={`text-button flag-button ${flagged ? 'flagged' : ''}`} aria-pressed={flagged} onClick={() => setProgress(previous => ({ ...expireAttempt(previous, Date.now()), flags: flagged ? previous.flags.filter(id => id !== item.id) : [...previous.flags, item.id] }))}><Icon name="flag" />{flagged ? 'Flagged' : 'Flag for review'}</button>}
          </div>
          <div className="question-navigation">
            <button className="button secondary" onClick={() => navigate(progress.currentIndex - 1)} disabled={progress.currentIndex === 0}><Icon name="back" />Previous</button>
            {!progress.submitted && !answer.trim() && <button className="text-button skip-button" onClick={() => {
              const next = progress.currentIndex < test.items.length - 1 ? progress.currentIndex + 1 : test.items.findIndex(entry => entry.id !== item.id && !(progress.answers[entry.id] ?? '').trim());
              navigate(next >= 0 ? next : 0);
            }}>Skip question</button>}
            {progress.currentIndex < test.items.length - 1 ? <button className="button primary" onClick={() => navigate(progress.currentIndex + 1)}>Next<Icon name="arrow" /></button> : progress.submitted ? <button className="button primary" onClick={() => setView('results')}>Results</button> : <button className="button primary" onClick={() => setConfirm('submit')}>Finish test</button>}
          </div>
        </section>
        <aside className="question-sidebar">
          <div className="panel navigator"><div className="navigator-heading"><h2>Questions</h2><span>{answered}/{test.items.length} answered</span></div>
            <progress value={answered} max={test.items.length} aria-label={`${answered} of ${test.items.length} questions answered`} />
            <nav className="question-grid" aria-label="Question navigator">{test.items.map((entry, i) => {
              const hasAnswer = (progress.answers[entry.id] ?? '').trim() !== '';
              const flag = progress.flags.includes(entry.id);
              return <button className={`${i === progress.currentIndex ? 'active' : ''} ${hasAnswer ? 'answered' : ''}`} key={entry.id} aria-label={`Question ${i + 1}${hasAnswer ? ', answered' : ', unanswered'}${flag ? ', flagged' : ''}`} aria-current={i === progress.currentIndex ? 'step' : undefined} onClick={() => navigate(i)}>{i + 1}{flag && <span className="flag-dot" />}</button>;
            })}</nav>
            <p className="input-hint">Select any question to jump to it. Unanswered questions can be revisited.</p>
            <div className="nav-legend"><span><i className="answered-key" />Answered</span><span><i className="flag-key" />Flagged</span></div>
            {!progress.submitted && <button className="button secondary finish-button" onClick={() => setConfirm('submit')}>Finish test</button>}
            <p className="save-indicator">{storageError ? 'Progress not saved' : 'Progress saved in this browser'}</p>
          </div>
        </aside>
      </div>
    </> )}
    {new URLSearchParams(window.location.search).has('debug') && <details className="debug-panel"><summary>Assembly report</summary><pre>{JSON.stringify(distribution(test), null, 2)}</pre></details>}
    <details className="runner-disclaimer"><summary>Practice form details</summary><p>{test.blueprint.provenance.note} <a href={test.blueprint.provenance.sourceUrl} target="_blank" rel="noreferrer">MSDE reference</a></p></details>
    {showExpiry ? <Confirmation title="Time is up" cancelLabel="Keep working" confirmLabel="Quit & see results" onCancel={keepWorking} onConfirm={finish}>
      <p>The timed score is saved. {unanswered} questions were unanswered at the time limit and count as zero points.</p>
      <p>Keep working to check more answers for practice. Your timed score and unanswered-at-time-limit count will not change.</p>
    </Confirmation> : confirm === 'submit' ? <Confirmation title="Finish test?" cancelLabel="Keep working" onCancel={() => setConfirm(null)} confirmLabel="Submit & see results" onConfirm={finish}>
      <p>{answered} of {test.items.length} questions answered. {expired ? 'The timed score uses answers saved at the time limit.' : 'Unanswered questions receive zero points.'} You cannot edit answers after submitting.</p>
    </Confirmation> : confirm === 'reset' && <Confirmation title="Reset this attempt?" onCancel={() => setConfirm(null)} confirmLabel="Reset test" onConfirm={() => { if (reset()) { setView('question'); setNow(Date.now()); } setConfirm(null); }}>
      <p>Saved answers, scores, and the timer for this code will be reset. Questions stay hidden until Start test is clicked.</p>
    </Confirmation>}
  </div>;
}
