# How question generation, grading, and feedback work

The app is a deterministic template engine, not an AI generating questions or grading answers live. The question patterns, solution instructions, and misconception feedback are written in TypeScript. Everything runs in the browser; there are no AI calls or backend services.

## 1. Questions come from programmed templates

The templates live in [`src/engine/templates/`](src/engine/templates/), grouped into Grade 5, Grade 8, MSTAR, and Algebra I modules and combined in [`index.ts`](src/engine/templates/index.ts). Each template defines:

- The skill and standard it covers.
- Allowed number ranges.
- How to construct the question and calculate its answer.
- A worked solution using those same numbers.
- Some plausible wrong answers and associated feedback.

For example, the pencil question follows this pattern (simplified pseudocode):

```ts
boxes = rng.int(12, 48);
pencilsPerBox = rng.int(12, 29);

correctAnswer = boxes * pencilsPerBox;
question = `A school orders ${boxes} boxes...`;
solution = `Multiply ${boxes} by ${pencilsPerBox}...`;
```

For division, some problems are constructed backward: choose the divisor and desired whole-number answer first, then multiply them to produce the dividend. This guarantees a clean division problem instead of hoping random numbers divide evenly.

There are **70 unique templates**: 20 legacy Grade 5, 20 Grade 8, 20 Algebra I, and 10 additional MSTAR modeling/reasoning templates. The MSTAR form reuses 10 Grade 5 content templates and remaps their reporting categories to content.

**Current limitation:** each assessment uses 20 fixed template slots in the same order. New seeds primarily vary numbers, some context, and answer-choice positions, not entirely new question structures.

## 2. The seed makes the randomness repeatable

[`src/engine/rng.ts`](src/engine/rng.ts) hashes the test identity into a seeded pseudorandom number generator.

A code such as:

```text
BAYTRAIL.g5.p1.v1
```

pins four things:

| Component | Meaning |
|-----------|---------|
| `BAYTRAIL` | Seed |
| `g5` | Assessment |
| `p1` | Practice blueprint version |
| `v1` | Generator version |

Each question gets its own random stream, derived from the code and its question index. Answer choices use another stream. Generating more random values for question 1 therefore does not shift the numbers used for question 2.

[`src/engine/assessments.ts`](src/engine/assessments.ts) selects the blueprint for `g5`, `g8`, `g5-mstar`, or `alg1`. The files in [`src/engine/blueprint/`](src/engine/blueprint/) define each form's fixed question slots and distribution. [`src/engine/assemble.ts`](src/engine/assemble.ts) fills those slots and verifies the resulting counts. These are app-defined practice quotas, not verified official MCAP/MSTAR quotas.

Every form has 10 multiple-choice and 10 numeric questions, worth one point each. Grade 8 and Algebra I allow negative answer choices. MSTAR uses 10 content, 6 modeling, and 4 reasoning questions, with auto-gradable reasoning rather than written responses. These simplifications do not reproduce official exam lengths, calculator sections, constructed responses, or scoring rubrics.

Changes that alter an existing shared test must deliberately bump the generator version. Unsupported codes produce an error rather than silently generating a different test.

The three added assessments have their own code identities and golden fixtures. Adding them did not change the existing `g5.p1.v1` output.

## 3. Answers are calculated, then independently re-solved

Each generated question contains structured problem data alongside its display text. For example:

```ts
data: { kind: "product", a: 17, b: 20 }
key: "340"
```

Before the question is returned, [`src/engine/verify.ts`](src/engine/verify.ts) independently solves that structured data and compares its result with the template's answer key. It also rejects multiple-choice items without exactly one correct, distinct option.

The additional solvers include exact integer roots, determinant-based system solving, polynomial evaluation and expansion, quadratic discriminants, and scatter-plot covariance. For example, a system template constructs equations from a chosen solution, while the verifier solves the equations using their determinant; it never trusts the chosen solution.

Fractions and decimals use the BigInt-backed [`Fraction` class](src/engine/fraction.ts) rather than ordinary floating-point arithmetic. Grading can therefore recognize:

```text
0.5 = 1/2 = 2/4
```

without rounding errors. Equality is exact: a rounded decimal approximation is not accepted as an exact fraction.

For multiple choice, grading looks up the selected option's value and compares it with the key. For numeric entry, it parses the response and key into normalized fractions and compares their numerators and denominators.

Not every multiple-choice answer is a number. Factoring and inequality questions supply explicit mathematical options with canonical string keys; association and reasoning questions supply literal text options. The verifier checks those keys against the structured math, and the renderer knows whether each label is text or mathematical notation.

**The verifier checks mathematical consistency. It does not read the English wording or prove that a question is pedagogically good.** Those aspects still require content review.

## 4. Wrong-answer feedback is attached to the choices

The app does not infer a student's reasoning. It recognizes a selected wrong option that represents a possible mistake.

For the pencil question:

| Answer construction | Meaning | Feedback |
|---------------------|---------|----------|
| `boxes * pencilsPerBox` | Correct | Show the worked solution |
| `boxes + pencilsPerBox` | Possible addition-instead-of-multiplication mistake | Explain equal groups and multiplication |

Each option carries a `misconception` message. On review, the UI looks up the selected option and displays that message alongside the correct answer and worked solution.

Some distractors have specific feedback. Others currently use simple numerical offsets and generic feedback; this is a limitation of the first pass.

For numeric entry, the app compares the normalized value with the key. If it is wrong, it shows the worked solution, but it does not currently diagnose the particular mistake from the entered number.

The worked solution itself is generated with the question, using its chosen values. It is not written on demand after the student answers.

## 5. Timed work and later practice are separate

[`src/ui/attempt.ts`](src/ui/attempt.ts) manages the attempt lifecycle:

- A new random test or submitted seed resets the attempt. Questions stay hidden until **Start test**.
- Starting records a timestamp. Remaining time is calculated from the deadline, so refreshing or closing the tab does not restart or pause the clock.
- At expiry, the app copies the answers into an immutable `expiredAnswers` snapshot.
- The student can quit and see results, or continue working for practice.
- Final timed scoring uses the snapshot. Questions unanswered at the deadline remain in the **unanswered at time limit** category and receive zero points.
- Continued practice updates a separate current-answer collection. Those answers can receive correctness feedback without changing the timed score or unanswered-at-deadline count.

Answer changes also check the deadline before being applied. If a timer callback was delayed, an answer entered after the deadline is still treated as practice rather than being added to the timed snapshot.

Submitting before expiry stops the clock and locks the attempt's answers.

## 6. The UI renders and saves the generated test

The React UI in [`src/ui/`](src/ui/) displays the generated items, collects responses, and presents results. The assessment selector controls random tests and plain seeds; a full code identifies its own assessment. Changing the selector after pasting a full code keeps only its seed, so the old assessment does not silently override the new selection.

KaTeX renders mathematical notation; SVG components draw figures from the generated problem data, including coordinate graphs with negative axes and scatter plots. Neither rendering system decides whether an answer is correct.

[`src/ui/storage.ts`](src/ui/storage.ts) saves answers, timing state, review flags, and navigation position in `localStorage`, keyed by the full versioned test code. Shared links contain the test identity, not answers or timer state. Stored data is validated when loaded; malformed saves are reported instead of silently overwritten.

The generation engine in [`src/engine/`](src/engine/) is independent of React and the DOM. Adding assessment content primarily means adding blueprint data, templates, and compatible verification logic rather than rebuilding the test-taking UI.
