# MCAP Math Test Simulator — Project Plan

A static, backend-free website that generates realistic Maryland MCAP-style math tests from a seed. Same seed → identical test for everyone. Deployable to GitHub Pages.

---

## 1. Goals and hard constraints

| # | Constraint | What it means in practice |
|---|-----------|---------------------------|
| 1 | **Deterministic by seed** | Seed + grade/course + generator version fully determines the test. No `Math.random()`, no `Date.now()`, no unordered iteration anywhere in generation. |
| 2 | **Answers always valid** | Every question's answer key is computed, then independently verified. Bad questions are impossible to ship, not just unlikely. |
| 3 | **Consistent distribution** | Every generated test hits the official blueprint quotas exactly (by reporting category, item type, and point value), not "on average". |
| 4 | **Realistic content** | Contexts, numbers, wording, figures and item formats modeled on MSDE public blueprints, evidence statements and released items. |
| 5 | **No backend** | Pure static site. Everything (state, progress, history) lives in the URL or `localStorage`. |

### Non-goals (v1)
- Not affiliated with or a copy of real MCAP items. All items are original/generated.
- No accounts, leaderboards, teacher dashboards, or server-side score storage.
- No true computer-adaptive engine (see §9, open questions).

---

## 2. Heads-up: MCAP → MSTAR transition

Per MSDE's July 2026 release, the 2025–26 year was the final full MCAP administration for grades 3–8. Starting with the Spring 2027 window, grades 3–8 math moves to **MSTAR** (shorter, new blueprints with Content / Modeling / Reasoning reporting categories). High school (Algebra I etc.) stays on MCAP for now.

**Decision needed:** target the MCAP blueprint (legacy, well documented), MSTAR (current), or both via a blueprint toggle. The architecture below makes the blueprint a data file, so supporting both is cheap. See §9.

---

## 3. Recommended tech stack

- **Vite + TypeScript** → static build in `dist/`, deployed by a GitHub Actions workflow to GitHub Pages.
- **Framework:** Preact or React (small, component-friendly). Svelte is also fine. Pick one; nothing in the generator depends on it.
- **Math rendering:** KaTeX (fast, offline, no server).
- **Figures:** generated as inline **SVG** by code (number lines, bar/line graphs, dot plots, shapes, coordinate grids, tape diagrams). Deterministic and crisp, no image assets.
- **Routing:** hash-based (`/#/t/...`) because GitHub Pages has no server rewrites.
- **Testing:** Vitest + fast-check (property-based tests) — this is the backbone of the "answers always valid" guarantee.
- **Repo layout** (monorepo-lite, single package):

```
mcap-sim/
├─ PLAN.md
├─ src/
│  ├─ engine/          # pure TS, zero DOM. Fully unit-testable, runs in Node.
│  │  ├─ rng.ts        # seeded PRNG + substream derivation
│  │  ├─ assemble.ts   # blueprint → slots → items
│  │  ├─ blueprint/    # per-grade/course JSON/TS blueprint data
│  │  ├─ templates/    # question templates, grouped by domain/standard
│  │  ├─ verify.ts     # independent answer verification
│  │  └─ types.ts
│  ├─ ui/              # test-taking UI, review, results
│  └─ main.tsx
├─ tests/              # property tests, golden tests, distribution tests
├─ scripts/            # fuzz runner, blueprint-coverage report
└─ .github/workflows/  # test + deploy to Pages
```

Keeping `engine/` DOM-free is important: we can fuzz-test 100k seeds in Node in CI.

---

## 4. Seeded RNG design (the determinism core)

### 4.1 PRNG
- Hash the seed string to 128 bits (cyrb128 / xmur3), feed a small fast PRNG (sfc32 or mulberry32).
- Wrap in a typed API: `int(min,max)`, `pick(arr)`, `shuffle(arr)`, `weighted(...)`, `decimal(places)`, `fraction(...)`, `coprimePair(...)`.
- **Never** use JS engine-specific behavior (`Math.random`, `Array.sort` with inconsistent comparators, object key order assumptions, floating-point that differs across engines).

### 4.2 Independent substreams (critical)
Derive a separate RNG per slot: `rng(slot) = PRNG(hash(seed, version, gradeId, slotIndex))`.

Why: if question 7 draws one extra random number, question 8 must not change. Substreams mean template tweaks only affect the questions that use those templates, and adding a template doesn't reshuffle the whole test.

### 4.3 Versioning
The shareable code must pin everything that affects output:

```
<seed>.<gradeOrCourse>.<blueprintVersion>.<generatorVersion>
e.g.  K7XQ2M.g5.b2022.v1
```

- Bump `generatorVersion` whenever any template/assembly logic changes output for existing seeds.
- Keep old generator versions loadable **or** show "this seed was made with an older version" gracefully. Decision for v1: tests are frozen per version tag; old versions are kept in `engine/legacy/` only if cheap, otherwise unsupported with a clear message.
- Share URL: `https://<user>.github.io/mcap-sim/#/t/K7XQ2M.g5.b2022.v1`

