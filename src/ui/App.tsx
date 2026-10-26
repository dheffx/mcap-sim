import { useEffect, useMemo, useState } from 'react';
import { Brand } from './components';
import { Home } from './Home';
import { resolveRoute } from './routes';
import { TestRunner } from './TestRunner';
import type { Preparation } from './attempt';
import { testHref } from './routes';

export function App() {
  const [hash, setHash] = useState(window.location.hash);
  const [preparation, setPreparation] = useState<(Preparation & { code: string }) | undefined>();
  useEffect(() => {
    const update = () => setHash(window.location.hash);
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  const route = useMemo(() => resolveRoute(hash), [hash]);

  function prepareTest(code: string, durationMs: number, start = false) {
    setPreparation({ code, durationMs, id: crypto.randomUUID(), startedAt: start ? Date.now() : null });
    setHash(testHref(code));
    window.location.hash = testHref(code);
  }

  return <div className="app">
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>Skip to content</a>
    <header className="site-header"><div className="wrap header-inner"><Brand /><nav aria-label="Main navigation"><a href="https://github.com/dheffx/mcap-sim/blob/main/HOW_IT_WORKS.md" target="_blank" rel="noreferrer">How it works</a></nav></div></header>
    <main id="main-content" tabIndex={-1}>
      {route.kind === 'home' ? <Home onPrepare={prepareTest} /> : route.kind === 'error' ? <section className="wrap route-error"><h1>Could not open test</h1><p role="alert">{route.message}</p><a className="button primary" href="#/">Test setup</a></section> : <TestRunner key={`${route.test.code}:${preparation?.code === route.test.code ? preparation.id : ''}`} test={route.test} preparation={preparation?.code === route.test.code ? preparation : undefined} onPrepare={prepareTest} />}
    </main>
  </div>;
}
