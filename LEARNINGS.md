# LEARNINGS.md

Four things worth being honest about, each verified against this repo's actual commits and
decisions rather than reconstructed from memory.

---

## 1. We started with a different project, and killed it on day one

The weekend began as a triage tool to find undertrial prisoners eligible for release under
§479 of the BNSS (DECISIONS.md D-00). During planning — before a line of code existed — we
read the statute's own text instead of a summary of it, and found the exception that breaks
the idea: §479(2) bars release wherever "an investigation, inquiry or trial in more than one
offence or in multiple cases" is pending, and filing multiple sections in a single FIR is
routine Indian police practice. We looked for a High Court reading that clause down to mean
separate cases only, and found the opposite instead — the Karnataka High Court in
*K. Ramakrishna v. ED* (Nov 2024) applied the bar strictly. The empirical check settled it:
under the Ministry of Home Affairs' special campaign following the Supreme Court's order in
*In re: Inhuman Conditions in 1382 Prisons*, states identified 951 suitable undertrials
nationwide and released 334, against an undertrial population of roughly 4.3 lakh. A tool
whose correct answer is "no" for nearly everyone who opens it is not a tool.

We kept the skeleton — document in, AI extracts, human confirms, a deterministic engine
decides, AI drafts the output — because that architecture was never the problem; the rule set
plugged into it was. Section 138 cheque-bounce deadlines turned out to be the same shape,
correct far more often, and provable with tests. Cost of the pivot: about three hours of
planning, zero code. The lesson isn't "read the statute" in the abstract — it's that we
verified the exception against a real appellate decision and a real government campaign
number before writing anything, rather than after, when a rewrite would have cost the
weekend instead of a morning.

---

## 2. Bedrock, and the region we actually got

The plan (DECISIONS.md D-01, D-04) was Bedrock throughout, specifically because a Bedrock
call is a visible, logged, isolated thing — it makes "the model never decides" easy to
demonstrate on camera. Two separate problems showed up, and they were different problems,
worth telling apart:

**First, residency.** Claude models are not available for direct on-demand invocation in
`ap-south-1` (Mumbai) at all — they're reached through *global cross-region inference
profiles* (`global.anthropic.claude-haiku-4-5-...`), meaning the actual inference request
would have left India even though the app, the database and the uploaded documents all sat
in Mumbai (ARCHITECTURE.md §4/§7). For synthetic hackathon data that's a non-issue; for a real
deployment handling real people's cheque and bank details, it's a genuine data-residency
constraint, and we decided the honest move was to say so on camera rather than let the
architecture diagram imply everything stays in-region when it doesn't.

**Second, and what actually forced the pivot: a brand-new AWS account's fraud-prevention
hold never cleared.** `Converse` failed first with an account-verification
`AccessDeniedException`, then — after that cleared — with `ValidationException: Operation
not allowed` on Anthropic's one-time model-access form, itself blocked by the same
underlying hold (D-04). We retried across four separate points over roughly 30 hours,
against AWS's own stated "<2 hours" clearance estimate, filed a support case, and it still
hadn't cleared. That's the one that actually mattered: the residency caveat was always
survivable and disclosable; an indefinitely-blocked account was not, with a Sunday-evening
deadline.

The unblock came from asking the actual constraint, not assuming it: the organizers
clarified by email that only *deploying* on AWS is required, not using Bedrock specifically
(DECISIONS.md D-27). That single clarification turned a blocked weekend into a provider
swap. We moved both Lambdas to the Gemini API — free, no card, and its document/image input
matched Bedrock Converse's shape closely enough that `extractFacts`'s design didn't change,
only the call underneath it. We also *didn't* take the API key route, because Anthropic's
direct API needs a funded billing account, and adding a second payment-setup dependency to a
build that had already lost a day to one blocked dependency was the wrong trade twice.

The Gemini pivot cost us something too, and we log it rather than smooth it over: its free
tier is capped at 20 requests/day per project per model (`gemini-3.6-flash`), not the
"~280-call weekend budget" ARCHITECTURE.md had sized for Bedrock — TASKS.md's M3-T5 and
M4-T1 footnotes both hit this cap mid-verification, alongside genuine Google-side `503`
"high demand" errors. A provider swap made under time pressure inherits that provider's own
constraints, and we didn't re-check the new one's quota model until we'd already spent
against it.

---

## 3. The boundary the whole project is built around: the model phrases, the engine decides