### 4.4 Floating point
Avoid floats for answer keys. Use **integers and exact rationals** (BigInt-backed or a small `Fraction` class) for all math. Decimals are generated as integers scaled by a power of 10. This guarantees cross-browser identical results and exact answer checking.

---

## 5. Test assembly: blueprint-driven, exact quotas

This is how we meet "distribution is similar across simulations."

1. **Blueprint as data.** For each grade/course, encode from MSDE's public blueprints:
   - reporting categories / domains and **item counts per category**
   - subclaims (e.g., Reasoning, Modeling)
   - item types and counts (1-pt machine-scored, 3-pt and 4-pt constructed response, etc.)
   - total points
   - standard clusters (e.g., `8.G.C`) eligible per category
2. **Build slots first, fill later.** Assembly produces a fixed list of slots (e.g., "Slot 12: Geometry, cluster 8.G.C, 1-pt, type=numeric entry"), whose *counts* exactly match the blueprint. Randomness only decides *which* template/cluster satisfies each slot and the numbers inside it, never how many slots of each kind exist.
3. **Controlled variety.** Within a category, use stratified/round-robin selection over standards so one test doesn't show 5 variants of the same skill and zero of another. No duplicate template in one test unless the blueprint demands it; avoid near-duplicate numbers.
4. **Difficulty mix.** Tag every template with a difficulty tier (e.g., 1–3). Each slot requests a tier according to a target mix (e.g., ~30/50/20), so tests feel similar in difficulty.
5. **Ordering.** Fixed, blueprint-like ordering rules (e.g., CR items at specified positions or in a separate section, then shuffle within groups using the slot RNG).
6. **Assembly report.** Every test can emit a debug summary (counts by category/type/difficulty) — used in tests and in a hidden `?debug` panel.

> Blueprints must be transcribed from the official PDFs (MSDE "MCAP Public Blueprint" per grade, plus the Evidence Statements). Treat those documents as the source of truth; this plan intentionally doesn't hard-code numbers.

---

## 6. Question templates

### 6.1 Template interface (sketch)

```ts
interface Template {
  id: string;                 // "g5.nbt.mult-decimals.v1"
  standards: string[];        // ["5.NBT.B.7"]
  category: CategoryId;
  itemType: ItemType;         // mc | multi | numeric | equation | dragdrop | hotspot | table | cr
  points: 1 | 2 | 3 | 4;
  difficulty: 1 | 2 | 3;
  generate(rng: Rng, ctx: GenCtx): Item;   // returns stem, figure, options, answer spec, rationale
}

interface Item {
  stem: RichText;             // text + KaTeX + SVG
  figure?: Svg;
  response: ResponseSpec;     // how the student answers
  key: AnswerKey;            // structured, machine-checkable
  distractors?: Distractor[]; // each tagged with the misconception it models
  solution: RichText;        // worked solution shown in review
  rubric?: Rubric;           // for CR
}
```

