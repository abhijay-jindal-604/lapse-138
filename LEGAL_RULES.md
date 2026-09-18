# LEGAL_RULES.md — the specification the engine is built and tested against

This is the contract. The rules engine implements exactly this, and nothing in the UI or in
any Bedrock prompt may contradict it. If reality disagrees with this document, fix this
document first, then the code.

**Nobody on this team has legal training.** This document and its test table are the only
guardrail against shipping a wrong answer to someone's money. Every rule below carries its
source. Rules without a source do not get implemented.

---

## 0. Universal conventions

These are easy to get wrong silently and expensive to change later. Fix them on day one.

| Convention | Rule |
|---|---|
| **Date type** | Every date is a **calendar date**, stored and passed as an ISO `YYYY-MM-DD` string. Never a JS `Date`, never a timestamp, never a UTC instant. A cheque does not bounce at a time of day. |
| **Timezone** | All dates are Indian civil dates (Asia/Kolkata). The only place a timezone appears is the single function that answers "what is today's date in IST", at the edge of the system. |
| **`today` is an input** | `computeClocks(facts, today)` takes today as a parameter. The engine never calls `new Date()`. Non-negotiable: it is what makes every test in §5 deterministic. |
| **Counting "within N days of X"** | Exclude the trigger day X. Deadline date = X + N days. Acting **on** the deadline date is in time; the day after is late. Source: §9 General Clauses Act 1897, applied to §138 by *Econ Antri Ltd v. Rom Industries Ltd* (2014) 11 SCC 769. |
| **Counting "within one month of X"** | Exclude X. Deadline = the same day-of-month in the following calendar month. If that day does not exist in that month, the deadline is the **last day of that month** (30 Jan + 1 month → 28 Feb, or 29 Feb in a leap year). Source: same as above. |
| **"3 months" for cheque validity** | Same calendar-month arithmetic with the same end-of-month clamping. |
| **Unknown inputs** | A missing date is `null` and produces `NEEDS_REVIEW` for the clock that depends on it. The engine **never** substitutes a guess. The one exception is documented in Clock 2 and must be shown on screen as an assumption. |
| **No partial credit** | The engine returns a status per clock plus one overall status. It never returns a probability, a score, or a percentage. |

---

## 1. The statutory chain, in order

Sources are the bare text of the Negotiable Instruments Act 1881 (India Code) and the
Supreme Court decisions named. **Task M1-T0 is to re-read each bare-text source and tick it
off here before any rule is coded.**

| ✔ | Source | Used for |
|---|---|---|
| ☑ | NI Act §138, main limb + provisos (a), (b), (c) + Explanation | Clocks 1–3, offence definition, punishment |
| ☑ | NI Act §142(1)(a), (1)(b) + proviso, (1)(c) | Clock 4, condonation, court level |
| ☑ | NI Act §142(2)(a), (2)(b) + Explanation | Jurisdiction output |
| ☑ | NI Act §143A | Interim compensation output (discretionary) |
| ☑ | *Econ Antri Ltd v. Rom Industries Ltd* (2014) 11 SCC 769 (corrected from (2013) 15 SCC 231 during M1-T0 verification; substance unchanged) | Day-counting rule; exclusion of trigger day |
| ☑ | *Yogendra Pratap Singh v. Savitri Pandey* (2014) 10 SCC 713 (corrected from (2015) 11 SCC 539 during M1-T0 verification) | Premature-complaint bar |
| ☑ | *MSR Leathers v. S. Palaniappan* (2013) 1 SCC 177 | Fresh cause of action on re-presentation |
| ☑ | *C.C. Alavi Haji v. Palapetty Muhammed* (2007) 6 SCC 555 | Deemed service of notice |
| ☑ | *Rakesh Ranjan Shrivastava v. State of Jharkhand* 2024 INSC 205 | §143A is discretionary, not mandatory |
| ☑ | RBI directive effective 01 Apr 2012 | Cheque validity reduced from 6 months to 3 |
| ☑ | *Sanjabij Tari v. Kishore S. Borcar* 2025 INSC 1158 (25 Sep 2025) | Structured synopsis mandate (procedural mandate, not a statutory section); procedural guidelines effective 1 Nov 2025 |
| ☑ | §27 General Clauses Act 1897 | Presumption of service by post "in the ordinary course" — basis for the advisory receipt-date range in Clock 3 |