Every other decision in this project is downstream of one rule (ARCHITECTURE.md §1, §2):
the two Lambdas that touch a model — `extractFacts` and `draftNotice` — are allowed to read
a document and allowed to write prose, and are never allowed to supply or alter a date or a
legal status. Concretely, that boundary is enforced in three separate places, not just
asserted in a document:

- **Extraction:** every field the model returns needs a non-empty, verbatim `sourceQuote`
  from the document, or the field is dropped (`amplify/functions/extractFacts/boundary.ts`).
  The nine fields that must never come from a model at all — six human-only facts plus the
  three affidavit-boundary contact fields the *Sanjabij Tari* synopsis requires under
  penalty — have no slot in `ExtractedFacts`'s type at all, so they can't survive extraction
  regardless of what the model returns; a unit test feeds the boundary function a
  deliberately polluted response and asserts it still comes out with exactly the eight
  document-extractable keys.
- **Drafting:** `draftNotice` recomputes the entire clock board server-side from the case's
  *stored* facts before it ever calls Gemini, and never reads the client-supplied result at
  all (`draft.ts`). We tested this adversarially, not just by inspection: a case seeded with
  a tampered `Case.result` (a fake `noticeDeadline: '2099-01-01'`, writable by anyone since
  the schema still runs on `publicApiKey()`) produced an error citing the *correctly
  recomputed* deadline, never the tampered one, against the live deployed Lambda — not a
  stubbed test.
- **The synopsis path calls no model at all.** Since *Sanjabij Tari v. Kishore S. Borcar*
  (2025 INSC 1158) requires every §138 complaint to carry a structured synopsis of facts the
  user has already confirmed, generating it is pure formatting over already-verified data —
  zero model calls, so there's nothing left for a model to get wrong (ARCHITECTURE.md §2
  steps 14–16, D-14).

The reason this boundary earned first-class status rather than staying an implementation
detail: this is a tool that feeds a sworn legal filing. An affidavit field a model invented,
or a date it "helpfully" inferred from context instead of reading verbatim, isn't a UX bug
here — it's the difference between a calculator and a liability. Treating the model as
untrusted input at every seam it touches was the one architectural commitment we didn't
compromise on anywhere in the build.

---

## 4. What the test table actually caught

LEGAL_RULES.md §5 was written before the engine, and flags the boundary it expects to be
hardest to get right: "today is exactly the deadline" (T24) — acting *on* a deadline date
must count as in time, one day later must not, per §9 General Clauses Act 1897 as applied to
§138 by *Econ Antri Ltd v. Rom Industries Ltd* (2014) 11 SCC 769. We built that guard
directly into `table.test.ts`, asserting it end-to-end through the full
`gateA → clocks → overallStatus` pipeline, not just at the single clock that computes the
date. In this build, that particular guard never actually caught a live regression — Clock 1
and Clock 2's day-counting were correct from the first commit that implemented them, verified
against the table on the same commit (`4792d69`).

What the tests *did* catch, for real, was a quieter kind of bug: **fixture drift.** The three
hand-written `ClockBoard` fixtures published in M1-T2, before the engine existed, were
checked by `fixtures.test.ts` for structural shape only — non-empty reasoning, a
`recoveryPath` where one was expected — never for exact wording. Between M1-T2 and M1-T4, the
actual reasoning prose in `clocks.ts` was revised as the sequencing was implemented, and the
fixtures were never updated to match. Nothing failed, because nothing was asserting the text.
It surfaced only when `computeClockBoard`'s orchestrator was added (M2 prereq,
DECISIONS.md D-25) and `board.test.ts` started asserting *byte-identical* output against the
fixtures — at which point the drift showed up immediately as a diff. We fixed it the direction
the audit trail says was correct: regenerated the three fixtures from the engine itself,
since `clocks.ts` was the side already validated by the full 27-row table audit, rather than
editing the engine to match stale prose. No status, date, or structural field changed in any
fixture — only wording and formatting that had gone stale silently.

The honest lesson isn't "we found an off-by-one and fixed it" — we didn't, because the date
arithmetic was tested against the table from the same commit that wrote it, and stayed
correct. The lesson is narrower and, we think, more useful: a test that only checks *shape*
(non-empty, right type, has a `recoveryPath`) will not catch drift in the *content* it isn't
looking at, and fixtures written before the logic they're meant to represent will silently
stop representing it unless something eventually asserts them exactly. We'd rather report
that precisely than round it up to a more dramatic bug we didn't actually have — the same
standard we held the project's own public numbers to (D-12, D-17).
