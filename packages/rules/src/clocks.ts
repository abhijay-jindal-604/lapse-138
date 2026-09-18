// Gate A and Clocks 1-2 of the §138 rules engine. Pure functions: CaseFacts (plus
// `today` for the clocks) in, a typed result out — no I/O, no Date object (§6).
// LEGAL_RULES.md §3 is the spec this implements; §5 is the acceptance test table
// (T01-T05, T15-T19, T22-T23 are this file's slice — see clocks.test.ts).

import { addDays, addMonths, compare, diffDays, type ISODate } from './dates.js'
import type {
  AdvisoryDate,
  CaseFacts,
  Clock1Result,
  Clock2Result,
  Clock3Result,
  Clock4Result,
  ComputedDate,
  GateAResult,
  RecoveryPath,
  ReasoningStep,
} from './types.js'

// ---------------------------------------------------------------------------
// Gate A — is this a §138 case at all? (§3 Gate A)
// ---------------------------------------------------------------------------

const GATE_A_SOURCE = 'NI Act §138 Explanation'

function dishonourReasonLabel(reason: CaseFacts['dishonourReason']): string {
  return reason.replace(/_/g, ' ')
}

export function computeGateA(facts: CaseFacts): GateAResult {
  if (facts.legallyEnforceableDebt === 'no') {
    return {
      status: 'NOT_A_138_CASE',
      reasoning: [
        {
          rule: 'A §138 offence requires the cheque to be for discharge of a legally enforceable debt or other liability',
          source: GATE_A_SOURCE,
          triggerDate: null,
          countingRule: 'n/a',
          resultDate: null,
          plainEnglish:
            "You've confirmed the underlying debt is not legally enforceable. Without that, this cheque cannot support a §138 complaint at all — the analysis stops here.",
        },
      ],
    }
  }

  if (facts.legallyEnforceableDebt === 'unsure') {
    return {
      status: 'NEEDS_REVIEW',
      reasoning: [
        {
          rule: 'A §138 offence requires the cheque to be for discharge of a legally enforceable debt or other liability',
          source: GATE_A_SOURCE,
          triggerDate: null,
          countingRule: 'n/a',
          resultDate: null,
          plainEnglish:
            "You've marked the underlying debt as 'unsure'. The clocks below are computed anyway so you have the numbers, but nothing here can be relied on until that's confirmed.",
        },
        {
          rule: 'When legallyEnforceableDebt is unsure, every computed clock stays provisional until confirmed',
          source: GATE_A_SOURCE,
          triggerDate: null,
          countingRule: 'n/a',
          resultDate: null,
          plainEnglish:
            'Every figure below is computed and shown for information, but the whole result is provisional until you confirm the cheque was for a legally enforceable debt or other liability — without that, this is not a §138 case at all.',
        },
      ],
    }
  }

  switch (facts.dishonourReason) {
    case 'insufficient_funds':
    case 'exceeds_arrangement':
      return {
        status: 'PROCEED',
        reasoning: [
          {
            rule: "The dishonour reason must fall within §138's own words or settled case law",
            source: GATE_A_SOURCE,
            triggerDate: null,
            countingRule: 'n/a',
            resultDate: null,
            plainEnglish: `The debt is confirmed as legally enforceable, and the bank's reason (${dishonourReasonLabel(facts.dishonourReason)}) is squarely within §138's own text. Proceed.`,
          },
        ],
      }
    case 'account_closed':
    case 'stop_payment':
      return {
        status: 'PROCEED_WITH_NOTE',
        reasoning: [
          {
            rule: "The dishonour reason must fall within §138's own words or settled case law",
            source: GATE_A_SOURCE,
            triggerDate: null,
            countingRule: 'n/a',
            resultDate: null,
            plainEnglish: `The debt is confirmed as legally enforceable. The bank's reason (${dishonourReasonLabel(facts.dishonourReason)}) is not among §138's own listed words, but settled case law brings it within the section. Proceed.`,
          },
          {
            rule: 'Coverage of this dishonour reason rests on case law, not the bare statutory text',
            source:
              "NI Act §138 main limb, as extended by settled case law to reasons such as account closure and stop-payment instructions",
            triggerDate: null,
            countingRule: 'n/a',
            resultDate: null,
            plainEnglish:
              'A lawyer should confirm this dishonour reason is covered before you rely on it — the analysis proceeds here, but on case law rather than the bare words of the section.',
          },
        ],
      }
    default:
      return {
        status: 'NEEDS_REVIEW',
        reasoning: [
          {
            rule: "The dishonour reason must fall within §138's own words or settled case law",
            source: GATE_A_SOURCE,
            triggerDate: null,
            countingRule: 'n/a',
            resultDate: null,
            plainEnglish: `The bank's dishonour reason (${dishonourReasonLabel(facts.dishonourReason)}) is not squarely within §138's own words or settled case law. A human needs to review this before proceeding; the clocks below are still shown for information.`,
          },
        ],
      }
  }
}