---

## 2. Inputs

```ts
type CaseFacts = {
  // parties
  payeeName: string;            payeeAddress: string;
  drawerName: string;           drawerAddress: string;

  // the instrument
  chequeNumber: string;
  chequeDate: ISODate;          // date written on the cheque
  amountInPaise: number;        // integer. never a float. see §6.
  drawerBankName: string;       drawerBankBranch: string;
  payeeBankBranch: string;      // drives jurisdiction, §142(2)(a)

  // presentation & dishonour
  presentationDate: ISODate | null;
  dishonourMemoDate: ISODate | null;
  bankInfoReceivedDate: ISODate | null;   // TRIGGER for Clock 2. not the memo date.
  dishonourReason: DishonourReason;
  presentationCount: 1 | 2 | 3;           // re-presentation creates a fresh chain

  // notice
  noticeSentDate: ISODate | null;         // date of dispatch
  noticeReceivedDate: ISODate | null;     // TRIGGER for Clock 3. receipt or deemed service.
  noticeServiceMode: 'received' | 'refused' | 'unclaimed' | 'unknown';

  // outcome
  paymentStatus: 'none' | 'part' | 'full';
  paymentDate: ISODate | null;

  // complaint
  complaintFiledDate: ISODate | null;

  // the thing only a human can answer
  legallyEnforceableDebt: 'yes' | 'no' | 'unsure';

  // relief — feeds the synopsis (§3, "Outputs that are not clocks") only. Never a clock input.
  interestClaimedInPaise: number | null;

  // AFFIDAVIT-BOUNDARY FIELDS — see §7. Required by *Sanjabij Tari* to be filed with an
  // affidavit that these particulars pertain to the accused, on pain of court action if
  // false. The app NEVER pre-fills, infers, or auto-asserts these. They are human-entered
  // only, rendered in a visually distinct "verify before you swear to this" group, and feed
  // the synopsis as plain data — never through a model, and never with generated affidavit
  // text of any kind.
  accusedEmail: string | null;
  accusedMobile: string | null;
  accusedMessagingDetails: string | null;   // WhatsApp or other messaging identifier
};

type DishonourReason =
  | 'insufficient_funds' | 'exceeds_arrangement'          // squarely within §138
  | 'account_closed' | 'stop_payment'                     // within §138 via case law
  | 'signature_mismatch' | 'material_alteration'
  | 'frozen_account' | 'refer_to_drawer' | 'other';       // review
```

**Fields a document can supply:** cheque number, cheque date, amount, bank names, branches,
presentation date, memo date, dishonour reason.

**Fields a document can almost never supply, and that the UI must therefore ask for
explicitly:** `bankInfoReceivedDate`, `noticeReceivedDate`, `noticeServiceMode`,
`legallyEnforceableDebt`, `paymentStatus`, `presentationCount`.

That second list is where claims actually die. The confirmation screen must treat those
fields as first-class questions, not as optional extras hidden below a fold.

**A third, separately-styled group: `accusedEmail`, `accusedMobile`,
`accusedMessagingDetails`.** These are never extracted from a document and never defaulted.
They are grouped under an explicit affidavit warning, not mixed in with ordinary case facts —
see §7.

---

## 3. Order of checks

The engine evaluates gates first, then the four clocks in statutory order. **Order matters:
a later clock is only meaningful if the earlier one passed.**