### 6.2 "Answers always valid" — a layered guarantee
1. **Construct backwards.** Pick the answer/structure first, then derive the problem (e.g., choose the quotient and divisor, then build the dividend). Result: clean, realistic numbers and a known-correct key by construction.
2. **Constraint checks inside the template.** Reject-and-redraw loops (bounded, deterministic) for: no negative lengths, integer results where required, distinct distractors, no distractor equal to the key, values in realistic ranges, no degenerate triangles, etc.
3. **Independent verifier.** A separate function re-solves each item from its *stem data* (not by reusing the template's own key math) and compares. Different code path = catches template bugs.
4. **Property-based fuzzing in CI.** For each template: generate 10k+ seeds, assert: key verifies; exactly one correct MC option (or exactly N for multi-select); distractors unique; no `NaN`/`Infinity`; text has no unresolved placeholders; numbers within configured ranges; SVG renders without error.
5. **Whole-test fuzzing.** Generate 5k–50k random full tests per grade in CI, assert blueprint quotas exactly and run all item checks.
6. **Golden tests.** A handful of pinned seeds with snapshot output. Any diff forces a deliberate `generatorVersion` bump.
7. **Self-grading consistency.** Grading functions are tested against the generated key *and* against hand-built wrong answers to ensure wrong answers fail.

### 6.3 Realism
- **Source material:** MSDE released/sample items and evidence statements for the style, wording, contexts, and number ranges. Use them as *inspiration for structure only*; write original problems.
- **Number realism rules per standard** (e.g., "5.NF: denominators ≤ 12, mixed numbers with whole part ≤ 9") stored next to each template.
- **Context bank:** realistic Maryland-flavored, grade-appropriate contexts (school store, bake sale, bus routes, recycling drive, Chesapeake Bay, etc.), swapped by RNG, with units/plurals handled correctly by helper utilities.
- **Language review:** a reading-level and wording checklist per grade; templates reviewed once by a human (ideally a teacher/parent) before being enabled.
- **Distractors from misconceptions** (e.g., forgetting to carry, adding denominators, mixing up area/perimeter) mirrors real test design and makes review useful.

### 6.4 Item types to support (MCAP/PARCC lineage)
| Type | Notes |
|------|-------|
| Multiple choice (single) | A–D |
| Multiple select | "Select all that apply", exact-match or partial credit per rubric |
| Numeric / short entry | Normalize equivalents (`0.5` vs `1/2` when allowed) |
| Equation / expression entry | Symbolic equivalence check (small custom checker or `mathjs`) |
| Drag-and-drop / ordering | Categorize, order numbers, match |
| Hot spot / graph | Click points on number line or grid, plot on coordinate plane |
| Table completion | Fill cells |
| Constructed response (3–4 pt, multi-part) | Typed response + **self-scoring against a rubric and model answer** (can't machine-score reasoning). Parts with numeric answers can still be auto-checked. |

Item type rollout is phased (§8). Everything in v1 should be auto-gradable except CR, which uses self-scoring.

---

## 7. Front-end experience

- **Home:** choose grade/course, optionally enter a seed or "random seed"; shows shareable link. Also "Retake same test" and "New variation".
- **Test runner:** one item per screen like the real exam; flag-for-review, navigator drawer, section breaks, optional timer (off by default, configurable), on-screen calculator only where the real test offers one (verify per grade/section).
- **Persistence:** answers saved to `localStorage` keyed by full test code so refresh/close doesn't lose progress. No data leaves the browser.
- **Results:** score by reporting category (and subclaim), per-item review with worked solution, correct answer, and the misconception behind the chosen wrong option. Mirror the real score-report categories, but don't claim an official scale score. Show raw score and an *approximate* performance indicator clearly labeled unofficial.
- **Sharing:** copy link / copy code. Optionally a printable PDF-friendly view (browser print CSS), no server needed.
- **Accessibility:** keyboard navigation, screen-reader-friendly math (KaTeX MathML output), high contrast, font size controls, SVG alt text. Real MCAP is accessibility-heavy; this matters.
- **Mobile/tablet friendly:** many students will use Chromebooks and iPads.

---

## 8. Phased roadmap

**Phase 0 — Foundations**
- Repo, Vite/TS scaffold, CI (lint, typecheck, test), Pages deploy workflow, `PLAN.md`.
- PRNG + substreams + `Fraction` class with tests, determinism tests across Node versions.

**Phase 1 — Vertical slice (one grade, ~10 templates)**
- Encode one grade's blueprint as data (suggest Grade 5 or Grade 8 as pilot).
- Types: MC, numeric entry. Assembly with exact quotas. Verifier + property tests.
- Minimal UI: take test, results page, shareable seed link.

**Phase 2 — Depth for the pilot grade**
- Full template coverage for every cluster in the blueprint; multiple templates per cluster.
- Multi-select, equation entry, drag-drop, hot-spot; SVG figure library.
- Constructed-response with rubric self-score.
- Coverage report script: which standards have how many templates.

**Phase 3 — Quality hardening**
- Fuzz at scale in CI; difficulty calibration; duplicate/near-duplicate detection; human review pass of all templates; accessibility audit.

**Phase 4 — Expand grades/courses**
- Add remaining grades 3–8, then Algebra I (and Geometry/Algebra II if wanted). Mostly new blueprint data + templates; engine unchanged.

**Phase 5 — Polish**
- Progress history, "practice by standard" mode (free practice from a single category), printable view, PWA/offline support (service worker, still no backend).

---

## 9. Open questions (need your input)

1. **Grade/course scope for v1?** (e.g., a specific grade, or Algebra I). This decides the pilot blueprint and templates.
2. **MCAP vs MSTAR** for grades 3–8 (see §2), or support a blueprint toggle?
3. **Fixed-form vs adaptive feel.** Real MCAP math is computer-adaptive, but the same blueprint also governs fixed forms (MSDE says fixed-form tests follow the same blueprint). Plan assumes **fixed-form** simulation. An adaptive mode could be a later add-on using difficulty tiers.
4. **Constructed response** — self-scored with rubric is the plan. Okay, or skip CR in v1?
5. **Who's the audience?** (your kid/students, a class, public) — affects polish, tone, and whether to add print/teacher features.
6. **Calculator policy.** Which grades/sections get an on-screen calculator (verify with MSDE docs).
7. **Hosting name/repo visibility** — public repo is needed for free GitHub Pages on most plans.

---

## 10. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Generated item is wrong/ambiguous | Construct-backwards, independent verifier, property tests, human review, golden tests |
| Seed output changes after a code change | Versioned share codes, golden snapshots, CI failure on unplanned diffs |
| Tests feel unlike the real thing | Template review against MSDE evidence statements/released items; difficulty tiers; teacher/parent feedback |
| Cross-browser float or sort differences | Integers/rationals only; deterministic comparators; Node + browser parity tests |
| Template count too low → repetitive tests | Track coverage report; target several templates per standard cluster |
| Copyright | Only original generated items; use official documents as structural reference, never copy items |
| Blueprint changes (MSTAR) | Blueprint-as-data, versioned |

---

## 11. Immediate next steps
1. Answer the open questions in §9 (esp. #1 and #2).
2. Transcribe the pilot grade's blueprint into `src/engine/blueprint/`.
3. Build Phase 0 + Phase 1 vertical slice.
