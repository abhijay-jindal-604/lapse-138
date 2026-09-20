# Lapse

A deadline calculator for Section 138 cheque-bounce cases in India — built for a hackathon,
tested against the bare statute text and five Supreme Court judgments.

**Live app:** https://main.ddkpu3vpsh6s9.amplifyapp.com

---

## The problem

When a cheque bounces in India, Section 138 of the Negotiable Instruments Act gives the payee
a strict, easy-to-miss chain of dates:

1. The cheque must still be **within its 3-month validity** when presented.
2. From the day the bank informs you of dishonour, you have **30 days** to send a legal
   notice demanding payment.
3. Once the notice is served, the drawer gets **15 days** to pay.
4. If they don't pay, you must **file the complaint within 1 month** of that 15-day window
   closing.

Miss any window and the complaint can be dismissed as time-barred or premature — but the
rules for *when it's actually too late* are more forgiving than they look (re-presentation
restarts the clock if the cheque is still valid; late filing can sometimes be condoned). Most
people doing this by hand don't know that. As of 1 November 2025, the Supreme Court
(*Sanjabij Tari v. Kishore S. Borcar*, 2025 INSC 1158) also requires every complaint to carry
a structured synopsis of these same facts.

**Lapse computes the whole chain deterministically from confirmed facts, tells you exactly
where a case stands and why, and — if a deadline's already gone — what the actual remaining
option is**, instead of just reporting failure. See `LEGAL_RULES.md` for the full statute/
case-law citations and `packages/rules/test/table.test.ts` for the 27-case test table it's
built against.

## What's actually built

| Piece | Status |
|---|---|
| Rules engine (`packages/rules`) | Done. Pure TypeScript, zero dependencies, 111 tests. |
| Case entry form + clock board + reasoning chain | Done |
| Document upload → Gemini extraction → confirm/edit flow | Done |
| Draft notice + structured synopsis generation | Done |
| Dashboard sorted by urgency | Done |
| "Date travel" — drag a date slider, watch every clock recompute live | Done |
| Cognito authentication | **Backend resource exists (`amplify/auth/resource.ts`), not wired into the app.** No sign-in screen, no `<Authenticator>`. All data uses `allow.publicApiKey()` — anyone with the API key can read/write any case. Do not deploy this for real user data as-is. |

## Architecture

```mermaid
flowchart TD
    U[Browser: React + Vite] -->|upload memo| S3[(S3 — documents)]
    U -->|GraphQL| AS[AppSync]
    AS --> DDB[(DynamoDB — Case, Draft)]
    AS -->|extractFacts query| L1[Lambda: extractFacts]
    AS -->|draftNoticeForCase /\nsynopsisForCase| L2[Lambda: draftNotice]
    L1 -->|reads uploaded doc| S3
    L1 -->|document/image + prompt| GEM[Gemini API]
    L2 -->|recomputes clocks server-side,\nthen drafts around fixed dates| GEM
    L2 -.synopsis path.->|no model call,\npure formatting| DDB

    RULES["packages/rules\n(pure TS, zero deps)\ncomputeClockBoard(facts, today)"]
    U -.imports directly.-> RULES
    L2 -.imports directly.-> RULES

    AUTH["Cognito user pool\n(defined, NOT wired in)"]
    AUTH -.not connected.-> U
```

- **Frontend:** React 19 + Vite + React Router, deployed as a static SPA on Amplify Hosting.
- **Backend:** AWS Amplify Gen 2 — one `defineBackend` in `amplify/backend.ts` wiring
  auth, data, storage and two functions together in a single deploy.
- **Data:** AppSync (GraphQL) + DynamoDB, schema in `amplify/data/resource.ts`. One `Case`
  model holds facts, the computed result snapshot, and `computedAt`; two custom queries
  (`extractFacts`, `draftNoticeForCase`/`synopsisForCase`) route to the Lambdas below.
- **Storage:** S3 for uploaded dishonour memos (`amplify/storage/resource.ts`).
- **`amplify/functions/extractFacts`:** sends an uploaded document to the **Gemini API**
  (`@google/genai`) and returns structured fields, each with a `confidence` and a verbatim
  `sourceQuote`. A field without a source quote is dropped; nine fields (six human-only, three
  affidavit-boundary) can never come from the model at all — enforced in
  `amplify/functions/extractFacts/boundary.ts`.
- **`amplify/functions/draftNotice`:** recomputes the clock board **server-side** from the
  case's stored facts (never trusts a client-supplied result), then calls Gemini to draft the
  notice narrative around those already-fixed dates. The synopsis path in the same Lambda
  makes **no model call at all** — it's a pure formatting pass over already-confirmed data.
- **The rules engine (`packages/rules`)** is a single dependency-free package imported by both
  the browser (instant feedback while typing) and the `draftNotice` Lambda (the authoritative
  recompute). It never touches the network, the clock, or AWS.

