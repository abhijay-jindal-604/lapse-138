# DECISIONS.md

Every significant choice, what else was on the table, and why. Dated, because several of
these were made under time pressure and the reasoning matters more than the conclusion.

---

## D-00 · Pivot away from the original idea — BNSS §479 undertrial release
**17 Sep 2026, planning session. Decided by: the team.**

The project began as a triage tool to find undertrial prisoners eligible for release under
§479 BNSS. During planning we verified the statute and the case law and abandoned it.

**Why.** §479(2) bars release where "an investigation, inquiry or trial in more than one
offence or in multiple cases" is pending. Filing multiple sections in a single FIR is
routine Indian police practice, so the exception swallows the rule. We looked specifically
for a High Court decision reading "more than one offence" down to mean separate cases only,
and found none — the Karnataka High Court in *K. Ramakrishna v. ED* (Nov 2024) went the
other way and applied the bar strictly. The empirical check settled it: under the MHA
Special Campaign following the Supreme Court's order in *In re: Inhuman Conditions in 1382
Prisons*, states identified 951 suitable undertrials nationwide and released 334, against an
undertrial population of roughly 4.3 lakh.

A tool whose correct answer is "no" for most of its users is not a tool. We would have spent
the weekend building something that looked impressive and helped nobody.

**Kept from it:** the architecture — document in, AI extracts, human confirms, deterministic
engine decides, AI drafts the output. That skeleton was always the good idea; §479 was just
the rule set plugged into it.

**Cost of the pivot:** roughly three hours of planning, no code. Made at the right time.

---

## D-01 · Track: Ship It
**Alternatives:** Build It (local models via Strands, LocalStack, SAM).

Ship It carries the grand prize and scores architecture and cost decisions, which is where a
deliberate design has something to say. Build It would mean running local models, which on
two laptops over a weekend is a reliability gamble for a recorded demo, and it forfeits the
first prize. Bedrock also makes the "the model never decides" boundary easier to demonstrate
convincingly, because the model call is a visible, isolated, logged thing.

---

## D-02 · Amplify Gen 2, all TypeScript
**Alternatives:** SAM + Python Lambdas with a separate Amplify Hosting frontend; Amplify Gen 2
with one Python Lambda for the rules engine.

One repo, one language, one deploy command, one mental model, across two people who will be
working in parallel and tired. Auth is the deciding factor: Cognito via the Amplify
`<Authenticator>` component is genuinely about twenty minutes of work, where hand-wiring a
user pool, app client, redirect URIs and token handling is most of a day and is exactly the
kind of task that eats a Sunday.

The cost of not choosing Python is pytest, which is nicer than vitest. That is a small price
for not maintaining two toolchains. The deciding consideration against the hybrid option was
that the rules package must be importable by both the browser and a Lambda; in TypeScript
that is free, and in a mixed stack it means implementing the engine twice.

---

## D-03 · The rules engine is a shared package with no dependencies and no I/O
**Alternatives:** logic inside the React components; logic only in a Lambda.

A pure function of `(facts, today)` is testable without mocks, runs identically in the
browser and in Lambda, and gives the browser instant feedback with no round trip. Putting it
only in a Lambda would make every keystroke a network call. Putting it only in the browser
would mean a tampered client could produce a wrong notice, so `draftNotice` recomputes
server-side with the same module.

No date library. Not `date-fns`, not Luxon, not `dayjs`. The arithmetic we need is about
sixty lines of calendar math, and a library that silently applies a timezone to a calendar
date is precisely the bug this project cannot afford.

---

## D-04 · Bedrock models: Haiku 4.5 for extraction, Sonnet 4.5 for drafting
**Alternatives:** Sonnet for both; Amazon Nova, which is natively available in `ap-south-1`.

Extraction is a structured, constrained task on a short document; Haiku 4.5 is fast and
cheap and keeps the confirmation screen snappy on camera. Drafting a legal notice is a
writing task where quality is visible to a judge watching the video, so it gets Sonnet 4.5.
Total weekend spend either way is under a dollar, so this is a latency and quality call, not
a cost one.

