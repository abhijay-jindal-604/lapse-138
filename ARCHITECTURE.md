# ARCHITECTURE.md

**Region:** `ap-south-1` (Mumbai) for everything, with one documented exception for Bedrock.
**Everything is one Amplify Gen 2 app in one repository, deployed by one command.**

---

## 1. Components and responsibilities

| Component | Where it lives | Responsibility | Must NOT do |
|---|---|---|---|
| `packages/rules` | shared TS package, zero deps | Compute every date, deadline and status from confirmed facts. Pure function. | Touch the network, read the clock, know about AWS, know about React |
| `src/` (React + Vite) | Amplify Hosting | Capture and confirm facts, render the clock board and reasoning chain, edit the draft | Contain any deadline arithmetic of its own |
| `amplify/auth` | Cognito user pool | Email + password sign-in via the `<Authenticator>` component | Store anything about a case |
| `amplify/data` | AppSync + DynamoDB | Persist cases, facts, computed results and drafts, owner-scoped | Compute anything |
| `amplify/storage` | S3 | Hold uploaded dishonour memos, owner-scoped prefixes | Be public |
| `amplify/functions/extractFacts` | Lambda (Node 20) | Send the uploaded document to Bedrock, return structured fields **with per-field confidence** | Decide anything; emit a date it did not read |
| `amplify/functions/draftNotice` | Lambda (Node 20) | Re-run `packages/rules` server-side, then ask Bedrock to write the notice around those fixed dates. Also assembles the structured synopsis (*Sanjabij Tari*, 2025 INSC 1158) — a formatting pass over `CaseFacts` and the computed result, with no model call at all, since every field is already confirmed data. | Let the model compute or alter a date, or contribute a synopsis field, **or generate/paraphrase any affidavit content** for the accused's contact particulars — those pass through verbatim from human input, untouched |

The rules package running in **both** the browser and the `draftNotice` Lambda is deliberate:
the browser gets instant feedback with no round trip, and the generated notice carries dates
computed server-side from the same code, so a tampered client cannot produce a wrong notice.

---

## 2. How data moves

```
1. User signs in                     Cognito → JWT held by Amplify client
2. User uploads dishonour memo       browser → S3 (uploadData, owner-prefixed key)
3. Browser invokes extractFacts      AppSync mutation → Lambda
4. Lambda reads object from S3       GetObject, scoped to that prefix
5. Lambda calls Bedrock              Converse API, document or image block
                                     → { field, value, confidence, sourceQuote }[]
6. Browser renders confirmation      every field editable; low confidence highlighted;
                                     the six human-only fields asked as real questions
7. Human confirms                    → CaseFacts
8. computeClocks(facts, todayIST)    pure, synchronous, in the browser. Instant.
9. Save                              AppSync mutation → DynamoDB (facts + result snapshot)
10. User clicks "Draft notice"       AppSync mutation → draftNotice Lambda
11. Lambda recomputes clocks         same packages/rules, authoritative
12. Lambda calls Bedrock             prompt contains the computed dates as fixed literals
13. Notice returned                  editable in a textarea, downloadable as .txt
14. User clicks "Synopsis"           AppSync mutation → draftNotice Lambda, synopsis mode
15. Lambda formats CaseFacts+result  no Bedrock call — pure assembly of already-confirmed
                                     data into the Sanjabij Tari annexure shape
16. Synopsis returned                editable, downloadable as .txt
```

Steps 14–16 are deliberately model-free: the synopsis is a reformatting of data the human
already confirmed in step 7, so there is nothing for a model to add and nothing for it to
get wrong. The synopsis field list is transcribed directly from the *Sanjabij Tari* judgment's
own Annexure text, not from a secondary summary — see LEGAL_RULES.md §3. The accused's
contact particulars, which the judgment requires be filed under affidavit, are carried
through unchanged from human input; no step in this pipeline ever infers, defaults, or
drafts affidavit language.

**The critical boundary is step 7.** Nothing downstream of it has ever seen a model's
opinion about a deadline. Everything upstream of it is treated as a suggestion.

---

## 3. Data model

Amplify Data schema, one table per model, `owner` authorisation on all of them.

```ts
Case {
  id
  title            // "Cheque #445512 — Sharma Traders"
  status           // the overall status, denormalised for dashboard sorting
  nextDeadlineDate // denormalised for dashboard sorting. THE dashboard sort key.
  daysToDeadline   // integer, may be negative
  isSample         // true for seeded demo cases. drives the "sample data" banner.
  facts            // CaseFacts as JSON
  result           // ClockBoard snapshot as JSON, incl. the reasoning chain
  computedAt       // the `today` used, so a stale result is visibly stale
  documentKey      // S3 key, nullable
  createdAt updatedAt owner
}

Draft {
  id, caseId, kind: 'statutory_notice' | 'structured_synopsis', body, generatedAt,
  editedByHuman, owner
}
```

**The dashboard is a secondary surface, not the centerpiece.** Sorted-by-urgency across
sample cases is a nice glance, but seeded data reads as filler to a judge, and the case that
actually proves the product is one real (redacted) document run end to end. The dashboard
stays in scope (M4-T3) but the demo does not lead with it — see DEMO.md.

Three deliberate calls:

- **`facts` and `result` are JSON blobs, not relational tables.** Charges, dates and
  reasoning steps are read and written as a unit, never queried across. Normalising them
  would cost half a day and buy nothing this weekend.
- **`result` is a stored snapshot, not computed on read.** The dashboard sorts by
  `nextDeadlineDate` without loading every case. `computedAt` makes staleness visible; a
  case computed before today gets a "recompute" affordance rather than silently drifting.
