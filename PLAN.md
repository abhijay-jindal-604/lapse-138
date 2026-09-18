# Lapse — the deadline clock for cheque-bounce claims

**One line:** The Supreme Court has intervened in §138 NI Act cheque-bounce pendency three
times in five years, and since 1 November 2025 mandates a filing format for every complaint
in the country — the same bench, when it set up its pendency committee in March 2021,
observed that §138 matters ran close to 30% of pendency at trial courts and High Courts. 43
lakh cheque-bounce cases are pending nationwide; a separate, later filing (Delhi, 1 Sep 2025)
put the Delhi district-court §138 docket at 6.5 lakh. The people who lose these cases most
often are the ones who missed a 30-day deadline nobody was counting for them. Lapse takes a
dishonour memo, extracts the dates, tells you exactly which deadlines are running and which
are recoverable, drafts the statutory notice, and generates the structured case synopsis the
Supreme Court now requires every complainant to file.

**Numbers, checked, with sources, and one contradiction we're naming rather than hiding**
(see DECISIONS.md D-12, D-17): 43,05,932 cheque-bounce cases pending nationwide as of 20 Dec
2024 (Law Minister, written reply to Lok Sabha). 6,50,283 pending in Delhi district courts as
of 1 Sep 2025 (*Sanjabij Tari v. Kishore S. Borcar*, 2025 INSC 1158) — this is a §138-only
Delhi figure from a different date and a different filing than the national number, and the
two are never combined into one sentence that implies they're comparable.

**On the 30% figure specifically:** the same five-judge bench, in the *oral* hearing where it
set up the pendency committee (March 2021), observed that cheque-bounce cases were "almost
30 per cent" of total pendency at trial courts and High Courts — reported contemporaneously,
including by Supreme Court Observer citing a 30–40% range. But the Court's own **written**
judgment in that proceeding, dated 16 April 2021, records that as of 31.12.2019 total
criminal-case pendency was 2.31 crore, of which 35.16 lakh were §138 cases — about **1.5%**,
not 30%. The Court said both things, four weeks apart, in the same matter: the 30% is a press
report of an oral observation from the bench; the 1.5% is arithmetic in the signed judgment.
We attribute the 30% precisely — "the bench hearing the suo motu petition observed that §138
matters were close to 30% of pendency at trial courts and High Courts," never "~30% of all
pending criminal cases" and never as a finding of "the Supreme Court's own committee" (it
wasn't the committee, it was the bench at the hearing that created it) — and we do not lean
on it as the headline number. The institutional-behaviour framing (three interventions in
five years, a mandatory national filing format since 1 Nov 2025) carries the pitch instead,
because it can't be fact-checked into the ground the way a contested percentage can.

We do **not** have a number for how many complaints are actually dismissed as time-barred or
premature — that is the statistic that would directly prove the problem, and we could not
find it. Say so on camera rather than borrowing a pendency figure to stand in for it.

**Event:** WeMakeDevs x AWS "First Commit" (Bharat Builds Tour).
**Hard deadline:** Sunday 20 September 2026, 20:00 IST.
**Track:** Ship It (deployed on AWS with a live URL). See DECISIONS.md D-01.

---

## OPEN QUESTIONS

These need a human answer. Each has a default I will proceed with if nobody decides.

| # | Question | Who decides | Default if unanswered | Blocks |
|---|---|---|---|---|
| Q1 | Does the AWS account have Bedrock model access granted in `ap-south-1` for the `global.anthropic.*` inference profiles? Enablement is usually instant but is account-dependent. | Lane A, Friday 09:00 | If blocked after 30 min, fall back to `us-east-1` for the two Bedrock Lambdas only; everything else stays in `ap-south-1`. Record it in DECISIONS.md. | M3 |
| Q2 | Is the repo public? Organisers usually require a public repo for judging. | Both, Friday 09:00 | Public from the first commit. No secrets in the repo, ever. | M0 |
| Q3 | Who records and narrates the video? Accent, pace and a quiet room matter more than the edit. | Both, Saturday 20:00 | Lane B narrates, Lane A drives the screen recording. | M6 |
| Q4 | Do we publish the AWS Builder Center blog post under one name or both? | Both, Sunday 12:00 | Lane A publishes, both credited in the post body. | M6 |
| Q5 | Does the demo show the *payee* (creditor chasing money) side only, or also the *drawer* (person who issued the cheque) side? | Product call, Friday 12:00 | Payee only for v1. Drawer-side is a roadmap slide. | M2 |
| Q6 | Is "sufficient cause" delay condonation (proviso to §142(1)(b)) shown as a recovery path, or hidden to keep the UI simple? | Product call, Saturday 12:00 | Shown, as a clearly-labelled secondary path on the MISSED status only. | M2 |