Nova was the alternative that would have kept inference inside India. We chose Claude for
output quality on the legal drafting, and we document the residency trade-off honestly
rather than hiding it (ARCHITECTURE.md §4). If Bedrock access turns out to be blocked on
this account, the fallback is the same models in `us-east-1` for the two Lambdas only.

Both model IDs are **global cross-region inference profiles** — `global.anthropic.*`. A
plain model ID will not work from `ap-south-1`, and that is a five-minute confusion waiting
to happen at 2 a.m.

**M0-T1 note, 2026-09-18:** brand-new AWS account (created same day). `Converse` initially
failed with `AccessDeniedException: Your account is currently being verified` (an account-wide
new-account fraud-prevention hold, not region- or model-specific — `s3 ls`, `budgets
describe-budgets` and `bedrock list-foundation-models` all worked fine throughout). After
that cleared, it then failed with `ValidationException: Operation not allowed` — Anthropic's
one-time "submit use case details" form (`PutUseCaseForModelAccess`), which itself returned
`Your account is not authorized to perform this action` when submitted, i.e. blocked by the
same underlying account-verification hold, not a form problem. This is **not** the
region/model-access failure mode this note originally anticipated, so the `us-east-1`
fallback would not help — the block is account-wide, not per-region. Decision: wait for AWS's
own account verification (their message says normally &lt;2 hours) rather than switch region,
and proceed on all non-Bedrock M0/M1 work in the meantime. If still blocked well beyond a
couple of hours, open an AWS Support "Account and billing" case (free on Basic support).

**M0-T1 retry, 2026-09-18 10:53 IST:** re-ran the same `converse` call — still
`ValidationException: Operation not allowed`, same failure mode as above, hold not yet
cleared. Proceeding with M0-T5 (backend skeleton) in the meantime since it needs
CloudFormation/AppSync/DynamoDB/S3 only, none of which are affected by this hold.

---

## D-05 · No Textract
**Alternatives:** Textract for OCR, then Bedrock for structuring.

Bedrock's Converse API accepts PDF document blocks and JPEG/PNG image blocks directly, and
the demo documents are typed English. Textract would add a service, an IAM role, an async
job pattern for multi-page documents, and roughly two hours, to solve a problem we do not
have. It stays in the roadmap for handwritten and regional-language documents, where it
genuinely is the right tool.

---

## D-06 · Authentication: yes, Cognito, but in M5
**Alternatives:** no auth; a shared password gate.

It is close to free with Amplify Gen 2, it is a real AWS service in the architecture
diagram, and owner-scoped data authorisation is the natural way to keep one user's cases
away from another's. But it is not on the path to a working demo, so it lands in M5. If M5
runs out of time, the app ships public with a sample-data banner and Cognito becomes a
roadmap line. **Auth must never be the reason the demo cannot be recorded.**

---

## D-07 · Store the computed result as a snapshot, not a live computation
**Alternatives:** recompute on every read.

The dashboard's entire value is sorting by urgency, and sorting requires a stored key. A
snapshot with a visible `computedAt` is honest about staleness; recomputing on read would
mean loading every case to sort them. The cost is a recompute affordance when a result is
older than today, which is a feature — it shows the user that deadlines move.

---

## D-08 · Money as integer paise
Floating-point rupees in a document about someone's ₹3.2 lakh is the kind of detail that
makes a careful judge stop trusting the rest of it. Integers everywhere, formatted only at
the render edge.

---

## D-09 · `today` is a parameter, never a call inside the engine
Makes all 27 tests deterministic, makes "what will this look like next Tuesday" a one-line
demo, and removes an entire class of midnight-IST bugs. Costs nothing.

---

## D-10 · Ship 12 verified sample cases, not a large seeded database
A dashboard needs enough rows to look real and to demonstrate urgency sorting. Twelve
covers every status in the test table, including one hero case at the top. Generating fifty
would look better in a screenshot and cost an hour we do not have.

---

## D-11 · Feature freeze at Sunday 12:00 IST
**Alternatives:** build until the last safe moment.

The judges see a three-minute video and a README. Nothing else. A feature that exists but is
not in the video scores zero, and a broken recording scores less than zero. Eight hours for
video, README, learning log and blog post is not generous; it is the minimum that does not
require luck. The freeze is not a suggestion.

---

## D-12 · Corrected the headline pendency number: 43 lakh, not 3.3 crore
**18 Sep 2026, external review caught it.**

