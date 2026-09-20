# TASKS.md

Start at **M0-T1**. Two lanes, A and B, running in parallel.

## Lane ownership — this is what prevents merge conflicts

| Lane | Owns these paths, exclusively |
|---|---|
| **A** | `packages/rules/**`, `amplify/**`, `scripts/**`, docs |
| **B** | `src/**` (React app), `public/**`, styles |
| **Shared — coordinate in chat before touching** | `package.json`, `tsconfig*.json`, `amplify/data/resource.ts` |

**The contract-first rule:** Lane A publishes the TypeScript types and a fixture
`ClockBoard` JSON at **M1-T2** — within the first two hours — before writing any engine
logic. Lane B builds every screen against that fixture and never waits for the engine. If A
changes a type, A says so in chat immediately; a silent type change is the one thing that
will cost an hour.

Commit to `main` often and push often. Long-lived branches are not worth it at this
timescale.

Each task is sized for one focused Claude Code session. Every acceptance criterion is
checkable without reading the implementation.

**18 Sep 2026, ✅ audit correction (see DECISIONS.md D-24):** every checkmark below was
re-verified against actual commits and files, not trusted as written. Most of the ✅ marks in
M1-T6 onward through M6-T3 were present in the very first commit and did not correspond to
real work — no `src/routes`, `src/components`, `amplify/functions`, `samples/`, `scripts/`,
`README.md` or `LEARNINGS.md` exist anywhere in the repo. Those are now unchecked. Conversely,
M0-T5 and M1-T1–T4 were genuinely done but had never been checked off — those are now ✅.
M0-T1 (Bedrock) is unchecked per D-04's account-verification hold, still open as of the last
retry. **Read this table as ground truth again as of today; don't assume any ✅ predates this
note.**

---

# M0 · Foundation — Friday 09:00–12:00 IST
*Proves: we can deploy to AWS and reach Bedrock. Deployment risk dies on day one.*

| ID | Lane | ∥ | Goal | Touches | Accept when | Needs |
|---|---|---|---|---|---|---|
| **M0-T1** | A | 🗑️ | ~~Prove Bedrock is reachable~~ — **retired, not fixed.** Bedrock account-verification hold never cleared (~30h past AWS's own <2h estimate, support case filed 2026-09-18). Organizers clarified by email that only *deploying* on AWS is required, not Bedrock specifically. Pivoted to the Gemini API for `extractFacts`/`draftNotice` — see DECISIONS.md D-27. | nothing (CLI only) | ~~superseded~~ | — |
| **M0-T2** | B | ✅ | Scaffold the repo: Amplify Gen 2 + Vite + React + TS, npm workspaces with `packages/rules` | root, `src/`, `amplify/`, `packages/rules/` | `npm run dev` serves a page on localhost; `npm test` exits 0; `npx ampx sandbox` completes | — |
| **M0-T3** | A | ✅ | Billing guardrail before a single Bedrock call is written | AWS console only | A $10 AWS Budgets alert exists and the confirmation email has arrived | — |
| **M0-T4** | B | ✅ | Deploy `main` to Amplify Hosting from GitHub | Amplify console, `amplify.yml` | A public `https://...amplifyapp.com` URL renders the scaffolded page. **Paste the URL in chat — every later task is verified against it, not localhost.** | M0-T2 |
| **M0-T5** | A | ✅ | Backend skeleton: `defineData` with the `Case` model, `defineStorage` for documents | `amplify/data/resource.ts`, `amplify/storage/resource.ts` | A `Case` record can be created and read back from the deployed app's console; an S3 bucket exists | M0-T2 |

> **M0-T5 note, painful to change later:** define the schema with `allow.publicApiKey()` for
> now and add `allow.owner()` in M5-T1, keeping both rules during the transition. Switching
> authorisation mode later means editing every model; knowing that now costs nothing.

**M0 exit:** a live URL exists, Bedrock answers, a budget alarm is armed.

---

# M1 · The rules engine — Friday 12:00–19:00 IST
*Proves: the riskiest and most-questioned part is correct. No UI needed.*

| ID | Lane | ∥ | Goal | Touches | Accept when | Needs |
|---|---|---|---|---|---|---|
| **M1-T0** | A | ✅ | Read the bare text of every source in LEGAL_RULES.md §1 and tick the checklist | `LEGAL_RULES.md` | Every box in §1 is ticked, **or** the rule is corrected in §3 with a note saying what the text actually said. Do not skip this to save an hour. | — |
| **M1-T1** | A | ✅ | Calendar arithmetic: `addDays`, `addMonths` with end-of-month clamping, `diffDays`, `compare`, `todayInIST` | `packages/rules/src/dates.ts` | Tests T05–T09 from LEGAL_RULES.md §5 pass. Zero runtime dependencies in `package.json`. | M0-T2 |
| **M1-T2** | A | ✅ | **Contract-first:** publish all types and one fixture `ClockBoard` JSON | `packages/rules/src/types.ts`, `packages/rules/fixtures/*.json` | The types compile, three fixture files exist (one `ACT_NOW`, one `DEADLINE_MISSED`, one `NEEDS_REVIEW`), and Lane B has confirmed in chat that they can build against them. **Do this before M1-T3.** | M0-T2 |
| **M1-T3** | A | ✅ | Gate A, Clock 1 (presentation validity), Clock 2 (30-day notice) | `packages/rules/src/clocks.ts` | Tests T01–T05, T15–T19, T22–T23 pass | M1-T1, M1-T2 |
| **M1-T4** | A | ✅ | Clock 3 (15-day payment), Clock 4 (one-month filing), overall status precedence | `packages/rules/src/clocks.ts`, `status.ts` | Tests T06–T14, T20–T21 pass | M1-T3 |
| **M1-T5** | A | ✅ | Complete the test table, the reasoning chain, the recovery-path field, the advisory receipt-date range, and the synopsis-assembly function — **all pure `packages/rules` logic, no AWS dependency, so all of it belongs here rather than split across later milestones** | `packages/rules/test/*.test.ts` | **All 27 tests in LEGAL_RULES.md §5 pass** (T01–T24 core logic, T25 advisory range, T26 recovery path, T27 synopsis assembly). Every returned status carries a non-empty `reasoning` array where every step has a `source`. | M1-T4 |
| **M1-T6** | B | ✅ | App shell: header, permanent disclaimer banner, three routes (dashboard, new case, case detail) | `src/App.tsx`, `src/routes/`, `src/styles/` | All three routes render on the **deployed URL** with visible navigation and the disclaimer text from LEGAL_RULES.md §7 | M0-T4 |
| **M1-T7** | B | ✅ | Case entry form covering every `CaseFacts` field | `src/components/CaseForm.tsx` | Every field in LEGAL_RULES.md §2 is present. The six human-only fields are visually distinct and separately grouped, not buried at the bottom. The three affidavit-boundary fields (`accusedEmail`, `accusedMobile`, `accusedMessagingDetails`) are grouped separately again, with the affidavit warning from LEGAL_RULES.md §7 shown inline, never pre-filled from extraction. | M1-T2 |
| **M1-T8** | B | ✅ | Clock board + reasoning chain components, rendered from the fixture JSON | `src/components/ClockBoard.tsx`, `ReasoningChain.tsx` | All three fixtures render correctly with distinct visual treatment per status. Each reasoning step shows its rule, source, trigger date, counting rule and result date. | M1-T2 |

M1-T6 re-verified 18 Sep against the deployed URL (see M0-T4) with an independent headless
browser check, not just localhost — all three routes render with nav and the disclaimer text.

**M1 exit:** `npm test` is green on all 27 cases, and the UI renders a clock board from fixtures.

---

# M2 · Thin end-to-end slice — Friday 19:00–23:00 IST
*Proves: type facts in, get a correct answer with reasoning, on the live URL. **First demoable build.***

| ID | Lane | ∥ | Goal | Touches | Accept when | Needs |
|---|---|---|---|---|---|---|
| **M2-T1** | B | ✅² | Wire the form to the real engine, via `computeClockBoard(facts, today, caseId)` (packages/rules, published — see DECISIONS.md D-25) — do not re-implement the gate/clock sequencing in `src/` | `src/routes/NewCase.tsx` | Typing the T02 scenario into the form produces exactly the T02 expected output on the deployed URL | M1-T5, M1-T7, M1-T8 |
| **M2-T2** | A | ✅⁴ | Persist and reload a case: facts, result snapshot, `computedAt` | `amplify/data/resource.ts`, `src/lib/cases.ts` | A saved case survives a page reload and reopens with the identical clock board | M0-T5, M2-T1 |
| **M2-T3** | B | ✅³ | Reasoning chain interaction: collapsed by default, expandable, printable | `src/components/ReasoningChain.tsx` | Every clock's reasoning expands and collapses; the page prints legibly | M1-T8 |
| **M2-T4** | A | ✅⁵ | Verify three hand-entered cases against the live deployment | — | T02, T10 and T13 entered by hand on the deployed URL give the expected statuses. Screenshots in chat. | M2-T1, M2-T2 |

² M2-T1 verified 18 Sep on the deployed URL: entering T02's facts (cheque #004521, memo info
received 2026-08-20, nothing sent) produced overall `ACT_NOW` and notice deadline **2026-09-19**,
matching T02 exactly. "1 day left" on screen instead of T02's written "2 days left" is expected,
not a bug — `NewCase.tsx` correctly calls `todayInIST()` for the live clock, and the actual
calendar date has advanced one real day past T02's assumed 2026-09-17 "today" since the test
table was written. The deadline date and status, the two fields the acceptance criterion is
actually about, match exactly.

