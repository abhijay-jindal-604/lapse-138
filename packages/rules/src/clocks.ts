// Gate A and Clocks 1-2 of the §138 rules engine. Pure functions: CaseFacts (plus
// `today` for the clocks) in, a typed result out — no I/O, no Date object (§6).
// LEGAL_RULES.md §3 is the spec this implements; §5 is the acceptance test table
// (T01-T05, T15-T19, T22-T23 are this file's slice — see clocks.test.ts).

import { addDays, addMonths, compare, diffDays, type ISODate } from './dates.js'
import type {
  CaseFacts,
  Clock1Result,
  Clock2Result,
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