The original pitch opened with "India has ~3.3 crore pending cheque-bounce cases." That
figure is closer to *total criminal pendency in district courts*, not §138 cases
specifically. The correct, sourced figure is **43,05,932** cheque-bounce cases pending
nationwide as of 20 Dec 2024 (Law Minister, written reply to Lok Sabha). An 8x error in the
opening sentence is exactly the kind of thing a legally-literate judge catches immediately,
and it would have discredited everything that followed it.

The corrected framing cited "~30% of all trial-and-High-Court criminal pendency nationally
(Supreme Court's own committee)" alongside 6,50,283 pending in Delhi's district courts as of
1 Sep 2025 (*Sanjabij Tari v. Kishore S. Borcar*, 2025 INSC 1158). **A second review (D-17)
found the 30% figure itself needed the same treatment** — see D-17 for the correction.

**What we still don't have, and say so rather than paper over:** a count of how many
complaints are actually dismissed as time-barred or premature. That is the number that would
directly prove the deadline-miss problem; pendency is a proxy for it at best, and we could
not find it in the time available. Better to name the gap on camera than borrow a number
that doesn't quite fit the claim.

---

## D-13 · A missed deadline shows a recovery path, not just a status
**18 Sep 2026, external review.**

The original design treated `DEADLINE_MISSED` as close to terminal. Two things make that
wrong: re-presenting the cheque within its remaining validity restarts the notice clock
(*MSR Leathers v. S. Palaniappan*, (2013) 1 SCC 177), and a late complaint can still be filed
on an application to condone the delay for sufficient cause (proviso to §142(1)(b)). Both
were already documented in LEGAL_RULES.md's clock logic but were framed as footnotes.

Given that most people who ever open this tool will already be past a deadline — that is
precisely when someone goes looking for help — a product whose answer to "I'm late" is only
"you're out of luck" is not useful to its most realistic user. `recoveryPath` is now
documented as co-equal output with the deadline itself (LEGAL_RULES.md §3), and the UI
requirement is that it renders with the same visual weight, not as greyed-out fine print.

---

## D-14 · Add structured-synopsis generation (*Sanjabij Tari*) as a must-have, ranked above the dashboard
**18 Sep 2026, external review.**

*Sanjabij Tari v. Kishore S. Borcar* (2025 INSC 1158, 25 Sep 2025) directs every §138
complainant to file a structured synopsis of cheque particulars, dishonour, statutory
notice, and relief sought, with High Courts operationalising the reform from 1 Nov 2025.
This app already collects and date-stamps nearly every field that synopsis needs by the time
a user has confirmed their facts and generated a notice — producing it is close to a
formatting pass, not new work, and it needs **no Bedrock call at all** (ARCHITECTURE.md §2,
steps 14–16), which makes it cheap in both build time and risk.

This is now judged more valuable than the sample-case dashboard: it turns the product from
"a calculator that tells you a date" into "the document every §138 complainant in India must
now file, generated from data you've already verified." Landed in M4, alongside the notice,
both must-have. The dashboard survives but is explicitly demoted (ARCHITECTURE.md §3, DEMO.md).

---

## D-15 · Reminders (.ics / scheduled email) return to scope, in M5
**18 Sep 2026, external review.**

Originally cut as out-of-scope alongside SMS/WhatsApp. The critique's point stands: a
deadline app that has to be remembered and reopened has not actually prevented the harm it
describes. An `.ics` calendar export, or a single scheduled reminder email at day 20 and day
27 of the notice window, is cheap relative to its effect and is exactly the kind of thing
that turns "a calculator" into "a thing that changes an outcome." Placed in M5 as the first
nice-to-have, ahead of Cognito auth — if only one of the two ships, this is the one that
should.

---

## D-16 · Realistic user is a repeat handler, not a first-time unrepresented litigant
**18 Sep 2026, external review.**

"An unrepresented person who just got a bounce memo is not going to discover a web app
inside 30 days" is a fair challenge to the original framing. The emotionally vivid hook (a
named small trader with days left) stays in the demo script — it is still the clearest way
to make the stakes concrete in fifteen seconds — but the stated target user changes from "a
lone unrepresented person" to **MSMEs and traders with recurring bounces, NBFC/recovery-team
staff, and junior lawyers or legal-aid clinics who would plausibly use this weekly.** The
demo narration says this explicitly rather than leaving the distribution question
unanswered for a judge to raise. PLAN.md and DEMO.md updated accordingly.