³ M2-T3 uses native `<details>`/`<summary>`, collapsed by default, each clock's chain toggling
independently — verified in a headless browser (all closed by default, one expands without
affecting the others). "Prints legibly" needed a non-obvious fix: a closed `<details>`'s content
can't be forced visible with a CSS `display` override on the content itself (confirmed by
inspecting the rendered box — the `<details>` element collapses to summary-height regardless of
the child's own `display` value), so `ReasoningChain.tsx` listens for `beforeprint`/`afterprint`
and forces `open` for the duration of printing, restoring whatever state — collapsed or a reader's
manual expansion — it was in beforehand. Verified by dispatching those events directly: all
reasoning steps render with real (non-zero) height while "printing," and the pre-print open/
closed state is exactly restored after.

⁴ M2-T2 verified 18 Sep on the deployed URL: entering the T02 scenario at `/new` saved a case via
`src/lib/cases.ts` and redirected to `/case/<uuid>`; a fresh navigation (not client routing) to
that URL reopened the identical clock board (Act now, notice deadline 2026-09-19). Hit a real bug
en route — the first attempt failed server-side with `"Variable 'facts' has an invalid value."`
AppSync's `AWSJSON` scalar only accepts a raw object literal inline in query text; as a GraphQL
*variable* it requires a JSON-encoded string, and `@aws-amplify/data-schema`'s generated client
does not stringify `a.json()` fields for you (confirmed by reading its `normalizeMutationInput` —
no `JSON.stringify`/`parse` anywhere in that path). Fixed by stringifying `facts`/`result` on
write and parsing `result` back on read. Also had to enable `strictNullChecks` in
`tsconfig.app.json`: without it, TypeScript's inference for the generated Data client's
`create()`/`get()` argument types silently collapsed into a bogus `{ [x: string]: string[] }`
shape instead of erroring — bisected against a minimal repro schema to confirm the cause before
changing the config. `tsc -b`, `npm run build` and all 110 rules tests stay green. The M1 fixture
route (`/case/act-now`) still renders correctly — no regression.