// ---------------------------------------------------------------------------
// Clock 1 — presentation validity, §138 proviso (a) (§3 Clock 1)
// ---------------------------------------------------------------------------

const CLOCK1_SOURCE =
  'NI Act §138 proviso (a); RBI directive effective 01 Apr 2012 (validity reduced from 6 months to 3)'
const CLOCK1_COUNTING_RULE =
  'Exclude the trigger day; add 3 calendar months, clamped to month-end. The statute allows 6 months or the period of validity, whichever is earlier — since 01 Apr 2012 the RBI has fixed validity at 3 months, so 3 months governs over the statutory 6.'

export function computeClock1(facts: CaseFacts, today: ISODate): Clock1Result {
  const lastValidPresentationDate = addMonths(facts.chequeDate, 3)
  const statutorySixMonthDate = addMonths(facts.chequeDate, 6)

  const step = (plainEnglish: string): ReasoningStep => ({
    rule: 'The cheque must be presented within its period of validity',
    source: CLOCK1_SOURCE,
    triggerDate: facts.chequeDate,
    countingRule: CLOCK1_COUNTING_RULE,
    resultDate: lastValidPresentationDate,
    plainEnglish,
  })

  if (facts.presentationDate === null) {
    if (compare(today, lastValidPresentationDate) <= 0) {
      return {
        clock: 'presentation_validity',
        status: 'ACT_NOW',
        lastValidPresentationDate,
        statutorySixMonthDate,
        reasoning: [
          step(
            `The cheque is dated ${facts.chequeDate} and stays valid for presentation until ${lastValidPresentationDate} (not ${statutorySixMonthDate} — RBI shortened validity to 3 months in 2012). It has not been presented yet — present it by ${lastValidPresentationDate}.`,
          ),
        ],
      }
    }
    return {
      clock: 'presentation_validity',
      status: 'NOT_A_138_CASE',
      lastValidPresentationDate,
      statutorySixMonthDate,
      reasoning: [
        step(
          `The cheque is dated ${facts.chequeDate} and its validity for presentation expired on ${lastValidPresentationDate}. It was never presented, and that window is now closed — this cheque cannot support a §138 complaint. A civil suit on the underlying debt may still be open.`,
        ),
      ],
    }
  }

  if (compare(facts.presentationDate, lastValidPresentationDate) === 1) {
    return {
      clock: 'presentation_validity',
      status: 'NOT_A_138_CASE',
      lastValidPresentationDate,
      statutorySixMonthDate,
      reasoning: [
        step(
          `The cheque is dated ${facts.chequeDate} and stayed valid for presentation until ${lastValidPresentationDate}. It was presented on ${facts.presentationDate}, after that date — the cheque was stale at presentation. This defeats a §138 complaint on this presentation; a civil suit on the underlying debt may still be open.`,
        ),
      ],
    }
  }

  return {
    clock: 'presentation_validity',
    status: 'PASS',
    lastValidPresentationDate,
    statutorySixMonthDate,
    reasoning: [
      step(
        `The cheque is dated ${facts.chequeDate} and stays valid for presentation until ${lastValidPresentationDate}. It was presented on ${facts.presentationDate}, within that window.`,
      ),
    ],
  }
}