> Originally planned around AWS Bedrock (Claude models). A new-AWS-account verification hold
> on Bedrock never cleared over the hackathon weekend, and the organizers clarified that only
> *deploying* on AWS — not using Bedrock specifically — was required. Both Lambdas were
> switched to the Gemini API instead; see `DECISIONS.md` D-27 for the full account of that
> pivot, including why a direct Anthropic API key wasn't the fallback (no free tier).

## Local setup

**Prerequisites:**
- Node.js 20+
- An AWS account with credentials configured (`aws configure` or equivalent) — `ampx sandbox`
  deploys real AWS resources (AppSync, DynamoDB, S3, Lambda, Cognito) into your own account.
  Everything here fits comfortably in AWS's always-free tier.
- A free [Google AI Studio](https://aistudio.google.com/) API key, for the two Gemini-backed
  Lambdas (`extractFacts`, `draftNotice`). Without it, the app still runs — dashboard, manual
  case entry, the rules engine and date-travel all work — but document upload/extraction and
  AI-drafted notices will fail at call time.

```bash
git clone <this-repo-url>
cd FirstCommit
npm install

# One-time: give the Lambdas your Gemini key as an Amplify secret
npx ampx sandbox secret set GEMINI_API_KEY
# (paste your key when prompted)

# Deploys a personal sandbox backend and watches for changes.
# Leave this running in its own terminal — it writes amplify_outputs.json,
# which the frontend needs to talk to your backend.
npx ampx sandbox

# In a second terminal, once the sandbox has finished its first deploy:
npm run dev
```

Open the printed `localhost` URL. `npx ampx sandbox` takes a few minutes on first run (it's
standing up a full backend stack); subsequent changes redeploy incrementally.

**Tests** (no AWS or API key needed — the rules engine and Lambda logic are pure functions
tested with injected/mocked I/O):

```bash
npm test
```

This runs 111 tests in `packages/rules` (the full statute test table) and 33 in `amplify`
(extraction boundary enforcement, notice/synopsis assembly), all passing as of this writing.

## Repo layout

```
packages/rules/     the deterministic engine — dates, clocks, statuses, synopsis assembly
amplify/
  auth/              Cognito resource (defined, not wired into src/)
  data/              AppSync/DynamoDB schema
  storage/           S3 bucket for uploaded documents
  functions/
    extractFacts/    Gemini-backed document extraction + boundary enforcement
    draftNotice/     server-side recompute + Gemini notice drafting + model-free synopsis
src/
  routes/            Dashboard, NewCase, UploadDocument, Confirm, CaseDetail, Draft, Synopsis
  components/        ClockBoard, ReasoningChain, CaseForm, Upload, DateTravel, ...
samples/             synthetic sample documents for upload/extraction (no real data)
scripts/seed.ts      seeds sample cases for the dashboard
```

`LEGAL_RULES.md` is the actual specification the engine is tested against — every rule cites
its source, and nothing in the code may contradict it. `ARCHITECTURE.md` and `DECISIONS.md`
have more detail than this file on, respectively, the system design and the reasoning behind
every non-obvious choice made building it.

## AI-assistance disclosure

This project was built with **Claude Code** as a pair-programming tool throughout the
hackathon weekend — not for a single generated pass, but session by session across roughly 44
commits: scaffolding, the rules engine and its test table, the React UI, both Lambdas, the
Amplify backend wiring, and this README were all written with Claude Code in the loop,
reviewed and corrected by a human at each step.

Two things worth being specific about, rather than leaving this as a blanket statement:

- **Legal research was independently checked against primary sources**, not taken on the
  model's word. `LEGAL_RULES.md` §1 is a checklist of the bare statutory text and case law
  re-read and verified before being coded; `DECISIONS.md` records two cases where an AI-
  assisted draft got a public fact wrong (a pendency statistic off by roughly 8x, and a
  Supreme Court committee figure misattributed) and how the correction was made once caught
  — see D-12 and D-17.
- **Where the model is and isn't trusted is a designed boundary, not an accident.** The
  extraction and drafting Lambdas can *phrase* things; they never get to supply a date or
  decide a case's status — every deadline comes from `packages/rules`, computed the same way
  in the browser and re-verified server-side before a notice is drafted. That boundary is
  enforced in code (`amplify/functions/extractFacts/boundary.ts`, `draft.ts`'s server-side
  recompute) and covered by tests, not just asserted in this document.

## A note on legal accuracy

Every generated notice and synopsis carries a "DRAFT — for review by a qualified advocate"
header. This tool computes deadlines and drafts documents from rules verified against primary
sources by non-lawyers; it is not a substitute for legal advice, and nothing it produces
should be filed without review.