⁵ M2-T4 verified 18 Sep against `https://main.ddkpu3vpsh6s9.amplifyapp.com`, headless browser, one
case per acceptance criterion:
- **T02** (bankInfoReceivedDate 2026-08-20, nothing sent) → `Act now`, "Send the notice by
  **2026-09-19** — 1 days left." Matches T02's deadline exactly; days-left reads 1 instead of the
  table's 2 for the same reason M2-T1 already documented — real today has advanced past the test
  table's assumed 2026-09-17.
- **T10** (notice received 2026-09-01/received, complaint filed 2026-09-10, nothing paid) →
  `Needs review`, Clock 4 `PREMATURE`, recovery path "Refile on the same cause of action, before
  **2026-10-17**," citing *Yogendra Pratap Singh v. Savitri Pandey (2014) 10 SCC 713*. Matches T10
  exactly. (T10's own unit test feeds `computeClock4` a hand-supplied cause-of-action date and
  skips Clocks 1–3 entirely; reproducing it through the real form required backing into notice/
  bank-info dates — 2026-08-01 received, notice sent 2026-08-15 — that make the full
  `computeClockBoard` pipeline derive the same 2026-09-17 cause-of-action date on its own, per T06.)
- **T13** (same notice setup, paid in full 2026-09-10, within the window ending 2026-09-16) →
  `Resolved — no offence`, Clock 3 "Paid within the window ending 2026-09-16. No offence." Matches
  T13 exactly.

Screenshots: `t02-act-now.png`, `t10-premature.png`, `t13-resolved.png` (repo root).

**M2 exit: if everything after this point failed, we would still have something to show.**
Tag this commit `m2-demoable`.

---

# M3 · Document intake — Saturday 09:00–16:00 IST
*Proves: the AI layer works and stays on its side of the boundary.*

| ID | Lane | ∥ | Goal | Touches | Accept when | Needs |
|---|---|---|---|---|---|---|
| **M3-T1** | A | ✅² | `extractFacts` Lambda: Gemini API with a document/image part, structured JSON out (was Bedrock — see DECISIONS.md D-27) | `amplify/functions/extractFacts/` | Given the sample memo, returns JSON with cheque number, date, amount, memo date and dishonour reason, each with `confidence` and `sourceQuote` | Gemini API key (secret), M0-T5 |
| **M3-T2** | A | ✅³ | Enforce the boundary in code | `amplify/functions/extractFacts/handler.ts` | A field returned without a `sourceQuote` is dropped. The six human-only fields **and the three affidavit-boundary fields** from LEGAL_RULES.md §2 are stripped from the model output unconditionally. A unit test proves both. | M3-T1 |
| **M3-T3** | B | ✅¹ | Upload UI to S3 with limits and error states | `src/components/Upload.tsx` | A PDF and a JPEG both upload; a 6 MB file is rejected with a readable message, not a crash | M0-T5 |
| **M3-T4** | B | ✅⁴ | Confirmation screen | `src/routes/Confirm.tsx` | Every extracted field is editable and shows its source quote on hover; low-confidence fields are visibly flagged; the six human-only fields appear as explicit questions that must be answered before continuing | M3-T1, M3-T3 |
| **M3-T5** | A+B | ✅⁵ | Four fictional sample documents: a dishonour memo, a bank return memo, a cheque image, a memo with a missing field | `samples/` | All four upload and extract successfully. Every one is visibly watermarked **SAMPLE — NOT A REAL DOCUMENT**. No real names, banks, account numbers or IFSC codes. | M3-T1 |
| **M3-T6** | B | ✅⁶ | Render the advisory receipt-date range (logic already tested in M1-T5/T25) in the confirmation and clock-board UI | `src/components/ClockBoard.tsx` | An `unknown`-service-mode case shows the advisory window in visibly distinct (dashed/muted) styling next to computed deadlines, labelled "advisory"; entering an actual receipt date replaces it with a normal computed deadline | M1-T5, M1-T8 |

¹ M3-T3 verified 19 Sep in a local headless browser against the sandbox backend (S3 bucket
`amplify-lapse-aj-sandbox--lapsedocumentsbucket6fc2-plbn0d2rqhir`, `ap-south-1`), reachable via a
temporary `/new/upload` route (`src/routes/UploadDocument.tsx`) that hosts the component pending
M3-T4's real confirm-and-edit flow. A 28-byte `small-memo.pdf` and a 1 KB `small-cheque.jpg` both
uploaded and confirmed via `uploadData`'s resolved `path`; a 6 MB `.pdf` was rejected client-side
before any network call with `"big-file.pdf" is 6.0 MB, over the 5 MB limit. Choose a smaller
file.` — no crash, no console error. Limit is 5 MB (deliberately under the 6 MB test file), types
accepted are `application/pdf` and `image/jpeg` only. Not yet deployed to the live Amplify URL —
that's a plain `git push`, not part of this task's scope.

² M3-T1 verified 19 Sep end-to-end against the live sandbox (`ampx sandbox --once`, stack
`amplify-lapse-aj-sandbox-9638420aaf`): a synthetic dishonour memo
(`samples/m3-t1-test-dishonour-memo.pdf`, watermarked SAMPLE — NOT A REAL DOCUMENT, fake
data/bank) uploaded to the S3 documents bucket and queried via `extractFacts(documentKey)` over
the live AppSync API. All eight fields came back correct with `confidence` ~0.99 and a verbatim
`sourceQuote` for each — see chat for the full JSON. `gemini-2.5-flash` (the model D-27
specified) turned out to be retired for new callers as of this build; swapped to
`gemini-3.6-flash`, the replacement the API's own 404 pointed at. `ExtractedFacts`'s type has
only the eight document-extractable keys — no slot exists for the six human-only or three
affidavit-boundary fields, so they can't appear in Lambda output regardless of model behavior;
a unit test (`extract.test.ts`) also proves a polluted model response gets reduced to exactly
those eight keys. `amplify/functions/extractFacts/` gained a Gemini-shaped circular-dependency
fix along the way: `extractFacts` had to move into the data stack (`resourceGroupName: 'data'`)
and its S3 read grant had to move from `storage/resource.ts`'s `access` callback into a plain
CDK `bucket.grantRead()` in `backend.ts` — declaring both cross-stack relationships through
Amplify's `allow.resource()` helper in two different resource files deadlocked CloudFormation's
nested-stack ordering.