// ---------------------------------------------------------------------------
// Clock 2 — demand notice, §138 proviso (b) (§3 Clock 2)
// ---------------------------------------------------------------------------

const CLOCK2_SOURCE =
  'NI Act §138 proviso (b); day-counting per §9 General Clauses Act 1897, applied in Econ Antri Ltd v. Rom Industries Ltd (2014) 11 SCC 769'
const CLOCK2_COUNTING_RULE = 'Exclude the trigger day; deadline = trigger + 30 days'
const CLOCK2_ASSUMPTION =
  'Assuming you learned of the dishonour on the memo date. If you were told later, your deadline is later — correct this.'

// Re-presentation eligibility depends on the same 3-month validity window as
// Clock 1, computed straight from chequeDate — this stays a pure function of
// CaseFacts, not a dependency on a Clock1Result the caller may not have run.
function buildClock2RecoveryPath(facts: CaseFacts, today: ISODate): RecoveryPath {
  const lastValidPresentationDate = addMonths(facts.chequeDate, 3)
  if (compare(today, lastValidPresentationDate) <= 0) {
    return {
      kind: 'RE_PRESENT_CHEQUE',
      deadline: lastValidPresentationDate,
      source: 'MSR Leathers v. S. Palaniappan (2013) 1 SCC 177',
      plainEnglish: `The 30-day notice window closed without a valid notice being sent, but the cheque itself is still valid for presentation until ${lastValidPresentationDate}. You can re-present it any time before then. Re-presentation creates a fresh dishonour and restarts the entire chain — fresh presentation, fresh 30-day notice window, fresh notice, fresh 15-day payment wait, fresh 1-month filing window — not just a new notice deadline on the old one.`,
    }
  }
  return {
    kind: 'CIVIL_SUIT_ONLY',
    source:
      'NI Act §138 proviso (a); RBI directive effective 01 Apr 2012 — no route back once presentation validity has also expired',
    plainEnglish: `The 30-day notice window closed without a valid notice being sent, and the cheque's own presentation validity expired on ${lastValidPresentationDate} as well — re-presentation is no longer possible. No §138 route remains on this cheque; a civil suit on the underlying debt is the remaining option.`,
  }
}

