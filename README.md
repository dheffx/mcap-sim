# MCAP Math Practice

A static, local-first math practice app. The first edition implements the foundation and a Grade 5 vertical slice from [PLAN.md](PLAN.md).

**Live site:** https://dheffx.github.io/mcap-sim/

See [How it works](HOW_IT_WORKS.md) for the technical explanation of seeded question generation, exact grading, wrong-answer feedback, and timed versus continued-practice scoring.

## Run locally

Requires Node.js 22.12+ (or 24+) and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://127.0.0.1:5173`). No accounts, API keys, or backend are required.

```sh
npm test
npm run lint
npm run build
npm run fuzz -- 10000
npm run coverage:blueprint
```

`npm run preview` serves the production build. The site uses hash routing and relative assets, so `dist/` also works under a GitHub Pages repository subpath. Pushes to `main` run the included check/deploy workflow and publish to GitHub Pages. For another repository, enable **Settings → Pages → Source: GitHub Actions** and update the workflow branch if its default branch is not `main`.

## What works

- Grade 5 legacy MCAP-inspired practice: 20 original templates across five standards domains, with exactly 10 multiple-choice and 10 numeric items.
- Per-slot seeded RNG, independent option streams, exact BigInt rational math, a separate answer verifier, and immutable versioned share codes such as `BAYTRAIL.g5.p1.v1`.
- Keyboard-operable question navigation, flags, browser-saved answers, resume, submission confirmation, domain-level raw scores, worked solutions, and misconception feedback.
- A configurable timer (15-minute default). New random tests and submitted seeds reset the attempt and hide questions until **Start test**. Skipping and the question grid let you return to unanswered items.
- At the time limit, a dialog offers **Quit & see results** or **Keep working**. The timed answer snapshot and unanswered-at-time-limit count are fixed; further answers get practice feedback without changing the final timed score.
- Fraction/decimal-equivalent numeric answers, accessible SVG diagrams, locally bundled KaTeX/MathML, mobile layout, and larger question text.
- Property tests, version-pinned golden hashes, a fuzz runner, coverage report, and CI on two Node versions.

Append `?debug` **before** the hash to inspect assembly counts, for example `/?debug#/t/BAYTRAIL.g5.p1.v1`.

## Important scope limits

**`p1` is an app-defined practice blueprint, not a transcribed official MCAP blueprint.** Its fixed quotas are 6 base-ten, 6 fraction, 2 algebraic-thinking, 4 measurement/data, and 2 geometry questions, all worth one point, with an internal 6/10/4 difficulty mix. Difficulty is not calibrated.

The [live MSDE assessment page](https://msde.maryland.gov/academics-0/mathematics) currently lists MSTAR blueprints for grades 3–8 and MCAP blueprints for high school. A legacy Grade 5 official PDF has **not** been verified/transcribed. Do not relabel this practice form as an official fixed-form simulation. Official reporting-category, subclaim, item-type, and point quotas, constructed responses, calculator-section rules, full standards coverage, teacher content review, and cross-browser calibration remain future work. No official scale score or performance level is predicted.

Grade 8 legacy MCAP, Grade 5 MSTAR, and Algebra I MCAP are visible but disabled in the assessment selector. To enable an assessment, register a real blueprint in `src/engine/blueprint/` and supply compatible slots and templates; the test runner consumes the shared `GeneratedTest` model.

All generation lives in DOM-free `src/engine/`. Each item is independently re-solved from the data used to display its problem before it can be returned. Golden hashes protect current output. Any change to template content, assembly, RNG, choices, or blueprint data that changes a shared test must deliberately bump `GENERATOR_VERSION` and the corresponding golden fixtures. Unsupported version codes show an explicit error rather than silently creating a different test.

Progress and timer state are stored under the **full versioned test code** in this browser's `localStorage`. Refreshing or closing the tab does not pause an active timer. Sharing includes the test identity, never answers or the clock. **New test** and **Use seed** prepare a fresh attempt; retaking the same test also resets its timer after confirmation. Questions stay hidden until starting. Existing untimed saves retain their answers and can be started with the new timer. Malformed saved progress is reported and is not automatically overwritten; the UI offers an explicit reset.

This project is independent of MSDE. All generated questions are original.