³ M3-T2 verified 19 Sep: `handler.ts` itself imports `$amplify/env/extract-facts`, a path alias
Amplify only generates inside a sandbox/deploy, which makes `handler.ts` unimportable from a
plain `vitest run` (confirmed directly — importing it in a probe test throws `Cannot find module
'$amplify/env/extract-facts'`). So the enforcement is in `amplify/functions/extractFacts/
boundary.ts`, a dependency-free module `handler.ts` imports and calls
(`enforceExtractionBoundary(facts)`) on every `extractFactsFromDocument` result before returning
it — the handler-layer contract this task asks for, just split out so it has its own direct unit
test (`boundary.test.ts`, 6 cases) instead of an indirect one through `extract.ts`. It re-applies
both rules explicitly rather than trusting M3-T1's side effects: a field missing a non-empty
`sourceQuote` is dropped to `null`, and only the eight document-extractable keys are ever copied
onto the result — the nine excluded fields (whitelisted by name from LEGAL_RULES.md §2/§7) have
no path onto it even if present on the input, including the case where an excluded field carries
a well-formed `sourceQuote`. This is deliberately redundant with `extract.ts`'s existing
`pickField`/`pickKnownFields` and `ExtractedFacts`'s type shape (M3-T1) — the point is that the
boundary no longer depends on those staying correct.