export function computeClock2(facts: CaseFacts, today: ISODate): Clock2Result {
  const rawTrigger = facts.bankInfoReceivedDate
  const assumption = rawTrigger === null && facts.dishonourMemoDate !== null ? CLOCK2_ASSUMPTION : null
  const trigger: ISODate | null = rawTrigger ?? (assumption !== null ? facts.dishonourMemoDate : null)

  if (trigger === null) {
    return {
      clock: 'notice_window',
      status: 'NEEDS_REVIEW',
      reasoning: [
        {
          rule: 'A demand notice must be sent within 30 days of learning of the dishonour',
          source: CLOCK2_SOURCE,
          triggerDate: null,
          countingRule: 'n/a',
          resultDate: null,
          plainEnglish:
            'Neither the date you learned from the bank nor a dishonour memo date is on file, so the 30-day notice clock has no trigger date to run from. This needs a human to supply one of those dates before this clock can be computed — the engine will not guess.',
        },
      ],
    }
  }

  const noticeDeadline = addDays(trigger, 30)
  const reasoning: ReasoningStep[] = []

  if (assumption !== null) {
    reasoning.push({
      rule: 'bankInfoReceivedDate was not provided; falling back to the dishonour memo date',
      source: 'LEGAL_RULES.md §3, Clock 2 memo-date fallback',
      triggerDate: trigger,
      countingRule: 'n/a',
      resultDate: null,
      plainEnglish: assumption,
    })
  }

  const mainStep = (plainEnglish: string): ReasoningStep => ({
    rule: 'A demand notice must be sent within 30 days of learning of the dishonour',
    source: CLOCK2_SOURCE,
    triggerDate: trigger,
    countingRule: CLOCK2_COUNTING_RULE,
    resultDate: noticeDeadline,
    plainEnglish,
  })

  if (facts.noticeSentDate === null) {
    if (compare(today, noticeDeadline) <= 0) {
      const daysRemaining = diffDays(today, noticeDeadline)
      reasoning.push(
        mainStep(
          `You learned of the dishonour on ${trigger}. You have until ${noticeDeadline} — ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} from today — to send the demand notice.`,
        ),
      )
      return {
        clock: 'notice_window',
        status: 'live',
        noticeDeadline,
        daysRemaining,
        assumption,
        reasoning,
      }
    }

    reasoning.push(
      mainStep(
        `You learned of the dishonour on ${trigger}. The notice needed to be sent by ${noticeDeadline}. Today is ${today} and no notice has been sent — this window is closed. Condonation does not apply here; that only covers a late complaint (Clock 4), not a late notice.`,
      ),
    )
    return {
      clock: 'notice_window',
      status: 'DEADLINE_MISSED',
      noticeDeadline,
      assumption,
      recoveryPath: buildClock2RecoveryPath(facts, today),
      reasoning,
    }
  }

  if (compare(facts.noticeSentDate, noticeDeadline) <= 0) {
    reasoning.push(
      mainStep(
        `You learned of the dishonour on ${trigger} and had until ${noticeDeadline} to send notice. It was sent on ${facts.noticeSentDate}, in time.`,
      ),
    )
    return {
      clock: 'notice_window',
      status: 'PASS',
      noticeDeadline,
      assumption,
      reasoning,
    }
  }

  reasoning.push(
    mainStep(
      `You learned of the dishonour on ${trigger} and had until ${noticeDeadline} to send notice. It was sent on ${facts.noticeSentDate}, after that date — this does not satisfy proviso (b).`,
    ),
  )
  return {
    clock: 'notice_window',
    status: 'DEADLINE_MISSED',
    noticeDeadline,
    assumption,
    recoveryPath: buildClock2RecoveryPath(facts, today),
    reasoning,
  }
}

// ---------------------------------------------------------------------------
// Clock 3 — payment window, §138 proviso (c) (§3 Clock 3)
// ---------------------------------------------------------------------------

const CLOCK3_SOURCE =
  'NI Act §138 proviso (c); day-counting per §9 General Clauses Act 1897, applied in Econ Antri Ltd v. Rom Industries Ltd (2014) 11 SCC 769'
const CLOCK3_COUNTING_RULE =
  'Exclude the trigger day; payment window ends = trigger + 15 days; the offence is complete the day after'
const DEEMED_SERVICE_SOURCE = 'C.C. Alavi Haji v. Palapetty Muhammed (2007) 6 SCC 555'
const ADVISORY_SOURCE = '§27 General Clauses Act 1897 (presumption of service by post in the ordinary course)'
const ADVISORY_NOTE = 'Typical postal transit, not a legal deadline — confirm your actual tracking receipt.'

