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
| **M0-T1** | A | | Prove Bedrock is reachable in `ap-south-1` via the global inference profile | nothing (CLI only) | `aws bedrock-runtime converse --region ap-south-1 --model-id global.anthropic.claude-haiku-4-5-20251001-v1:0 ...` returns model text. Paste the output in chat. **If this fails after 30 minutes, stop and switch the two Lambdas to `us-east-1`, then record it in DECISIONS.md D-04.** | — |
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
| **M3-T1** | A | | `extractFacts` Lambda: Bedrock Converse with a document/image block, structured JSON out | `amplify/functions/extractFacts/` | Given the sample memo, returns JSON with cheque number, date, amount, memo date and dishonour reason, each with `confidence` and `sourceQuote` | M0-T1, M0-T5 |
| **M3-T2** | A | | Enforce the boundary in code | `amplify/functions/extractFacts/handler.ts` | A field returned without a `sourceQuote` is dropped. The six human-only fields **and the three affidavit-boundary fields** from LEGAL_RULES.md §2 are stripped from the model output unconditionally. A unit test proves both. | M3-T1 |
| **M3-T3** | B | | Upload UI to S3 with limits and error states | `src/components/Upload.tsx` | A PDF and a JPEG both upload; a 6 MB file is rejected with a readable message, not a crash | M0-T5 |
| **M3-T4** | B | | Confirmation screen | `src/routes/Confirm.tsx` | Every extracted field is editable and shows its source quote on hover; low-confidence fields are visibly flagged; the six human-only fields appear as explicit questions that must be answered before continuing | M3-T1, M3-T3 |
| **M3-T5** | A+B | | Four fictional sample documents: a dishonour memo, a bank return memo, a cheque image, a memo with a missing field | `samples/` | All four upload and extract successfully. Every one is visibly watermarked **SAMPLE — NOT A REAL DOCUMENT**. No real names, banks, account numbers or IFSC codes. | M3-T1 |
| **M3-T6** | B | | Render the advisory receipt-date range (logic already tested in M1-T5/T25) in the confirmation and clock-board UI | `src/components/ClockBoard.tsx` | An `unknown`-service-mode case shows the advisory window in visibly distinct (dashed/muted) styling next to computed deadlines, labelled "advisory"; entering an actual receipt date replaces it with a normal computed deadline | M1-T5, M1-T8 |

**M3 exit:** upload → extract → confirm → correct clock board, on the live URL. Tag `m3-demoable`.

---

# M4 · Notice, synopsis and dashboard — Saturday 16:00–22:00 IST
*Proves: the user leaves with something they can actually use — and with the document the
Supreme Court now requires them to file, not just a calculator result.*

| ID | Lane | ∥ | Goal | Touches | Accept when | Needs |
|---|---|---|---|---|---|---|
| **M4-T1** | A | | `draftNotice` Lambda: recompute clocks server-side, then draft around fixed dates | `amplify/functions/draftNotice/` | The returned notice contains the §138 demand, the cheque particulars, the 15-day payment demand, and dates **identical** to the engine's output. A test that feeds the Lambda a tampered client-side result proves it uses its own computation. Also includes the registered-post/tracking-receipt reminder line. | M1-T5, M2-T2 |
| **M4-T2** | B | | Draft notice editor and download | `src/routes/Draft.tsx` | The draft is editable in place, carries the "DRAFT — for review by a qualified advocate" header, and downloads as a `.txt` that opens cleanly | M4-T1 |
| **M4-T5** | A | | Wire the synopsis-assembly function (already tested in M1-T5/T27) into the `draftNotice` Lambda as a model-free path | `amplify/functions/draftNotice/synopsis.ts` | Given a saved case, returns the synopsis with the "DRAFT SYNOPSIS" header, the accused's contact particulars carried through verbatim with the affidavit-warning line attached, and CloudWatch logs show zero Bedrock invocations for this path | M1-T5, M2-T2 |
| **M4-T6** | B | | Synopsis editor and download | `src/routes/Synopsis.tsx` | Editable in place, downloads as `.txt`, reachable from the same case detail view as the notice | M4-T5 |
| **M4-T3** | B | | Dashboard sorted by urgency — secondary surface, not the demo lead | `src/routes/Dashboard.tsx` | Cases are listed sorted by `nextDeadlineDate` ascending, with status chips and a visible day count. The most urgent case is unmistakably at the top. | M2-T2 |
| **M4-T4** | A | | Seed 12 sample cases covering every status, including the hero case | `scripts/seed.ts` | Running the seed script populates 12 cases; all six statuses appear; the hero case sits at the top of the dashboard; every case has `isSample: true` and the sample banner shows | M4-T3 |
| **M4-T7** | A | | One real (redacted) sample dishonour memo for the demo, distinct from the four synthetic samples in M3-T5 | `samples/demo-case/` | Extracts cleanly and produces a **`DEADLINE_MISSED`** result — the notice window already blown, `recoveryPath` populated with the re-presentation salvage gated on live cheque validity — with a non-trivial reasoning chain. This is the case the video actually walks through, not a dashboard row and not a healthy one; the realistic user is already late, so the demo shows that case, not the easy one. | M3-T1, M4-T5 |

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
| **M5-T0** | B | | Reminder export: `.ics` file for the notice and filing deadlines | `src/lib/ics.ts` | Downloaded `.ics` opens in a calendar app with two events, correctly dated, titled with the case name | M4-T1 |
| **M5-T1** | A | | Cognito auth via `<Authenticator>`, plus owner-scoped data | `amplify/auth/resource.ts`, `amplify/data/resource.ts`, `src/App.tsx` | Sign-up, sign-in and sign-out work on the deployed URL. A second account cannot see the first account's cases. **Create the demo account now and stay signed in.** | M4-T4 |
| **M5-T2** | B | | Visual polish pass: typography, spacing, colour for urgency, the hero-case treatment | `src/styles/`, components | Side-by-side screenshots before and after. The dashboard reads at a glance on a 1080p recording. | M4-T3 |
| **M5-T3** | B | | Empty, loading and error states | components | Every async action has a loading state; a forced Bedrock failure shows a readable error and does not lose entered data | M4-T2 |
| **M5-T4** | A | | "What if" control: recompute the board against a different date | `src/components/DateTravel.tsx` | Dragging the date slider recomputes every clock **live, with visible re-animation**, across the full range from before dishonour to well past the filing deadline — the demo must show the case crossing from `ON_TRACK` through `ACT_NOW` into `DEADLINE_MISSED` and the recovery path appearing, all in one continuous drag. This is the designated wow moment (DECISIONS.md D-21) — it is not optional filler. | M1-T5 |

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
| **M6-T3** | A | | `LEARNINGS.md` for the Learning criterion | Covers: the §479 pivot and why we killed it, Bedrock cross-region inference in Mumbai, the model/engine boundary, and the off-by-one that the test table caught | M5 freeze |
| **M6-T4** | A+B | | AWS Builder Center blog post | Published, link in the README. Reuses LEARNINGS.md — do not write it twice. | M6-T3 |
| **M6-T5** | A+B | | Submit | Submission form completed **by 19:00 IST**, with repo URL, live URL and video link. All three opened and verified in a private browser window. | all |

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