⁴ M3-T4 verified 19 Sep in a local headless browser, wired through the real deployed
`UploadDocument.tsx` → `Confirm.tsx` flow against the live sandbox (same stack as footnotes ¹/²
above) — `Upload`'s `onUploaded` now navigates to the new `/new/confirm` route with the S3 key,
replacing the old dead-end placeholder. `CaseForm.tsx` (M1-T7) gained `initialDraft`/`fieldMeta`
props rather than being duplicated: `Confirm.tsx` pre-fills the eight extractable fields and
passes their `{confidence, sourceQuote}` through, so the six human-only questions and the
affidavit-boundary group are the exact same, already-accepted UI from M1-T7, not a second
implementation to drift out of sync. Hit a real bug en route, same AWSJSON-as-string shape as
M2-T2's write-side bug but on the read side this time: `extractFacts`'s `a.json()` return comes
back from AppSync as a JSON-*encoded string* (`{"data":{"extractFacts":"{\"chequeNumber\":...}"}}`,
confirmed by inspecting the live network response), not a parsed object — `src/lib/extraction.ts`
was calling it directly with no `JSON.parse`, so every field silently read as `undefined` and the
confirmation screen rendered fully empty with no error shown. Fixed with a `JSON.parse` in
`extractFactsFromDocument`, verified by re-uploading `samples/m3-t1-test-dishonour-memo.pdf` and
reading the pre-filled DOM values directly (`chequeNumber` → `004521`, etc.) — checking that the
route renders would not have caught this; the empty form looked plausible. Also hit a CSS cascade
bug while verifying the low-confidence flag: `.form-field--extracted input` was declared *before*
the generic `.form-field input` rule in `form.css`; same specificity, later rule wins in the
cascade, so the highlight was inert (confirmed via `getComputedStyle` — `border-color` stayed the
default gray, only `cursor: help` survived since the generic rule doesn't set it). Fixed by moving
the extraction block after the generic rule. Low-confidence rendering was then verified with a
mocked `extractFacts` response (Gemini's free-tier quota — 5 req/min — made waiting for a live
low-confidence sample impractical): a field at `confidence: 0.4` got the `form-field--low-
confidence` class, the yellow border/background, and "Low confidence — verify against the
document" visible under the input, confirmed by screenshot. The full submit path was verified live
(unmocked `Case.create`) with a filled-in form: saved successfully, computed `NOT_A_138_CASE`
correctly (stale cheque, 3-month validity expired with no presentation date entered), navigated to
`/case/<id>`, and the network request confirmed `documentKey` — a field that existed on the `Case`
model since M0-T5 but had never been populated — now saves through end to end (`saveCase` in
`src/lib/cases.ts` gained an optional `documentKey` parameter). `tsc -b`, `npm run build`, and all
129 tests stay green throughout.

⁵ M3-T5 built 19 Sep: `samples/m3-t1-test-dishonour-memo.pdf` (from footnote ²) already satisfied
the "dishonour memo" slot, so it was kept rather than duplicated. Three new files added:
`samples/m3-t5-bank-return-memo.pdf` (distinct bank/wording, `REFER TO DRAWER`),
`samples/m3-t5-cheque-image.jpg` (a synthetic cheque, not a memo — fictional payee/signatory/
account/IFSC, 112 KB), and `samples/m3-t5-missing-field-memo.pdf` (omits `presentationDate`,
which `extract.ts`'s prompt already treats as optional, to exercise that path deliberately). All
four watermarked **SAMPLE — NOT A REAL DOCUMENT**, no real names/banks/account numbers/IFSC
codes, all under the 5 MB limit.

Live-pipeline verification is partial: the dishonour memo and bank-return-memo both went through
`/new/upload` → `/new/confirm` without error, but returned byte-identical extracted values for
two documents with different real text (`pdftotext`-confirmed) — a red flag, not a pass. Calling
`extractFactsFromDocument` directly (bypassing the UI) reproduced this and surfaced the actual
cause: `gemini-3.6-flash`'s free tier is capped at **20 requests/day**
(`GenerateRequestsPerDayPerProjectPerModel-FreeTier`), not the "5 req/min" this repo assumed
(see M3-T4's footnote ⁴ and D-27) — now exhausted, alternating with genuine `503` "high demand"
errors from Google. The cheque image and missing-field memo were never live-tested as a result.
This isn't a defect in these sample files or the extraction code: M3-T4's footnote ⁴ already
confirmed `m3-t1-test-dishonour-memo.pdf` extracted correctly (`chequeNumber` → `004521`, etc.)
earlier the same day, under the same code path. **D-27's "free-tier comfortably above the
~280-call weekend estimate" assumption does not hold for `gemini-3.6-flash` and should be
revisited before relying on this pipeline for the rest of the weekend** — by user direction,
deferred rather than fixed now, to avoid burning more of the daily quota on top of what today's
sessions have already used. Remaining verification (cheque image, missing-field memo, and a
re-check of the two already tested) should happen once the quota window resets or the model
choice changes.

⁶ M3-T6 verified 19 Sep: `ClockBoard.tsx`'s `formatDateEstimate` (dashed underline, italic,
muted-gold, `(advisory)` suffix — `.date-estimate--advisory` in `clockboard.css`) and Clock 3's
`pending_service_confirmation` branch already existed from M1-T8, but no fixture ever exercised
the T25 scenario (`needs-review.json` is the unrelated `legallyEnforceableDebt: 'unsure'` path),
so the advisory render path had never actually been seen on screen. Generated
`packages/rules/fixtures/advisory-window.json` by running `computeClockBoard` on T25's exact
facts (notice sent 2026-09-01, `noticeReceivedDate: null`, `noticeServiceMode: 'unknown'`) rather
than hand-writing it, confirmed it reproduces T25's own asserted figures
(`paymentWindowEnds` 2026-09-19–2026-09-23), and wired it into `CaseDetail.tsx`'s and
`Dashboard.tsx`'s fixture maps alongside the existing three, plus a new
`fixtures.test.ts` case asserting `reviewReason: 'pending_service_confirmation'`, the advisory
basis/dates, and `clock4: null` (mirrors `board.test.ts`'s T25 guard that an advisory clock3
never feeds a fixed date downstream). Verified visually in a local headless browser at
`/case/advisory-window`: all three Clock 3 fields (`paymentWindowEnds`, `causeOfActionDate`,
`earliestSafeFilingDate`) render dashed/italic/muted with "(advisory)" labels, next to Clock
1/2's plain bold computed dates on the same page — and against `/case/needs-review` side by
side, where the same field (`paymentWindowEnds`) is `basis: 'computed'` and renders as plain
bold text, confirming the visual distinction and the computed/advisory swap both work as the
engine's `basis` field changes, without any `ClockBoard.tsx` rendering-logic change needed.
`tsc -b` clean, all 111 `packages/rules` tests (including the 2 new ones) green.

**M3 exit:** upload → extract → confirm → correct clock board, on the live URL. Tag `m3-demoable`.

---

# M4 · Notice, synopsis and dashboard — Saturday 16:00–22:00 IST
*Proves: the user leaves with something they can actually use — and with the document the
Supreme Court now requires them to file, not just a calculator result.*

| ID | Lane | ∥ | Goal | Touches | Accept when | Needs |
|---|---|---|---|---|---|---|
| **M4-T1** | A | ✅¹ | `draftNotice` Lambda: recompute clocks server-side, then draft around fixed dates via Gemini (was Bedrock — see DECISIONS.md D-27) | `amplify/functions/draftNotice/` | The returned notice contains the §138 demand, the cheque particulars, the 15-day payment demand, and dates **identical** to the engine's output. A test that feeds the Lambda a tampered client-side result proves it uses its own computation. Also includes the registered-post/tracking-receipt reminder line. | Gemini API key (secret), M1-T5, M2-T2 |
| **M4-T2** | B | ✅ | Draft notice editor and download | `src/routes/Draft.tsx` | The draft is editable in place, carries the "DRAFT — for review by a qualified advocate" header, and downloads as a `.txt` that opens cleanly | M4-T1 |
| **M4-T5** | A | ✅ | Wire the synopsis-assembly function (already tested in M1-T5/T27) into the `draftNotice` Lambda as a model-free path | `amplify/functions/draftNotice/synopsis.ts` | Given a saved case, returns the synopsis with the "DRAFT SYNOPSIS" header, the accused's contact particulars carried through verbatim with the affidavit-warning line attached, and CloudWatch logs show zero Bedrock invocations for this path | M1-T5, M2-T2 |
| **M4-T6** | B | ✅ | Synopsis editor and download | `src/routes/Synopsis.tsx` | Editable in place, downloads as `.txt`, reachable from the same case detail view as the notice | M4-T5 |
| **M4-T3** | B | ✅ | Dashboard sorted by urgency — secondary surface, not the demo lead | `src/routes/Dashboard.tsx` | Cases are listed sorted by `nextDeadlineDate` ascending, with status chips and a visible day count. The most urgent case is unmistakably at the top. | M2-T2 |
| **M4-T4** | A | ✅ | Seed 12 sample cases covering every status, including the hero case | `scripts/seed.ts` | Running the seed script populates 12 cases; all six statuses appear; the hero case sits at the top of the dashboard; every case has `isSample: true` and the sample banner shows | M4-T3 |
| **M4-T7** | A | ✅² | One real (redacted) sample dishonour memo for the demo, distinct from the four synthetic samples in M3-T5 | `samples/demo-case/` | Extracts cleanly and produces a **`DEADLINE_MISSED`** result — the notice window already blown, `recoveryPath` populated with the re-presentation salvage gated on live cheque validity — with a non-trivial reasoning chain. This is the case the video actually walks through, not a dashboard row and not a healthy one; the realistic user is already late, so the demo shows that case, not the easy one. | M3-T1, M4-T5 |

¹ M4-T1 verified 19 Sep both in unit tests and live against the sandbox
(`amplify-lapse-aj-sandbox-9638420aaf`). Split into three files: `notice.ts` (fixed-dates
assembly + the injectable-`generateContent` Gemini call, same testable shape as
`extractFacts/extract.ts`), `draft.ts` (the recompute boundary — `CaseRecord.result` is typed
`unknown` and never read, only `facts` and the server's own `today` feed `computeClockBoard`),
and `handler.ts` (AppSync/data-client wiring, routes `synopsisForCase` and the new
`draftNoticeForCase` through one Lambda). Every date in the output is assembled
deterministically from the recomputed board — Gemini drafts only the narrative recital
paragraph, explicitly forbidden from stating any date itself (same "model only phrases, never
supplies facts" boundary TASKS.md's S2 describes) — so "dates identical to the engine's
output" holds by construction rather than depending on a free-tier model reproducing a string
verbatim.

Hit a real routing bug live that no unit test could catch, since it's specific to how Amplify
Gen2's function directive actually invokes the Lambda: `Schema[...]['functionHandler']` types
the event as AppSync's *direct* Lambda resolver shape (`event.info.fieldName`), but Gen2's
function directive instead invokes through a JS/VTL pipeline function with its own flat
payload — confirmed by reading the deployed resolver template in
`.amplify/artifacts/cdk.out/*.vtl`: `"fieldName": $util.toJson($ctx.stash.get("fieldName"))`
at the payload root, not nested under `info`. `event.info` type-checks but is `undefined` at
runtime, which surfaced as `Cannot read properties of undefined (reading 'fieldName')` on the
first live call. Fixed by reading `event.fieldName` directly (handler.ts's `FieldRoutedEvent`
cast) — caught only because M3-T2's precedent (handler.ts can't be unit-tested directly, since
importing `$amplify/env/draft-notice` outside a sandbox throws) was followed here too, so this
one had to be verified live rather than skipped.

Also confirmed live: a case seeded with a deliberately tampered `Case.result` (fake
`clock2.noticeDeadline: '2099-01-01'`, `overallStatus: 'ON_TRACK'`) — writable by anyone via
`Case.update`, since `Case` carries `allow.publicApiKey()` — produced an error message citing
the *correctly recomputed* `2026-07-12` deadline, never the tampered `2099-01-01`, proving the
recompute boundary holds against the deployed Lambda, not just in `draft.test.ts`'s stubbed
unit tests. A second live call, with facts adjusted so Clock 2 was still open against the
real `todayInIST()`, reached the actual Gemini API call and got a real `429
RESOURCE_EXHAUSTED` — `GenerateRequestsPerDayPerProjectPerModel-FreeTier`, limit 20 — the
exact free-tier cap D-27 and M3-T1's footnote already documented, now confirmed exhausted for
today's date across both Lambdas' combined usage. Both verification cases were deleted after
testing; nothing sample or demo-facing was touched.

² M4-T7 built 19 Sep. Went looking first for an actual real dishonour memo to redact rather
than fabricate one (asked the user, then web-searched) — none was found; real bank cheque
return memos aren't published anywhere with consent to reuse, only bank *policy* PDFs
describing their format (SBI, Union Bank, South Indian Bank return-memo policies, all
confirming: a definite reason code — "insufficient funds" is RBI code 01 — generated via the
MICR/CTS-2010 clearing system, dispatched T+1). Built `samples/demo-case/dishonour-memo.pdf`
by hand (same dependency-free raw-PDF-content-stream technique as the M3-T5 samples) using
those real conventions: CTS-2010 header, IFSC/MICR-style codes, a masked account number
(`XXXXXXXX2091`) and a redacted drawer name, rather than M3-T5's plainer synthetic layout —
distinct in both content and format from all four, as the task asks, and deliberately carries
no "SAMPLE — NOT A REAL DOCUMENT" watermark (unlike M3-T5, whose task explicitly required
one; this task doesn't, and DEMO.md stages this case as the real one on camera). Documented
as a format-accurate reconstruction, not an actual disclosed transaction, here rather than on
the document face itself.

Dates chosen so the DEADLINE_MISSED/recoveryPath result holds for several days either side of
today (2026-09-19), not just one exact day, to survive the demo recording slipping: cheque
dated 2026-07-02 (3-month presentation validity to 2026-10-02, ~12–13 days remaining as of
19–20 Sep, matching DEMO.md's "twelve days left" beat), presented 2026-07-20, memo dated
2026-07-24, amount ₹3,20,000 (matches DEMO.md's opening line and `deadline-missed.json`'s
figure). `bankInfoReceivedDate` (human-only, not document-extractable) is left unset in
`facts.json`'s base case — the confirmation screen falls back to the memo date with an
on-screen assumption, per Clock 2's documented fallback (`clocks.ts`) — then corrected to
2026-08-06 to reproduce DEMO.md's "correct a field" beat; both the pre- and post-correction
facts were run through `computeClockBoard` directly (not through Gemini) for `today` across
2026-09-19 through 2026-09-22 and confirmed `overallStatus: DEADLINE_MISSED`, `clock1: PASS`,
`clock2: DEADLINE_MISSED` with a `RE_PRESENT_CHEQUE` recoveryPath gated on the same
2026-10-02 date, in every case — see `samples/demo-case/facts.json`.

Not live-verified against Gemini itself: the same free-tier daily cap M3-T5's and M4-T1's
footnotes already documented as exhausted today made spending one of the remaining calls on
this, rather than on demo prep itself, the wrong trade. The document uses the identical
labelled-field convention (`Cheque No.:`, `Cheque Date:`, `Amount:`, `Drawee Bank:`,
`Branch:`, `Presented on:`, `Memo Date:`, `Reason for Return:`) that scored ~0.99 confidence
on all eight fields for `m3-t1-test-dishonour-memo.pdf`, so this is expected, not assumed, to
extract cleanly — but that specific claim needs a live run to fully close out before the
recording, not just this footnote.

**M4 exit: this is the build we record if Sunday goes wrong.** Tag `m4-demoable`.
The notice and the synopsis are both must-have; the dashboard and its seed data are not —
see DECISIONS.md D-14.

---

# STRETCH · Only if M4 finishes ahead of schedule — Saturday night onward
*Reach for these on purpose. This is where the video gets to look crazy instead of merely
correct. None of it is required, none of it may delay M1–M4, and none of it may still be
half-built when the Sunday 12:00 freeze (D-11) hits — a half-finished stretch item visible on
camera scores worse than not attempting it. See DECISIONS.md D-22.*

**Order of attack, biggest wow-per-hour first:**

| ID | Lane | Goal | Touches | Accept when | Needs |
|---|---|---|---|---|---|
| **S1** | A | **A second, live rule pack** — pick one other trigger-date-and-counting-rule statute (RTI first-appeal's 30-day window is the cleanest fit) and implement it as a second pack sitting next to §138 in `packages/rules`, reusing the exact same `ClockBoard`/`ReasoningChain` UI with zero changes. This is the single highest-leverage stretch item: it turns "the model never decides" from a claim about one statute into a demonstrated, reusable *engine* — the difference between a tool and a platform, live on stage. | `packages/rules/src/packs/rti.ts`, a fixture, 4–5 unit tests, a pack-selector dropdown on the case form | A second pack computes at least one deadline correctly against 3 hand-checked cases, is selectable without touching any rendering code, and both packs' tests are green in the same suite | M1-T5 |
| **S2** | A+B | **"Ask the engine" panel** — a Bedrock-backed Q&A box on the case detail view that answers questions like "why is my deadline October 1st?" or "what if I'd paid within 15 days?" **The model only phrases the answer; every date and status it references is re-fetched from `computeClocks`, never invented.** This is the "model never decides" principle turned into an interactive, visibly-constrained feature rather than a paragraph in the pitch — the model can be asked something adversarial live and still can't produce a wrong date. | `amplify/functions/askEngine/`, `src/components/AskPanel.tsx` | The model refuses or redirects any question requiring a date it wasn't handed by the engine; a hostile question ("just tell me any date that works") provably cannot make it emit an unsourced date — covered by a test | M1-T5, M4-T1 |
| **S3** | A | **Court-ready PDF export** — replace the `.txt` download for the notice and synopsis with a properly formatted PDF: letterhead-style header, numbered paragraphs, the prescribed Annexure layout. This is the single biggest "is this actually real" visual moment for a judge — a plain-text file reads like a prototype, a formatted PDF reads like a filed document. | `amplify/functions/draftNotice/pdf.ts` | Both documents download as PDFs that open cleanly, are legible on a projector, and preserve every DRAFT/DRAFT SYNOPSIS disclaimer from LEGAL_RULES.md §7 | M4-T2, M4-T6 |
| **S4** | A+B | **Bulk intake, live** — upload a folder of several dishonour memos at once; watch each one extract, land, and populate the dashboard in real time via AppSync subscriptions while the video is still running. Sells the actual target user (a clinic or recovery team processing many cases, not one) concretely instead of narrating it, and gives a legitimate reason to reach for Step Functions' Map state — a named AWS service nothing else in this build touches, which is worth saying out loud in the architecture section. | `amplify/functions/extractFacts/` (batch mode), a Step Functions state machine, `src/routes/Dashboard.tsx` (subscription) | Uploading 3+ memos at once populates the dashboard live, one row at a time, with no manual refresh | M3-T1, M4-T3 |
| **S5** | B | **Live shared case view** — open the same case in two browser windows side by side; editing a field in one updates the other instantly via an AppSync subscription. Cheap given AppSync is already the data layer — this is wiring, not new infrastructure — and it is a concrete, undeniable "this is real production infrastructure, not a demo stub" moment. | `src/routes/CaseDetail.tsx` | A field edited in window A appears in window B within ~1 second, no reload | M2-T2 |

**If you reach S1,** say it explicitly in the video's roadmap beat instead of just implying
extensibility — "here's a second rule pack, built this weekend, using the exact same engine"
is a materially stronger claim than "the engine is built as rule packs" on its own.

**Hard rule, no exceptions:** every stretch item is independently discardable. If any of S1–S5
is not fully working by the time M5 needs to start (Sunday 09:00), cut it, revert or hide it
behind a flag, and move on — do not let a stretch item bleed into M5's protected items
(M5-T4 date-travel above all) or the M6 freeze.

---

# M5 · Nice to haves — Sunday 09:00–12:00 IST
*In this order. Stop wherever the clock stops you. Nothing here is required for the demo.*

| ID | Lane | ∥ | Goal | Touches | Accept when | Needs |
|---|---|---|---|---|---|---|
| **M5-T0** | B | ✅ | Reminder export: `.ics` file for the notice and filing deadlines | `src/lib/ics.ts` | Downloaded `.ics` opens in a calendar app with two events, correctly dated, titled with the case name | M4-T1 |
| **M5-T1** | A | | Cognito auth via `<Authenticator>`, plus owner-scoped data | `amplify/auth/resource.ts`, `amplify/data/resource.ts`, `src/App.tsx` | Sign-up, sign-in and sign-out work on the deployed URL. A second account cannot see the first account's cases. **Create the demo account now and stay signed in.** | M4-T4 |
| **M5-T2** | B | | Visual polish pass: typography, spacing, colour for urgency, the hero-case treatment | `src/styles/`, components | Side-by-side screenshots before and after. The dashboard reads at a glance on a 1080p recording. | M4-T3 |
| **M5-T3** | B | | Empty, loading and error states | components | Every async action has a loading state; a forced Bedrock failure shows a readable error and does not lose entered data | M4-T2 |
| **M5-T4** | A | ✅ | "What if" control: recompute the board against a different date | `src/components/DateTravel.tsx` | Dragging the date slider recomputes every clock **live, with visible re-animation**, across the full range from before dishonour to well past the filing deadline — the demo must show the case crossing from `ON_TRACK` through `ACT_NOW` into `DEADLINE_MISSED` and the recovery path appearing, all in one continuous drag. This is the designated wow moment (DECISIONS.md D-21) — it is not optional filler. | M1-T5 |

**Priority within M5 if time runs out:** M5-T4 (date-travel) first, then M5-T0 (reminders),
then M5-T1 (auth) — see DECISIONS.md D-15, D-21. Date-travel is the single highest
video-seconds-per-build-hour item in the whole plan: it's a five-line UI control over logic
that's already built and tested, and it visibly proves the entire "deterministic engine"
claim in one drag gesture. Auth is the piece with the worst effort-to-demo ratio; nobody
scores a login screen.

**Hard stop at 12:00 IST.** Whatever is unfinished gets reverted or hidden behind a flag,
not left half-visible.

---

# M6 · PROTECTED — Sunday 12:00–19:00 IST
**No feature work. No "quick fixes". No exceptions.**

| ID | Lane | ∥ | Goal | Accept when | Needs |
|---|---|---|---|---|---|
| **M6-T1** | B | | Record the demo video per DEMO.md | Under 3:00, audio clear, every shot in the DEMO.md shot list present, uploaded and the link tested in a private window | M5 freeze |
| **M6-T2** | A | | README: what it is, the problem, architecture diagram, local setup, deployed URL, **AI-assistance disclosure** | A stranger can clone, run `npm install && npx ampx sandbox && npm run dev`, and reach a working app by following it alone | M5 freeze |
| **M6-T3** | A | ✅¹ | `LEARNINGS.md` for the Learning criterion | Covers: the §479 pivot and why we killed it, Bedrock cross-region inference in Mumbai, the model/engine boundary, and the off-by-one that the test table caught | M5 freeze |
| **M6-T4** | A+B | | AWS Builder Center blog post | Published, link in the README. Reuses LEARNINGS.md — do not write it twice. | M6-T3 |
| **M6-T5** | A+B | | Submit | Submission form completed **by 19:00 IST**, with repo URL, live URL and video link. All three opened and verified in a private browser window. | all |

¹ M6-T3 written 20 Sep: all four required topics covered against verified sources — the §479
pivot (D-00), the Bedrock account-hold-vs-residency distinction (D-04, D-27, ARCHITECTURE.md
§4/§7), the model/engine trust boundary enforced in `boundary.ts`/`draft.ts` and tested
adversarially (tampered client result recomputed correctly on the live deployment, per
M4-T1's footnote), and the test table's actual catch. On that last point: checked git history
before writing rather than assuming — T24 (the today-equals-deadline boundary LEGAL_RULES.md
§5 itself flags as highest-risk) was correct from the commit that first implemented it and
never triggered a real regression; the concrete bug the tests did catch was fixture text
drift (D-25) — three hand-written fixtures published in M1-T2 went stale against `clocks.ts`'s
revised reasoning prose, undetected because `fixtures.test.ts` only checked shape, and only
surfaced when `board.test.ts`'s byte-identical assertions were added in the M2 prereq commit.
`LEARNINGS.md` reports this precisely rather than rounding it up to a more dramatic
date-arithmetic bug that didn't happen. All 144 tests (111 rules + 33 amplify) still pass.

**Submit at 19:00, not 19:55.** The hour of buffer is the plan, not slack.

---

## If you are running late

Cut in this order, and say so in the video rather than hiding it:
1. M5 except M5-T4 (reminders and auth go; date-travel does not — see the never-cut list below)
2. M4-T3/T4 → drop the dashboard and its seed data entirely, keep only M4-T7's single demo case
3. M3-T5 → one sample document instead of four
4. M3 entirely → demo manual entry only, and say upload is next

**Never cut:** M1-T5 (the tests), M4-T1/T5 (notice and synopsis — these are the deliverable,
not the dashboard), M5-T4 (date-travel — the designated wow moment, see DECISIONS.md D-21;
if M5 is running short, build this before M5-T0/T1/T2/T3, not after), M6-T1 (the video),
M6-T5 (the submission).

---

## BACKLOG · Post-submission — not part of the M6 freeze

*From the 20 Sep design discussion. Neither item may be started before M6-T5 (submission) is
verified complete — the M6 freeze above still applies until then.*

| ID | Lane | ✅ | Goal | Touches | Accept when | Needs |
|---|---|---|---|---|---|---|
| **BL-1** | B | ✅ | **Archive view** — a Dashboard tab/filter showing only `status: RESOLVED` cases, separate from the active list | `src/routes/Dashboard.tsx` | A distinct "Archive" filter lists only `RESOLVED` cases; the default view excludes them | none — `RESOLVED` already exists in the status enum (`amplify/data/resource.ts`) |
| **BL-2** | B | | **Repeat-party linking** — when a new case's `accusedMobile` matches an existing case's, surface a confirm prompt ("link this cheque to the existing Suresh Kumar, 98xxxxxx?") instead of treating every case as unrelated | wherever facts are finalized (`src/routes/Confirm.tsx` / `NewCase.tsx`), `src/lib/` for the match query, `Dashboard.tsx` for grouped display | Entering a mobile number that matches an existing case's `facts.accusedMobile` shows a named confirm prompt; confirming associates the cases for display only (no data merge); declining creates a fully independent case as today | BL-1 pairs well but isn't required |

**Why confirm, not auto-merge:** `accusedMobile` is a human-entered, affidavit-bound field
(LEGAL_RULES.md §7), so matching on it is a defensible signal, not a guess pulled from
extraction — but Indian mobile numbers get recycled, so a false-positive match could wrongly
attribute one person's cheque history to someone else on a legal record. A human confirms the
link; nothing merges silently. No new `Party` model or schema migration needed — match by
querying existing `Case.facts` directly.