export function computeClock3(facts: CaseFacts, today: ISODate): Clock3Result {
  const trigger = facts.noticeReceivedDate
  const deemedService =
    trigger !== null && (facts.noticeServiceMode === 'refused' || facts.noticeServiceMode === 'unclaimed')

  if (trigger === null) {
    // Sent, but no tracking result yet: a point-estimate here would be false
    // precision, so this emits an advisory range instead of NEEDS_REVIEW with
    // nothing — §3 Clock 3, T25. Every figure is replaced the moment an actual
    // receipt date is entered.
    if (facts.noticeServiceMode === 'unknown' && facts.noticeSentDate !== null) {
      const advisoryReceiptEarliest = addDays(facts.noticeSentDate, 3)
      const advisoryReceiptLatest = addDays(facts.noticeSentDate, 7)
      const paymentWindowEnds: AdvisoryDate = {
        basis: 'advisory',
        earliest: addDays(advisoryReceiptEarliest, 15),
        latest: addDays(advisoryReceiptLatest, 15),
        note: ADVISORY_NOTE,
      }
      const causeOfActionDate: AdvisoryDate = {
        basis: 'advisory',
        earliest: addDays(paymentWindowEnds.earliest, 1),
        latest: addDays(paymentWindowEnds.latest, 1),
        note: ADVISORY_NOTE,
      }
      // The single "safe" point is the latest bound of the range: filing any
      // earlier risks a premature complaint if actual service landed late in
      // the estimated window.
      const earliestSafeFilingDate: AdvisoryDate = {
        basis: 'advisory',
        earliest: causeOfActionDate.latest,
        latest: causeOfActionDate.latest,
        note: 'The latest the cause of action could accrue under this estimate — filing before this risks a premature complaint if actual service landed later in the range.',
      }

      return {
        clock: 'payment_window',
        status: 'NEEDS_REVIEW',
        reviewReason: 'pending_service_confirmation',
        paymentWindowEnds,
        causeOfActionDate,
        earliestSafeFilingDate,
        reasoning: [
          {
            rule: 'A notice sent but not yet confirmed received gets an advisory estimate, never an asserted date',
            source: ADVISORY_SOURCE,
            triggerDate: facts.noticeSentDate,
            countingRule: 'Advisory only: presumed postal transit of 3-7 days from dispatch, not a computed legal deadline',
            resultDate: null,
            plainEnglish: `The notice was sent on ${facts.noticeSentDate} but there is no confirmed receipt or refusal date yet. Based on typical postal transit (3 to 7 days), the 15-day payment window would run out somewhere between ${paymentWindowEnds.earliest} and ${paymentWindowEnds.latest} — this is an advisory estimate, not a computed deadline. The moment you confirm the actual receipt (or refusal) date, every figure here is replaced by a computed one.`,
          },
        ],
      }
    }

    return {
      clock: 'payment_window',
      status: 'NEEDS_REVIEW',
      reviewReason: 'missing_trigger',
      reasoning: [
        {
          rule: 'The 15-day payment window runs from the date the notice was received, or deemed served',
          source: CLOCK3_SOURCE,
          triggerDate: null,
          countingRule: 'n/a',
          resultDate: null,
          plainEnglish:
            'Neither a confirmed notice receipt date nor a dispatch date is on file, so the 15-day payment window has nothing to run from. This needs a human to supply one of those dates before this clock can be computed — the engine will not guess.',
        },
      ],
    }
  }

  const paymentWindowEndsDate = addDays(trigger, 15)
  const paymentWindowEnds: ComputedDate = { basis: 'computed', date: paymentWindowEndsDate }
  const receivedOrDeemed = deemedService ? 'deemed served' : 'received'

  const step = (plainEnglish: string): ReasoningStep => ({
    rule: 'The drawer has 15 days from receipt (or deemed service) of the notice to pay before the offence is complete',
    source: CLOCK3_SOURCE,
    triggerDate: trigger,
    countingRule: CLOCK3_COUNTING_RULE,
    resultDate: paymentWindowEndsDate,
    plainEnglish,
  })

  const reasoning: ReasoningStep[] = []
  if (deemedService) {
    reasoning.push({
      rule: 'Notice refused or returned unclaimed, sent by registered post to the correct address, counts as deemed service',
      source: DEEMED_SERVICE_SOURCE,
      triggerDate: trigger,
      countingRule: 'n/a',
      resultDate: null,
      plainEnglish: `The notice was ${facts.noticeServiceMode} on ${trigger}. Sent by registered post to the correct address, the law treats this as deemed service on that date — not actual receipt.`,
    })
  }

  if (
    facts.paymentStatus === 'full' &&
    facts.paymentDate !== null &&
    compare(facts.paymentDate, paymentWindowEndsDate) <= 0
  ) {
    reasoning.push(
      step(
        `The notice was ${receivedOrDeemed} on ${trigger}, giving a payment window ending ${paymentWindowEndsDate}. Full payment was made on ${facts.paymentDate}, within that window — no offence under §138. This matter is resolved.`,
      ),
    )
    return {
      clock: 'payment_window',
      status: 'RESOLVED',
      paymentWindowEnds,
      reasoning,
    }
  }

  if (facts.paymentStatus === 'part') {
    reasoning.push(
      step(
        `The notice was ${receivedOrDeemed} on ${trigger}, giving a payment window ending ${paymentWindowEndsDate}. Only part payment has been made, which does not discharge the cheque — a human needs to review whether the remaining balance still supports a §138 complaint.`,
      ),
    )
    return {
      clock: 'payment_window',
      status: 'NEEDS_REVIEW',
      reviewReason: 'part_payment',
      reasoning,
    }
  }

  if (compare(today, paymentWindowEndsDate) <= 0) {
    const daysRemaining = diffDays(today, paymentWindowEndsDate)
    reasoning.push(
      step(
        `The notice was ${receivedOrDeemed} on ${trigger}. The drawer has until ${paymentWindowEndsDate} — ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} from today — to pay before the offence is complete. A complaint cannot be filed yet.`,
      ),
    )
    return {
      clock: 'payment_window',
      status: 'live',
      paymentWindowEnds,
      daysRemaining,
      deemedService,
      reasoning,
    }
  }

  const causeOfActionDateStr = addDays(paymentWindowEndsDate, 1)
  reasoning.push(
    step(
      `The notice was ${receivedOrDeemed} on ${trigger}. The payment window closed on ${paymentWindowEndsDate} without full payment — the offence under §138 is complete as of ${causeOfActionDateStr}.`,
    ),
  )
  return {
    clock: 'payment_window',
    status: 'PASS',
    paymentWindowEnds,
    causeOfActionDate: { basis: 'computed', date: causeOfActionDateStr },
    deemedService,
    reasoning,
  }
}