---

## D-17 · The 30% pendency figure is real but was attributed and used wrongly
**18 Sep 2026, second external review.**

D-12's correction still cited "cheque-bounce cases are ~30% of total trial-and-High-Court
criminal pendency nationally (Supreme Court's own committee)." That claim doesn't survive
contact with the Court's own paper trail. When the five-judge bench set up the pendency
committee in March 2021, it *orally* observed that §138 matters ran close to 30% of pendency
at trial courts and High Courts — reported contemporaneously, including by Supreme Court
Observer citing a 30–40% range. But the Court's **written** judgment in the same proceeding,
dated 16 April 2021, records that as of 31.12.2019 total criminal pendency was 2.31 crore, of
which 35.16 lakh were §138 cases — about **1.5%**, not 30%. The Court said both things, four
weeks apart, in the same matter: the 30% is a press report of an oral observation from the
bench; the 1.5% is arithmetic in the signed judgment, publicly available at api.sci.gov.in.

**Two fixes, both made:**
1. **Attribute precisely.** "The bench hearing the suo motu petition observed that §138
   matters were close to 30% of pendency at trial courts and High Courts" is defensible.
   "~30% of all pending criminal cases (Supreme Court's own committee)" is not — it wasn't
   the committee, it was the bench at the hearing where it created the committee, and "all
   pending criminal cases" is the reading the 1.5% figure contradicts.
2. **Don't lead with it.** The pitch's strongest framing doesn't need a contested percentage:
   the Supreme Court has intervened in §138 pendency three times in five years and, as of 1
   November 2025, mandates a filing format for every complaint in the country. That claim is
   about institutional behaviour and can't be fact-checked into the ground the way a
   percentage can.

**Also corrected:** the Delhi figure (6.5 lakh, *Sanjabij Tari*, 1 Sep 2025) and the national
figure (43 lakh, Lok Sabha, 20 Dec 2024) are never combined in one sentence again — different
datasets, different dates, and juxtaposing them implied a consistency ("Delhi is 15% of
India's docket") that the underlying filings don't actually support. PLAN.md and DEMO.md
updated to keep these separate and precisely sourced.

---

## D-18 · The affidavit is a liability boundary the app must never cross
**18 Sep 2026, second external review.**

*Sanjabij Tari* also requires the complainant to file, with the complaint, the accused's
email, mobile number and WhatsApp/messaging details, supported by an affidavit that those
particulars pertain to the accused — with the court free to act against the complainant if
that affidavit is later found false. That means the filing package now contains a sworn
statement with a penalty attached, and this app must never pre-fill, infer, or auto-assert
anything that flows into it.

`accusedEmail`, `accusedMobile` and `accusedMessagingDetails` are added to `CaseFacts` as a
third human-only field group (LEGAL_RULES.md §2), never extractable from a document, never
defaulted, rendered with an explicit "verify before you swear to this" warning wherever they
appear (§7), and carried into the synopsis verbatim with no model involvement at all
(ARCHITECTURE.md §2). The app does not generate affidavit text under any circumstance. This
is "the model never decides" applied one layer further out: not just "the app doesn't compute
dates," but "the app doesn't put words in your mouth under oath."

---

## D-19 · Salvage logic branches into three non-interchangeable paths, gated on cheque validity
**18 Sep 2026, second external review.**

D-13 established that a missed deadline gets a recovery path, not a tombstone. This decision
corrects a subtler bug: the plan text described the *notice* salvage (re-presentation) and
the *filing* salvage (condonation) as if either could apply to a "late complaint," which
isn't true and would give users the wrong answer at the moment they most need the right one.

The three failures and their answers, now made explicit in LEGAL_RULES.md's Clock 2 and
Clock 4 sections:
1. **Missed the 30-day notice window** → condonation does not apply (the §142(1)(b) proviso
   covers delay in filing the complaint, not delay in issuing notice). Only re-presentation,
   gated on the cheque still being within its 3-month validity, opens a new cause of action —
   and it restarts the *entire* chain (fresh dishonour, fresh 30-day notice, fresh 15-day
   wait, fresh filing window), not just the one clock.
2. **Filed before the 15 days expired (premature)** → not curable by waiting at all.
   *Yogendra Pratap Singh* holds the defect can't be cured; the complaint must be withdrawn
   and refiled on a fresh cause of action.
3. **Missed the 1-month filing window** → condonation on sufficient cause is genuinely
   available here, and only here.

If the cheque's presentation validity has also expired, the re-presentation door in branch 1
is closed and the honest remaining answer is a civil suit on the underlying debt — the last
rung of the hierarchy, not a silent dead end, and now stated as such rather than stopping at
"re-present or condone."

---

## D-20 · The demo leads with the blown-deadline case, not the healthy one
**18 Sep 2026, second external review.**

The original script opened on a case with "4 days left" — a clean, on-time case, chosen
because a big red countdown reads well on camera. But D-16 already established the realistic
user of this tool is someone handling a case that is *already* late, not someone who found
the tool inside their own window. Opening the demo on the easy case demos a different
product's use case.

DEMO.md's hook now opens on `DEADLINE_MISSED` — day 45, notice window closed — and the
walkthrough shows the cheque-validity check that decides whether re-presentation is still
open, the recovery path with the earliest-permissible re-filing date, and only then the
synopsis (generated with zero model calls) and the test suite on screen. Those are the three
beats that prove the product actually does what its pitch claims for the user it says it's
for.

---

## D-21 · Date-travel is the designated wow moment; scope stays disciplined everywhere else
**18 Sep 2026, product call.**

Asked directly whether the project should be more ambitious for a bigger "wow," the answer is
scope discipline everywhere except one deliberately chosen crazy-looking moment. We are
**not** adding a second live rule pack, extra AWS services, or new build surface this
weekend — the plan's narrow scope (one rule pack, one jurisdiction, payee-side only) is a
hedge against a broken demo, not a lack of ambition, and D-11's feature freeze stands.

Instead, **M5-T4 (the date-travel "what if" slider) is promoted from a nice-to-have to the
single most protected feature after the core engine and the notice/synopsis pair.** It costs
almost nothing to build — a slider over logic that's already written and tested — and it is
the most visually dramatic five seconds available: dragging one control live moves a real
case through `ON_TRACK` → `ACT_NOW` → `DEADLINE_MISSED` with the recovery path appearing, with
no reload and no network call, proving the entire "the model never decides, the engine does"
claim in a way no amount of narration can. DEMO.md's script and shot list were restructured
around it (see D-20's reordering); TASKS.md's late-running cut order now protects it ahead of
every other M5 item, including reminders and auth.

---

## D-22 · A STRETCH tier exists, above M5, for if M4 finishes early
**18 Sep 2026, product call.**

Asked directly whether the project is locked to its current scope or can get more ambitious
with time, the honest answer was two different things: the architecture is deliberately
extensible (rule-pack pattern, JSON-blob facts/results, composable Amplify pieces — see D-00,
D-03), but the weekend's build order was a flat list with a hard freeze and no explicit place
to point extra time if M0–M4 went well. That's a gap: ambition needs a concrete target or it
turns into scope creep instead of a bigger wow.

A new STRETCH tier sits between M4 and M5 in TASKS.md: five ranked, independently-discardable
items (a second live rule pack, a Bedrock Q&A panel constrained to the engine's own dates, a
formatted PDF export, live bulk intake via Step Functions, and a shared live case view via
AppSync subscriptions), each sized to be buildable in hours, not days, and each explicitly
disposable if it isn't finished. The highest-ranked item, a second rule pack, is the strongest
possible demonstration of the "engine, not app" claim — it was declined earlier (D-21) as the
*primary* wow moment because it carries real risk to the weekend timeline, but it belongs here
as a reach goal precisely because the risk is now bounded: if it doesn't land, it's cut and
nothing else is affected.

**This tier changes nothing about the non-negotiables.** M1–M4 remain the actual deliverable,
M5-T4 (date-travel) remains the protected wow moment, and D-11's Sunday-12:00 feature freeze
is absolute — a half-built stretch item on camera is worse than not attempting it. DEMO.md is
deliberately not being rewritten around this tier yet; the video script gets reconciled with
whatever actually got built, at the end, not speculatively now.

---

## D-23 · M1-T5 closeout: advisory filing date, synopsis shape, and the full test-table audit
**18 Sep 2026, M1-T5 implementation.**

Three judgment calls the M1-T4 handoff flagged as open, resolved while writing the tests
that actually exercise them:

1. **`earliestSafeFilingDate`'s pinning to the advisory range's latest bound stands.** Writing
   T25's full assertions (not just the payment-window range M1-T4 already covered) confirmed
   the reasoning holds: filing on the *earliest* bound risks a premature complaint if actual
   service lands later in the estimated window, and prematurity is uncurable by waiting
   (*Yogendra Pratap Singh*, Clock 4). Pinning to the latest bound is the only choice that
   can't produce a premature filing off an estimate. Not changed.

2. **§5's T27 row says "all four sections populated"; §3's Annexure list actually names seven
   field-groups** (parties, cheque, dishonour, statutory notice, cause of action, relief
   sought, accused's contact particulars). Treated the Annexure list in §3 as authoritative,
   since it's the literal transcription §3 itself insists on, and the "four sections" phrase
   in the §5 summary row as loose paraphrase, not a spec. `SynopsisResult` implements all
   seven groups; the T27 test asserts substance (every field traceable to `CaseFacts` or
   Clock 3) rather than a section count nowhere else in the document.

3. **No `computeClockBoard` orchestrator exists, and `computeSynopsis` doesn't need one.**
   Every synopsis field is either a direct `CaseFacts` copy or Clock 3's `causeOfActionDate`
   — no other clock result contributes anything the synopsis needs — so the signature is
   `computeSynopsis(facts, clock3)`, matching `computeOverallStatus`'s existing pattern of
   taking individual clock results rather than a pre-assembled board. Building an
   orchestrator now would be new scope nothing in M1-T5 asked for.

Also closed: a literal T01–T27 audit (`packages/rules/test/table.test.ts`) checks every
LEGAL_RULES.md §5 row by its own number against the full gateA→clock1-4→overallStatus
pipeline, so "all 27 tests pass" is checkable directly rather than inferred from the
scenario-by-scenario tests M1-T3/T4 already wrote (those stay, unchanged).

---

## D-24 · TASKS.md's ✅ marks were not tracking reality; re-audited against the repo
**18 Sep 2026, after M1-T5.**

Before scoping the next task, checked git history on `TASKS.md` and found that most of its ✅
marks — M1-T6 through M1-T8, M2-T3, M3-T3/T5/T6, M4-T3/T4/T5/T6/T7, M5-T0/T2/T3/T4, M6-T2/T3 —
were **already present in the very first commit** (`f0a2e58`), before any of that work could
possibly have happened. They read as aspirational placeholders left over from drafting the
plan, not as a record of anyone actually finishing them. Confirmed by absence, not just by
commit dates: `src/` holds only the default Vite scaffold (`App.tsx`, `main.tsx`,
`index.css`); there is no `src/routes/`, `src/components/`, `amplify/functions/`, `samples/`,
`scripts/`, `README.md`, or `LEARNINGS.md` anywhere in the repo, and `git log --all` /
`git branch -a` show only Lane A's own commits on a single `main` branch — no second lane's
work exists on any branch, stash, or remote ref.

In the other direction, M0-T5 and M1-T1 through M1-T4 were genuinely finished (real files,
real commits, tests passing) but had never been checked off — an undercount in the opposite
direction, from the same root cause: the ✅ column was never being actively maintained as work
landed.

**Net effect: as of this morning, essentially none of the React frontend (Lane B) has been
built**, despite M1's UI tasks (M1-T6/7/8) reading as done. That's the actual state the next
task should be planned against, not the table as previously written. M0-T1 (Bedrock) is
separately unchecked per D-04 — the account-verification hold was still open on the last
retry logged there, unrelated to this audit.

**Fix applied:** every checkmark in TASKS.md re-verified against a real commit or an existing
file and corrected in both directions; a note is now pinned near the top of TASKS.md pointing
here so a reader doesn't trust any ✅ that predates it without re-checking.