- **`isSample` is on the record, not inferred.** It drives a banner, and nothing mixes real
  and sample data in a demo by accident.

---

## 4. AWS services and why each one is here

| Service | Why | Why not the alternative |
|---|---|---|
| **Amplify Hosting** | Git push → live HTTPS URL with a CDN, in minutes. Listed by the organisers. | S3 + CloudFront is the same thing with two more hours of setup |
| **Amplify Gen 2 backend** | Auth, data, storage and functions defined in one TypeScript file each, deployed together. One deploy path, not two. | SAM or CDK means a second toolchain and hand-wired Cognito |
| **Cognito** | Real auth as a drop-in `<Authenticator>` component, ~20 minutes | Rolling our own, or a shared password, neither of which scores on architecture |
| **AppSync + DynamoDB** | Generated, typed client. No API handler code. Scales to zero, 25 GB always-free. | Writing REST handlers by hand |
| **S3** | Uploaded documents, owner-prefixed | — |
| **Lambda** | Two small functions, both Bedrock-facing. Always-free tier covers the weekend many times over. | A container on App Runner costs money at idle |
| **Bedrock** | Extraction and drafting | Calling a model API directly would fail "Built on AWS" |
| **CloudWatch Logs** | The only observability we build. One structured log line per Bedrock call with token counts. | Anything more is Sunday-afternoon work we will not have |

**Not used, on purpose:** Textract (Bedrock's Converse API takes PDF and image blocks
directly — see DECISIONS.md D-05), Step Functions, EventBridge, API Gateway (AppSync covers
it), OpenSearch.

### The Bedrock region caveat — say this in the video

Claude models are not available for direct on-demand invocation in `ap-south-1`. They are
reached through **global cross-region inference profiles** (`global.anthropic.claude-haiku-
4-5-20251001-v1:0`), which means the inference request is processed outside India even
though the application, the database and the documents sit in Mumbai. CloudWatch and
CloudTrail records stay in `ap-south-1`.

For synthetic demo data this is fine. For a production tool holding people's financial
documents it is a real data-residency constraint, and the honest answer is: extraction would
move to a model natively available in `ap-south-1`, or documents would be redacted before
they leave the region. Saying this out loud is worth more than pretending it is not there.

---

## 5. IAM boundaries

| Principal | Gets | Explicitly does not get |
|---|---|---|
| Unauthenticated | Nothing. The Amplify auth mode is `userPool`, with no guest access. | Any data access at all |
| Signed-in user | Read/write only records where `owner` matches their Cognito subject. Read/write only `s3://.../protected/{identityId}/*`. | Other users' cases or documents |
| `extractFacts` Lambda | `s3:GetObject` on the documents prefix; `bedrock:InvokeModel` on the two named inference profile ARNs | `s3:PutObject`, `s3:Delete*`, any DynamoDB access |
| `draftNotice` Lambda | `bedrock:InvokeModel` on the named profile ARNs | Any S3 access, any DynamoDB access |

Both Lambdas are deliberately data-poor: they take their input in the invocation payload and
return their output in the response. Neither is a path to the database.

Secrets: there are none. No API keys exist in this system — every call is IAM-signed. Nothing
goes in `.env`. If anyone finds themselves adding a key to the repo, something has gone wrong.

---

## 6. Estimated cost for the weekend

| Item | Usage | Cost |
|---|---|---|
| Bedrock — extraction, Haiku 4.5 | ~200 calls × ~4k in / 1k out | ~$0.15 |
| Bedrock — drafting, Sonnet 4.5 | ~80 calls × ~2k in / 1.5k out | ~$0.35 |
| Lambda | a few thousand invocations | $0 (always-free) |
| DynamoDB | a few hundred items | $0 (25 GB always-free) |
| S3 | < 50 MB | ~$0.01 |
| Amplify Hosting | ~40 builds, < 1 GB served | $0 (1000 build-min, 15 GB free) |
| Cognito | < 10 users | $0 |
| **Total** | | **under $1** |

Against $100–200 of new-account credits, cost is not a risk. The risk is a runaway loop
calling Bedrock. **M0-T3 sets a $10 AWS Budgets alert before any Bedrock call is written.**

---

## 7. Where this breaks first

Ranked by how likely it is to hurt, with the mitigation we are actually building.

1. **Bedrock returns a date that isn't in the document.** Most likely failure by far. The
   model will helpfully infer "bankInfoReceivedDate" from the memo date. Mitigation: the
   extraction prompt requires a `sourceQuote` for every field, the Lambda drops any field
   without one, and the six human-only fields are never accepted from the model at all.
2. **Off-by-one in the date arithmetic.** Inclusive vs exclusive deadlines. Mitigation: the
   test table in LEGAL_RULES.md §5, written before the engine.
3. **Amplify Gen 2 sandbox vs branch deploy drift.** Something works in `ampx sandbox` and
   not on the deployed branch. Mitigation: M0 deploys a real branch on Friday morning, and
   every milestone ends with a push and a check against the live URL, not localhost.
4. **Cognito on a fresh deploy.** Confirmation emails land in spam; the demo account can't
   sign in. Mitigation: create the demo account Saturday night, not Sunday, and keep it
   signed in during recording.
5. **Bedrock throttling on a fresh account.** Low default TPM. Mitigation: the demo does not
   depend on a live model call — the hero case is pre-extracted and saved, so a Bedrock
   timeout during recording costs a retake, not the demo.
6. **A big or photographed PDF.** Multi-page scans blow past the model's input limits.
   Mitigation: cap uploads at 5 MB and 4 pages, with a clear error, and ship sample documents
   that are known-good.
