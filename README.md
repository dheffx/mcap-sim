# MCAP Math Practice

A static, local-first math practice app with Grade 5 legacy MCAP, Grade 8 legacy MCAP, Grade 5 MSTAR, and Algebra I MCAP-inspired practice forms from [PLAN.md](PLAN.md).

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

- Four selectable assessments, each with 20 one-point questions: exactly 10 multiple-choice and 10 numeric items. There are 70 unique templates; MSTAR reuses 10 Grade 5 content templates and adds 10 modeling/reasoning templates.
- Grade 8 includes roots, exponents, equations, systems, functions, coordinate graphs, geometry, and statistics. Algebra I adds polynomials, factoring, quadratics, inequalities, exponential models, and data analysis.
- Grade 5 MSTAR-inspired practice reports content, modeling, and reasoning separately, including applied measurement, multistep costs, and misconception explanations.
- Per-slot seeded RNG, independent option streams, exact BigInt rational math, a separate answer verifier, and immutable versioned share codes such as `BAYTRAIL.g5.p1.v1`.
- Keyboard-operable question navigation, flags, browser-saved answers, resume, submission confirmation, domain-level raw scores, worked solutions, and misconception feedback.
- A configurable timer (15-minute default). New random tests and submitted seeds reset the attempt and hide questions until **Start test**. Test settings are collapsible and close automatically when starting. Skipping and the question grid let you return to unanswered items.
- At the time limit, a dialog offers **Quit & see results** or **Keep working**. The timed answer snapshot and unanswered-at-time-limit count are fixed; further answers get practice feedback without changing the final timed score.
- Fraction/decimal-equivalent numeric answers (including negatives), mathematical and text answer choices, accessible SVG diagrams and scatter plots, locally bundled KaTeX/MathML, and a mobile layout.
- Property tests, version-pinned golden hashes, a fuzz runner, coverage report, and CI on two Node versions.

Append `?debug` **before** the hash to inspect assembly counts, for example `/?debug#/t/BAYTRAIL.g5.p1.v1`.

## Important scope limits

**Every `p1` form is an app-defined practice blueprint, not a transcribed official MCAP or MSTAR blueprint.** All use an internal 6 easy / 10 medium / 4 hard mix. Difficulty is not calibrated.

| Code | Practice form | App-defined question counts |
|------|---------------|-----------------------------|
| `g5` | Grade 5 legacy MCAP | Base ten 6; fractions 6; algebraic thinking 2; measurement/data 4; geometry 2 |
| `g8` | Grade 8 legacy MCAP | Number system 3; equations 6; functions 4; geometry 5; statistics 2 |
| `g5-mstar` | Grade 5 MSTAR | Content 10; modeling 6; reasoning 4 |
| `alg1` | Algebra I MCAP | Number/quantity 2; algebra 8; functions 6; statistics 4 |

The [live MSDE assessment page](https://msde.maryland.gov/academics-0/mathematics) currently lists MSTAR blueprints for grades 3–8 and MCAP blueprints for high school. Official PDFs have **not** been verified/transcribed into these forms. Do not relabel them as official fixed-form simulations. Official reporting-category, subclaim, item-type, and point quotas, constructed responses, calculator-section rules, full standards coverage, teacher content review, and cross-browser calibration remain future work. MSTAR reasoning is auto-gradable practice, not written justification or official rubric scoring. No official scale score or performance level is predicted.

Select an assessment before generating a random test or entering a plain seed. A full test code selects its encoded assessment. Changing the selector after pasting a full code keeps its seed but switches the assessment. The same seed in different assessments creates different tests; the full code pins the identity. Examples: `BAYTRAIL.g8.p1.v1`, `BAYTRAIL.g5-mstar.p1.v1`, and `BAYTRAIL.alg1.p1.v1`.

Each assessment is registered in `src/engine/assessments.ts`, with blueprint data in `src/engine/blueprint/` and compatible templates in `src/engine/templates/`. The test runner consumes the shared `GeneratedTest` model. Each form currently uses the same 20 template types in the same order; seeds vary parameters and choice order rather than selecting from a larger question bank. The fuzz command checks the requested seed count **per assessment**.

All generation lives in DOM-free `src/engine/`. Each item is independently re-solved from the data used to display its problem before it can be returned. Golden hashes protect current output. Any change to template content, assembly, RNG, choices, or blueprint data that changes a shared test must deliberately bump `GENERATOR_VERSION` and the corresponding golden fixtures. Unsupported version codes show an explicit error rather than silently creating a different test.

Progress and timer state are stored under the **full versioned test code** in this browser's `localStorage`. Refreshing or closing the tab does not pause an active timer. Sharing includes the test identity, never answers or the clock. **New test** and **Use seed** prepare a fresh attempt; retaking the same test also resets its timer after confirmation. Questions stay hidden until starting. Existing untimed saves retain their answers and can be started with the new timer. Malformed saved progress is reported and is not automatically overwritten; the UI offers an explicit reset.

This project is independent of MSDE. All generated questions are original.