**A missed deadline is not the end of the analysis.** `DEADLINE_MISSED` is not a terminal
status — it is a status with a `recoveryPath`, and the recovery path is not an afterthought,
it is co-equal output with the deadline itself. A blown notice window is frequently curable
by re-presenting the cheque within its remaining validity (*MSR Leathers v. S. Palaniappan*,
(2013) 1 SCC 177 — re-presentation creates a fresh cause of action). A late complaint can be
taken up on a condonation application under the proviso to §142(1)(b). The UI must render
`recoveryPath` with the same visual weight as the deadline it follows, never as a greyed-out
footnote. Most of the realistic traffic through this tool is people who are already late;
telling them only that they are dead is close to useless.

### Gate A — is this a §138 case at all?

1. `legallyEnforceableDebt === 'no'` → **NOT_A_138_CASE**. Reason: §138 Explanation — the
   cheque must be for discharge of a legally enforceable debt or other liability. Stop.
2. `legallyEnforceableDebt === 'unsure'` → **NEEDS_REVIEW**, continue computing clocks for
   information but mark every result provisional.
3. Dishonour reason:
   - `insufficient_funds`, `exceeds_arrangement` → proceed. (Squarely the statutory words.)
   - `account_closed`, `stop_payment` → proceed, with a reasoning step recording that
     coverage rests on settled case law rather than the bare statutory words; a lawyer
     should confirm.
   - anything else → **NEEDS_REVIEW**. Stop advancing; still show Clock 1 for information.

### Clock 1 — Presentation validity · §138 proviso (a)

- `lastValidPresentationDate = chequeDate + 3 months` (clamped, see §0).
  The statute says "six months … or within the period of its validity, whichever is
  earlier"; since 01 Apr 2012 the RBI has fixed validity at three months, so three months
  governs. **The engine must show both numbers and say why three wins** — this is the kind
  of thing a judge will poke at.
- If `presentationDate === null`:
  - `today <= lastValidPresentationDate` → **ACT_NOW**: "present the cheque within N days".
  - else → **NOT_A_138_CASE** (stale instrument), with a reasoning step noting a civil
    suit on the underlying debt may still be open. Nothing further.
- If `presentationDate > lastValidPresentationDate` → **NOT_A_138_CASE** for this
  presentation. Stop.
- Else → pass.

### Clock 2 — Demand notice · §138 proviso (b)

- Trigger = `bankInfoReceivedDate`.
  - If null and `dishonourMemoDate` is known, the engine **may** fall back to the memo date
    **only if** the UI displays: *"Assuming you learned of the dishonour on the memo date.
    If you were told later, your deadline is later — correct this."* The fallback is
    recorded in the reasoning chain as an assumption, not a fact.
  - If both null → **NEEDS_REVIEW**.
- `noticeDeadline = trigger + 30 days`.
- If `noticeSentDate === null`:
  - `today <= noticeDeadline` → **live**, days remaining = `noticeDeadline - today`.
  - `today > noticeDeadline` → **DEADLINE_MISSED**. Recovery path, in this order. **Condonation
    under the proviso to §142(1)(b) does NOT apply here** — that proviso covers delay in
    filing the *complaint* (Clock 4), not delay in issuing the *notice*. Re-presentation is
    the only §138 route back from a blown notice window, and it is gated on the cheque still
    being within its presentation validity:
    1. If `today <= lastValidPresentationDate`: re-present the cheque. This is a **fresh
       dishonour that restarts the entire chain**, not just the notice clock — fresh
       presentation, fresh 30-day notice window, fresh notice, fresh 15-day payment wait,
       fresh 1-month filing window. Source: *MSR Leathers*. This is the single most
       valuable thing the tool can tell someone, so it must be prominent.
    2. Otherwise (cheque validity also expired): no §138 route on this cheque. Static note
       that a civil suit on the underlying debt is the remaining option. Stop.
- If `noticeSentDate !== null`:
  - `noticeSentDate <= noticeDeadline` → pass.
  - else → the notice does not satisfy proviso (b). **DEADLINE_MISSED**, same recovery path.

### Clock 3 — Payment window · §138 proviso (c)