---

## Who this is actually for

Not, realistically, a lone unrepresented person who discovers a web app inside their own
30-day window — that's an emotionally strong hook but not a credible distribution story, and
we say so rather than pretend otherwise (see DEMO.md). The real users are the people who
handle many of these at once and would use this weekly: **MSMEs and traders with recurring
bounces, NBFC/recovery-team staff, and junior lawyers or legal-aid clinics.** The hero case
in the demo is framed as "the kind of file a legal-aid clinic sees every week," not as a
walk-up user.

## What we are building

A web app for someone handling a cheque that bounced — on their own behalf or a client's.

The user uploads the bank's dishonour memo (or types the details), confirms the extracted
facts, and gets:

1. **A clock board.** Every statutory deadline in the §138 chain, each with its own status
   and a day count: presentation validity, the 30-day notice deadline, the 15-day payment
   window (with an *earliest-permissible* filing date, not just a last one — filing too early
   is fatal and uncurable, see LEGAL_RULES.md Clock 4), and the one-month complaint filing
   window.
2. **The reasoning.** For every deadline: the section it comes from, the trigger date it
   counts from, the counting rule applied, and the resulting date. Nothing is asserted
   without a citation and an arithmetic trail.
3. **A salvage path, not a tombstone, for every missed deadline — and the three failures are
   not interchangeable.** Missing the 30-day *notice* window has exactly one §138 salvage:
   re-presenting the cheque, which restarts the entire chain from a fresh dishonour (fresh
   30-day notice window, fresh notice, fresh 15 days, fresh 1-month filing window) — and only
   if the cheque is still within its 3-month presentation validity; condonation does not apply
   to a late notice, because the §142(1)(b) proviso covers delay in *filing the complaint*,
   not delay in issuing notice. Filing *before* the 15-day payment window closes is not
   curable at all — *Yogendra Pratap Singh* holds a premature complaint must be withdrawn and
   refiled on a fresh cause of action, not cured by waiting. Missing the 1-month *filing*
   window is the one case where condonation on sufficient cause is genuinely available. If the
   cheque's 3-month validity has also expired, the re-presentation door is closed and the
   honest remaining answer is a civil suit on the underlying debt — that is the last rung of
   the salvage hierarchy, not a silent dead end. Offering the wrong one of these four answers
   is worse than offering none. See LEGAL_RULES.md §3, DECISIONS.md D-13 and D-19.
4. **A draft statutory notice** under §138 proviso (b), generated from the confirmed facts,
   editable in the browser, downloadable, with a reminder to send it by registered/speed post
   and keep the tracking receipt — that receipt is the evidence of service the complaint will
   need later.