// ---------------------------------------------------------------------------
// Clock 4 — complaint filing, §142(1)(b) (§3 Clock 4)
//
// Takes `causeOfActionDate` as an explicit ISODate, not a Clock3Result: Clock3
// only resolves that date once it is a fixed calendar fact (its 'PASS'
// branch), independent of whether "today" has caught up to it yet, and
// Clock4Result's own status union has no NEEDS_REVIEW member — this function
// assumes the caller has already established that the cause of action has a
// known date before calling it (§3: "only evaluated once causeOfActionDate
// exists").
// ---------------------------------------------------------------------------

const CLOCK4_SOURCE = 'NI Act §142(1)(b) + proviso'
const CLOCK4_COUNTING_RULE =
  'Exclude the trigger day (cause of action date); filing deadline = trigger + 1 calendar month, clamped to month-end'
const PREMATURE_SOURCE = 'Yogendra Pratap Singh v. Savitri Pandey (2014) 10 SCC 713'
const CONDONE_SOURCE = 'proviso to NI Act §142(1)(b)'

export function computeClock4(facts: CaseFacts, today: ISODate, causeOfActionDate: ISODate): Clock4Result {
  const filingWindowOpens = causeOfActionDate
  const filingDeadline = addMonths(causeOfActionDate, 1)

  const step = (plainEnglish: string): ReasoningStep => ({
    rule: 'A §138 complaint must be filed within one month of the cause of action, condonable on sufficient cause',
    source: CLOCK4_SOURCE,
    triggerDate: causeOfActionDate,
    countingRule: CLOCK4_COUNTING_RULE,
    resultDate: filingDeadline,
    plainEnglish,
  })

  if (facts.complaintFiledDate !== null) {
    const filedDate = facts.complaintFiledDate

    if (compare(filedDate, filingWindowOpens) === -1) {
      // Not a defaulted true: whether time remains to refile is a live fact
      // about today vs. the original deadline, frequently already false by
      // the time this defect is even discovered (LEGAL_RULES.md §3 Clock 4).
      const timeRemains = compare(today, filingDeadline) <= 0
      const recoveryPath: RecoveryPath = {
        kind: 'REFILE_SAME_CAUSE',
        filingDeadline,
        timeRemains,
        source: PREMATURE_SOURCE,
        plainEnglish: timeRemains
          ? `This complaint was filed on ${filedDate}, before the cause of action accrued on ${filingWindowOpens} — it cannot be taken cognizance of, and waiting cannot cure this. It must be withdrawn. A fresh complaint on the same cause of action can still be filed: time remains until the original filing deadline of ${filingDeadline}. There is no fresh window and no fresh cause of action here, unlike Clock 2's re-presentation route.`
          : `This complaint was filed on ${filedDate}, before the cause of action accrued on ${filingWindowOpens} — it cannot be taken cognizance of, and waiting cannot cure this. It must be withdrawn. The original filing deadline of ${filingDeadline} has already passed as of today (${today}), so a fresh complaint on the same cause of action would itself need a condonation application under the proviso to §142(1)(b), on sufficient cause, at the court's discretion.`,
      }
      return {
        clock: 'complaint_filing',
        status: 'PREMATURE',
        filingWindowOpens,
        filingDeadline,
        complaintFiledDate: filedDate,
        recoveryPath,
        reasoning: [
          step(
            `The cause of action accrues on ${filingWindowOpens}, but the complaint was filed on ${filedDate} — before that date. A complaint filed before the cause of action accrues cannot be taken cognizance of; this defect cannot be cured by waiting.`,
          ),
        ],
      }
    }

    if (compare(filedDate, filingDeadline) <= 0) {
      return {
        clock: 'complaint_filing',
        status: 'PASS',
        filingWindowOpens,
        filingDeadline,
        complaintFiledDate: filedDate,
        reasoning: [
          step(
            `The cause of action accrued on ${filingWindowOpens}, giving a filing deadline of ${filingDeadline}. The complaint was filed on ${filedDate}, within that window.`,
          ),
        ],
      }
    }

    return {
      clock: 'complaint_filing',
      status: 'DEADLINE_MISSED',
      filingWindowOpens,
      filingDeadline,
      recoveryPath: {
        kind: 'CONDONE_DELAY',
        source: CONDONE_SOURCE,
        plainEnglish: `The complaint was filed on ${filedDate}, after the filing deadline of ${filingDeadline}. The court may — never automatically — condone this delay on an application showing sufficient cause under the proviso to §142(1)(b). This is discretionary, not an entitlement.`,
      },
      reasoning: [
        step(
          `The cause of action accrued on ${filingWindowOpens}, giving a filing deadline of ${filingDeadline}. The complaint was filed on ${filedDate}, after that date.`,
        ),
      ],
    }
  }

  if (compare(today, filingWindowOpens) === -1) {
    const opensInDays = diffDays(today, filingWindowOpens)
    return {
      clock: 'complaint_filing',
      status: 'not_yet_open',
      filingWindowOpens,
      filingDeadline,
      opensInDays,
      reasoning: [
        step(
          `The cause of action accrues on ${filingWindowOpens} — the filing window is not open yet, and opens in ${opensInDays} day${opensInDays === 1 ? '' : 's'}. A complaint filed before then cannot be taken cognizance of.`,
        ),
      ],
    }
  }

  if (compare(today, filingDeadline) <= 0) {
    const daysRemaining = diffDays(today, filingDeadline)
    return {
      clock: 'complaint_filing',
      status: 'live',
      filingWindowOpens,
      filingDeadline,
      daysRemaining,
      reasoning: [
        step(
          `The cause of action accrued on ${filingWindowOpens}. You have until ${filingDeadline} — ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} from today — to file the complaint.`,
        ),
      ],
    }
  }

  return {
    clock: 'complaint_filing',
    status: 'DEADLINE_MISSED',
    filingWindowOpens,
    filingDeadline,
    recoveryPath: {
      kind: 'CONDONE_DELAY',
      source: CONDONE_SOURCE,
      plainEnglish: `The filing deadline of ${filingDeadline} has passed without a complaint being filed. The court may — never automatically — condone this delay on an application showing sufficient cause under the proviso to §142(1)(b). This is discretionary, not an entitlement.`,
    },
    reasoning: [
      step(
        `The cause of action accrued on ${filingWindowOpens}, giving a filing deadline of ${filingDeadline}. Today is ${today} and no complaint has been filed — this window is closed.`,
      ),
    ],
  }
}