- Only evaluated if Clock 2 passed with a notice actually sent.
- Trigger = `noticeReceivedDate`.
  - `noticeServiceMode` of `refused` or `unclaimed`, with the notice sent by registered post
    to the correct address → treat the date of refusal/return as the date of deemed service.
    Source: *C.C. Alavi Haji v. Palapetty Muhammed*, (2007) 6 SCC 555. Flag it in the
    reasoning as deemed, not actual.
  - `unknown` (sent, but no tracking result yet) → the **status stays `NEEDS_REVIEW` and no
    date is asserted as fact** — that rule does not change. But a single point-estimate here
    would be false precision, so the engine additionally emits an **advisory window, not a
    computed answer**: `noticeSentDate + 3 days` to `noticeSentDate + 7 days`, labelled
    "typical postal transit, not a legal deadline — confirm your actual tracking receipt."
    From that it derives an advisory payment-window range and an advisory earliest-safe
    filing date, all rendered with a visibly different (dashed/advisory) style from computed
    deadlines, and with the reasoning step citing §27 General Clauses Act 1897 (presumption
    of service by post in the ordinary course) as the basis for the estimate — not as a
    court-fixed number of days, because there isn't one. The moment an actual
    `noticeReceivedDate` is entered, every advisory figure is replaced by a computed one.
  - Both null → **NEEDS_REVIEW**, no advisory possible either (nothing to estimate from).
- `paymentWindowEnds = noticeReceivedDate + 15 days`.
- `causeOfActionDate = paymentWindowEnds + 1 day`. The offence is complete on this date.
- If `paymentStatus === 'full'` and `paymentDate <= paymentWindowEnds` → **RESOLVED**.
  No offence. Say so plainly and stop.
- If `paymentStatus === 'part'` → **NEEDS_REVIEW**.
- If `today <= paymentWindowEnds` → **live**: "the drawer has N days left to pay. You cannot
  file yet." The "cannot file yet" is as important as the deadline itself — see Clock 4.
- **Practical note surfaced in the UI, not part of the computation:** the notice must be sent
  in a way that proves service — registered post or speed post — and the tracking receipt is
  the evidence of dispatch and delivery the complaint will need. Say this once, on the draft
  notice screen, not buried in a tooltip.

### Clock 4 — Complaint filing · §142(1)(b)

- Only evaluated once `causeOfActionDate` exists.
- `filingWindowOpens = causeOfActionDate`.
- `filingDeadline = causeOfActionDate + 1 month` (calendar month rule, §0).
- If `complaintFiledDate !== null`:
  - `complaintFiledDate < filingWindowOpens` → **PREMATURE**. A complaint filed before the
    15 days expire cannot be taken cognizance of, **and this defect cannot be cured by
    waiting** — condonation is not an option here at all, because condonation extends a
    filing deadline, and prematurity is the opposite problem. Source: *Yogendra Pratap
    Singh*. Show the consequence in plain words: this complaint must be withdrawn, and a
    fresh complaint can be filed **on the same cause of action**, within whatever time
    remains of the original one-month §142(1)(b) window (`filingDeadline`, unchanged) —
    there is no fresh window and no fresh cause of action here, unlike Clock 2's
    re-presentation route (*MSR Leathers*), which genuinely restarts the whole chain. In
    practice this remaining time is frequently already exhausted by the time someone
    discovers the prematurity defect, since the defect is usually only noticed once the
    case has been pending for a while — flag this for the recoveryPath implementation
    (M1-T4/T5): a bare "you can still refile" message would be materially misleading in the
    common case where `today > filingDeadline` by the time the defect surfaces, and the
    recoveryPath must distinguish that from the case where time genuinely remains.
  - `filingWindowOpens <= complaintFiledDate <= filingDeadline` → **filed in time**.
  - `complaintFiledDate > filingDeadline` → **DEADLINE_MISSED**, condonation path below.