5. **A structured case synopsis**, in the format the Supreme Court mandated in *Sanjabij Tari
   v. Kishore S. Borcar* (2025 INSC 1158, effective 1 Nov 2025) for every §138 complaint —
   cheque particulars, dishonour, notice, and relief sought, transcribed field-by-field from
   the judgment itself (api.sci.gov.in, mirrored on scobserver.in), not paraphrased from a
   summary. We already collect and date-stamp nearly every field that annexure needs;
   generating it is close to free and turns the app from "a calculator" into "the document
   every complainant must now file." High Courts are issuing their own implementing practice
   directions (Delhi's on 6 Nov 2025), so we say plainly: **we implement the Supreme Court
   Annexure; state-level variations are a known limitation**, not a claim of national
   uniformity. See DECISIONS.md D-14 — this is the single highest-value feature in v1.
6. **A hard boundary around the affidavit.** *Sanjabij Tari* also requires the complainant to
   file, at the time of the complaint, the accused's email, mobile number and WhatsApp/
   messaging details — supported by an affidavit that those particulars pertain to the
   accused, with the court free to act against the complainant if that affidavit is later
   found false. Those fields are never pre-filled, inferred, or auto-asserted by this app:
   they are marked distinctly as "you must personally verify this before swearing to it," and
   the app never generates affidavit text at all. This is the same "the model never decides"
   principle applied one layer further out. See LEGAL_RULES.md §2/§7 and DECISIONS.md D-18.
7. A secondary dashboard of sample cases sorted by urgency. Kept, but demoted: seeded data
   reads as filler on camera, so the demo leads with one real (redacted) case run end to end
   — specifically one already past a deadline, not a healthy one — not the dashboard. See
   DEMO.md.

## The core design principle (non-negotiable)

**The language model never decides anything.** Bedrock is used for exactly two jobs:

- reading an uploaded document into structured fields, which a human then confirms or corrects
- turning already-confirmed facts into prose in a draft notice

Every date, every deadline, every status comes from a pure, deterministic, unit-tested
TypeScript function with no network access. If the rules engine and the model disagree, the
engine wins and the model is not consulted. This is the single most important thing to say
in the video.

The same principle extends to the affidavit-boundary fields (item 6 above): the model never
touches them, and the app never generates the sworn language they feed. Not just "the model
doesn't compute dates" — "the app doesn't put words in your mouth under oath."

## Shape of the solution

```
  Browser (React + Vite, TypeScript)
    │  Amplify Authenticator (Cognito)
    ├── upload  ──────────────► S3 (Amplify Storage)
    │                              │
    │                              ▼
    │                         extractFacts Lambda ──► Bedrock (Claude Haiku 4.5)
    │                              │                  returns fields + confidence
    │  ◄───────────────────────────┘
    │
    ├── human confirms/corrects every field
    │
    ├── packages/rules  ◄── PURE FUNCTION, runs in browser, no I/O
    │     computeClocks(facts, today) → ClockBoard
    │
    ├── save ─────────────────► Amplify Data (AppSync + DynamoDB)
    │
    └── draft ────────────────► draftNotice Lambda ──► Bedrock (Claude Sonnet 4.5)
                                   │  re-runs the SAME rules package server-side
                                   │  and stamps the authoritative dates into the notice
                                   ▼
                              editable draft → download
```

One repository. One deploy command. One language.

## Milestones against the clock

Feature work **ends Sunday 12:00 IST**. M6 is protected and contains no code.

| M | What it proves | Target finish (IST) |
|---|---|---|
| **M0** | Foundation: AWS account verified, Amplify Gen 2 app deployed to a live URL, Bedrock reachable. Ugly is fine. | Fri 12:00 |
| **M1** | The riskiest part works: rules engine computes the full §138 clock chain correctly and passes its test suite. Runs in a terminal, no UI. | Fri 19:00 |
| **M2** | Thin end-to-end slice: type case details into a form → correct clock board with full reasoning on the deployed URL. **Demoable.** | Fri 23:00 |
| **M3** | Upload a dishonour memo → Bedrock extracts fields → human confirms → same clock board. **Demoable.** | Sat 16:00 |
| **M4** | Draft statutory notice **and** structured synopsis (*Sanjabij Tari*) both generated, editable, downloadable. Minimal dashboard. **Demoable.** | Sat 22:00 |
| **M5** | Nice-to-haves, in this order, stop anywhere: reminder export (.ics), Cognito auth, sample data set, UI polish, empty/error states. | Sun 12:00 |
| **M6** | **PROTECTED. No feature work.** Demo video, README, learning log, AWS Builder Center blog post. | Sun 19:00 |

Buffer: one hour before the 20:00 deadline. Submit at 19:00, not 19:55.

## What "done" means for v1

On the live URL, a stranger can: upload a redacted sample dishonour memo, see the extracted
facts, correct one of them, see a clock board that says "notice deadline in 4 days" with the
arithmetic shown, generate a draft notice and a structured court synopsis, edit a line of
each, and download both — in one uninterrupted take that fits in 90 seconds of screen time.

The rules engine passes every case in the LEGAL_RULES.md test table, and that test run is
part of the demo, on screen, not just asserted in the README.

## Explicitly out of scope for v1

Court e-filing. Payment collection. Drawer-side defence analysis. Any real personal data.
Regional-language or handwritten documents. Multi-user organisations or roles. Mobile app.
Any rule pack other than §138.

**Reminders (.ics export, or a single scheduled email at day 20/27) are back in scope as a
nice-to-have in M5**, reversing the earlier out-of-scope call — a deadline app nobody
reopens has not actually prevented the harm it describes, and this is cheap. See
DECISIONS.md D-15.

If something here looks unavoidable mid-build, say so out loud before adding it.