- If not filed:
  - `today < filingWindowOpens` → **not yet open**, opens in N days.
  - `filingWindowOpens <= today <= filingDeadline` → **live**, N days remaining.
  - `today > filingDeadline` → **DEADLINE_MISSED**. Recovery path: an application under the
    proviso to §142(1)(b) to condone the delay on sufficient cause. **This is the one branch
    of the three (missed notice, premature, missed filing) where condonation genuinely
    applies** — do not offer it for a missed notice window or a premature filing; those have
    different, non-interchangeable answers (see Clock 2 and the PREMATURE branch above). Must
    be worded as discretionary — the court *may* accept it — never as an entitlement.

### Outputs that are not clocks

- **Jurisdiction (§142(2)):** the Magistrate's court where `payeeBankBranch` is located,
  when the cheque was delivered for collection through the payee's account (§142(2)(a));
  otherwise where the drawer's bank branch is located (§142(2)(b)). Court must be not
  inferior to a Judicial Magistrate First Class / Metropolitan Magistrate (§142(1)(c)).
- **Exposure (§138):** imprisonment up to 2 years, or fine up to twice the cheque amount,
  or both. State it as the statutory maximum, never as a prediction.
- **Interim compensation (§143A):** the court *may* direct the drawer to pay up to 20% of
  the cheque amount pending trial. Discretionary, not mandatory — *Rakesh Ranjan
  Shrivastava*. The word "may" is load-bearing; do not let the drafting model turn it into
  "will".
- **Structured synopsis (mandated by *Sanjabij Tari v. Kishore S. Borcar*, 2025 INSC 1158):**
  every §138 complainant must now file a structured synopsis, immediately after the index and
  before the formal complaint, from 1 November 2025. **The field list below is transcribed
  field-by-field from the judgment's Annexure itself** (api.sci.gov.in, mirrored at
  scobserver.in) — not paraphrased from a summary or a blog post, because format fidelity is
  the feature here, and a nearly-correct court form is worse than no generator. The engine
  assembles it directly from `CaseFacts` plus the computed clock results — a formatting job
  on data already confirmed, not a new extraction task:
  - *Particulars of the parties* — payee and drawer name and address; where the accused is a
    company or firm, additionally its registered address, the name of its managing director
    or partner, the signatory, and persons vicariously liable.
  - *Cheque particulars* — number, date, amount, drawee bank and branch, drawer and payee.
  - *Dishonour* — presentation date, dishonour date, reason, return memo reference.
  - *Statutory notice* — dispatch date, mode, deemed-or-actual receipt date, response (if any).
  - *Cause of action* — the date the offence became complete (Clock 3's `causeOfActionDate`).
  - *Relief sought* — cheque amount, interest claimed (if any, human-entered), and a note that
    interim compensation under §143A may be sought at the court's discretion.
  - *Accused's contact particulars* — `accusedEmail`, `accusedMobile`,
    `accusedMessagingDetails` — carried into the synopsis exactly as the human entered them,
    **never inferred, never defaulted, and never accompanied by generated affidavit text.**
    The synopsis output flags this section with the same "verify before you swear to it"
    language as the input screen (§2, §7). *Sanjabij Tari* requires these be filed under an
    affidavit that the particulars pertain to the accused, with the court free to act against
    the complainant if that affidavit is later found false — the app's only role is to carry
    the human's own words through unchanged.
  Like the notice, it is generated only from confirmed facts and computed dates — never from
  a model's inference — and is marked **"DRAFT SYNOPSIS — verify against the prescribed
  format before filing"** on every copy. High Courts are issuing their own implementing
  practice directions on top of the Supreme Court's Annexure (Delhi's on 6 Nov 2025); M4-T5
  implements the Supreme Court's own Annexure as the baseline and states plainly, in the
  product and in the pitch, that state-level variations are a known limitation, not a claim
  of national uniformity.

---

## 4. Overall status and its precedence

Exactly one overall status per case, resolved by this precedence, highest first:

1. `NOT_A_138_CASE`
2. `RESOLVED`
3. `NEEDS_REVIEW`
4. `DEADLINE_MISSED`
5. `ACT_NOW` — any live deadline falling within 7 days
6. `ON_TRACK` — all live deadlines more than 7 days out

`NEEDS_REVIEW` ranks above `DEADLINE_MISSED` deliberately: we would rather send a human to
look than announce a loss we are not certain of.

**Resolved during M1-T2 review:** Clock 4's `PREMATURE` outcome is not one of the six values
above, and is deliberately not folded into `OverallStatus` as a seventh member (§6: "get the
six right now"). When `clock4.status === 'PREMATURE'`, `overallStatus` resolves to
**`NEEDS_REVIEW`** — consistent with the "send a human to look" bias above, since prematurity
requires withdrawing and possibly refiling a complaint, not a simple missed-deadline read.
M1-T4 (status precedence) implements this mapping.

Every status object carries `reasoning: ReasoningStep[]`, where each step is
`{ rule, source, triggerDate, countingRule, resultDate, plainEnglish }`. The UI renders
this verbatim. **No status may be displayed without its reasoning chain.**

---

## 5. Test table

These are the acceptance tests for M1. `today` is injected in every case. Dates chosen so
the arithmetic is checkable by hand.

| # | Scenario | Key inputs | Expected |
|---|---|---|---|
| T01 | Healthy case, notice window open | memo info 2026-09-01, nothing sent, today 2026-09-10 | Clock 2 live, deadline **2026-10-01**, 21 days left, overall `ON_TRACK` |
| T02 | Urgent case | memo info 2026-08-20, nothing sent, today 2026-09-17 | deadline **2026-09-19**, 2 days left, overall `ACT_NOW` |
| T03 | Notice deadline blown, cheque still valid | cheque 2026-07-20, memo info 2026-07-25, today 2026-09-17, not sent | `DEADLINE_MISSED` + recovery: re-present before **2026-10-20** |
| T04 | Notice deadline blown, cheque stale | cheque 2026-05-01, memo info 2026-05-10, today 2026-09-17 | `DEADLINE_MISSED`, no §138 recovery, civil note only |
| T05 | Trigger-day exclusion | info received 2026-09-01 | deadline is **2026-10-01**, not 2026-09-30 |
| T06 | 15-day window, exclusion | notice received 2026-09-01 | window ends **2026-09-16**, cause of action **2026-09-17** |
| T07 | One-month filing window | cause of action 2026-09-17 | filing deadline **2026-10-17** |
| T08 | Month-end clamping | cause of action 2026-01-31 | filing deadline **2026-02-28** |
| T09 | Leap-year clamping | cause of action 2028-01-31 | filing deadline **2028-02-29** |
| T10 | Premature complaint | notice received 2026-09-01, complaint filed 2026-09-10 | `PREMATURE`, flagged, cites *Yogendra Pratap Singh* |
| T11 | Filed on the last day | cause of action 2026-09-17, filed 2026-10-17 | in time |
| T12 | Filed one day late | cause of action 2026-09-17, filed 2026-10-18 | `DEADLINE_MISSED` + condonation path, worded as discretionary |
| T13 | Paid within 15 days | notice received 2026-09-01, full payment 2026-09-10 | `RESOLVED`, no offence |
| T14 | Part payment | paymentStatus `part` | `NEEDS_REVIEW` |
| T15 | Stale cheque at presentation | cheque 2026-01-10, presented 2026-05-10 | `NOT_A_138_CASE`, Clock 1 fails |
| T16 | Cheque not yet presented, still valid | cheque 2026-09-01, not presented, today 2026-09-17 | `ACT_NOW`: present before **2026-12-01** |
| T17 | Signature mismatch | reason `signature_mismatch` | `NEEDS_REVIEW`, clocks shown for information only |
| T18 | Account closed | reason `account_closed` | proceeds, with the case-law note attached |
| T19 | Not a legally enforceable debt | `legallyEnforceableDebt: 'no'` | `NOT_A_138_CASE`, stops before Clock 1 |
| T20 | Unknown notice receipt date | noticeServiceMode `unknown` | `NEEDS_REVIEW`, no guessed date anywhere in output |
| T21 | Deemed service on refusal | mode `refused`, returned 2026-09-05 | window ends **2026-09-20**, reasoning says "deemed service" |
| T22 | Memo-date fallback | bankInfoReceivedDate null, memo 2026-09-01 | computes from memo date **and** emits an `assumption` flag |
| T23 | Both trigger dates missing | both null | `NEEDS_REVIEW`, no deadline invented |
| T24 | Today is exactly the deadline | deadline 2026-09-17, today 2026-09-17 | still live, 0 days left, `ACT_NOW`, not missed |
| T25 | Notice sent, receipt unknown, no tracking yet | sent 2026-09-01, mode `unknown`, no received date | overall `NEEDS_REVIEW`; reasoning includes an **advisory** payment-window range (2026-09-19 to 2026-09-23) visually marked as advisory, not asserted as fact; no status other than `NEEDS_REVIEW` is reachable from an advisory figure |
| T26 | Missed notice deadline, recovery path present | same as T03 | `DEADLINE_MISSED` **and** `recoveryPath` is non-null, cites *MSR Leathers*, and is rendered — this is a rendering/structure assertion on top of T03's dates |
| T27 | Synopsis generation from a complete case | a fully-confirmed T01-shaped case | synopsis object has all four sections populated, every value traceable to a `CaseFacts` field or a computed clock date, zero fields sourced from free-text model output |

**T24 and T05 are the ones that will actually break.** Off-by-one on an inclusive deadline
is how this engine ships a wrong answer. **T25 is the one that will be tempting to skip and
shouldn't be** — it is the difference between a calculator that admits uncertainty and one
that fabricates confidence.

---

## 6. Things that are painful to change later

- **Money is an integer of paise.** Never a float, never a formatted string in the model.
  Format only at the render edge. A ₹3,20,000 cheque is `32000000`.
- **`today` as a parameter, not a call.** If this leaks, every test becomes flaky and the
  demo breaks at midnight IST.
- **The reasoning chain is a first-class return value, not a log line.** Retrofitting it is
  a rewrite. Build it from the first commit.
- **Statuses are a closed union type.** Adding a status later means touching every render
  branch; get the six right now.
- **The rules package has zero dependencies and zero I/O.** No `fetch`, no AWS SDK, no date
  library that pulls in a timezone database. Hand-rolled calendar arithmetic, roughly 60
  lines, fully tested. This is what lets the same module run in the browser and in Lambda.

---

## 7. Disclaimers that must appear in the product

- On every result view: *"This is a deadline calculator, not legal advice, and using it does
  not create a lawyer-client relationship. Dates depend on facts only you can confirm. Have
  a lawyer verify before you act or file."* The second clause exists because a legal-tech
  tool aimed at people who may be unrepresented, with no disclaimer, is a straightforward
  question under the Advocates Act / BCI rules that we should not be caught without an
  answer to.
- On every generated draft notice: *"DRAFT — for review by a qualified advocate before
  dispatch."*
- On every generated synopsis: *"DRAFT SYNOPSIS — verify against the prescribed format
  before filing."*
- On the dashboard: *"Sample data. Not real cases."* while sample data is loaded.
- On any advisory (non-computed) date range: visually distinct styling plus the literal word
  *"advisory"* — never presented in the same visual register as a computed deadline.
- On the `accusedEmail` / `accusedMobile` / `accusedMessagingDetails` fields, wherever they
  are entered or shown: *"These particulars must be filed under an affidavit that they pertain
  to the accused. Verify them personally — the app does not check, infer, or generate this
  affidavit, and a false affidavit of service can expose you to court action."* The app never
  writes affidavit text of any kind.
