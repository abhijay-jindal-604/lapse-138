// The contract between the rules engine and everything downstream of it (UI, Lambdas).
// Every shape here traces back to a section of LEGAL_RULES.md — see the comment above each
// group. Zero dependencies, matching packages/rules' own rule (§6).

import type { ISODate } from './dates.js'

// ---------------------------------------------------------------------------
// §2 — Inputs
// ---------------------------------------------------------------------------

export type DishonourReason =
  | 'insufficient_funds'
  | 'exceeds_arrangement'
  | 'account_closed'
  | 'stop_payment'
  | 'signature_mismatch'
  | 'material_alteration'
  | 'frozen_account'
  | 'refer_to_drawer'
  | 'other'

export type NoticeServiceMode = 'received' | 'refused' | 'unclaimed' | 'unknown'
export type PaymentStatus = 'none' | 'part' | 'full'
export type LegallyEnforceableDebt = 'yes' | 'no' | 'unsure'
export type PresentationCount = 1 | 2 | 3

// Money is an integer of paise, never a float (§6). Branded so a plain number
// — a stray float, or a value that skipped toIntegerPaise() — is rejected at
// the type layer instead of surfacing as a rounding bug later.
export type IntegerPaise = number & { readonly __brand: 'IntegerPaise' }

export function toIntegerPaise(value: number): IntegerPaise {
  if (!Number.isInteger(value)) {
    throw new RangeError(`amount must be an integer number of paise, got ${value}`)
  }
  return value as IntegerPaise
}

export type CaseFacts = {
  payeeName: string
  payeeAddress: string
  drawerName: string
  drawerAddress: string

  chequeNumber: string
  chequeDate: ISODate
  amountInPaise: IntegerPaise
  drawerBankName: string
  drawerBankBranch: string
  payeeBankBranch: string

  presentationDate: ISODate | null
  dishonourMemoDate: ISODate | null
  bankInfoReceivedDate: ISODate | null
  dishonourReason: DishonourReason
  presentationCount: PresentationCount

  noticeSentDate: ISODate | null
  noticeReceivedDate: ISODate | null
  noticeServiceMode: NoticeServiceMode

  paymentStatus: PaymentStatus
  paymentDate: ISODate | null

  complaintFiledDate: ISODate | null

  legallyEnforceableDebt: LegallyEnforceableDebt

  interestClaimedInPaise: IntegerPaise | null

  // Affidavit-boundary fields — §7. Human-entered only, never inferred or defaulted.
  accusedEmail: string | null
  accusedMobile: string | null
  accusedMessagingDetails: string | null
}

// ---------------------------------------------------------------------------
// §4 — Reasoning chain. First-class on every status object, never a log line.
// ---------------------------------------------------------------------------

export type ReasoningStep = {
  rule: string
  source: string
  triggerDate: ISODate | null
  countingRule: string
  resultDate: ISODate | null
  plainEnglish: string
}

// ---------------------------------------------------------------------------
// Clock 3's advisory-vs-computed distinction (§3, unknown noticeServiceMode).
// A computed date is a single point; an advisory is a range with its own note —
// the type shape itself keeps a reader from confusing the two, not a comment.
// ---------------------------------------------------------------------------

export type ComputedDate = {
  basis: 'computed'
  date: ISODate
}

export type AdvisoryDate = {
  basis: 'advisory'
  earliest: ISODate
  latest: ISODate
  note: string
}

export type DateEstimate = ComputedDate | AdvisoryDate

// ---------------------------------------------------------------------------
// §3 — recoveryPath. Co-equal with the deadline on DEADLINE_MISSED and
// PREMATURE results, never an optional afterthought — see Clock 2 and Clock 4.
// ---------------------------------------------------------------------------

export type RecoveryPath =
  | {
      kind: 'RE_PRESENT_CHEQUE'
      deadline: ISODate
      source: string
      plainEnglish: string
    }
  | {
      kind: 'CONDONE_DELAY'
      source: string
      plainEnglish: string
    }
  | {
      kind: 'REFILE_SAME_CAUSE'
      filingDeadline: ISODate
      timeRemains: boolean
      source: string
      plainEnglish: string
    }
  | {
      kind: 'CIVIL_SUIT_ONLY'
      source: string
      plainEnglish: string
    }

// ---------------------------------------------------------------------------
// §3 Gate A — is this a §138 case at all?
// ---------------------------------------------------------------------------

export type GateAStatus = 'PROCEED' | 'PROCEED_WITH_NOTE' | 'NOT_A_138_CASE' | 'NEEDS_REVIEW'

// Case-law caveats (e.g. account_closed/stop_payment) and provisional-result
// warnings are ReasoningStep entries, not a separate `note` field — one
// channel for every caveat, so nothing can be authoritative in one place and
// stale in the other.
export type GateAResult = {
  status: GateAStatus
  reasoning: ReasoningStep[]
}

// ---------------------------------------------------------------------------
// §3 Clock 1 — presentation validity, §138 proviso (a)
// ---------------------------------------------------------------------------

export type Clock1Status = 'ACT_NOW' | 'NOT_A_138_CASE' | 'PASS'

export type Clock1Result = {
  clock: 'presentation_validity'
  status: Clock1Status
  lastValidPresentationDate: ISODate // governs: 3 months, RBI directive eff. 01 Apr 2012
  statutorySixMonthDate: ISODate // shown alongside it, and why 3 wins — §3 flags this explicitly
  reasoning: ReasoningStep[]
}

// ---------------------------------------------------------------------------
// §3 Clock 2 — demand notice, §138 proviso (b)
// ---------------------------------------------------------------------------

export type Clock2Status = 'NEEDS_REVIEW' | 'live' | 'PASS' | 'DEADLINE_MISSED'

export type Clock2Result =
  | {
      clock: 'notice_window'
      status: 'NEEDS_REVIEW'
      reasoning: ReasoningStep[]
    }
  | {
      clock: 'notice_window'
      status: 'live'
      noticeDeadline: ISODate
      daysRemaining: number
      assumption: string | null // set when the memo-date fallback was used, §3/T22
      reasoning: ReasoningStep[]
    }
  | {
      clock: 'notice_window'
      status: 'PASS'
      noticeDeadline: ISODate
      assumption: string | null
      reasoning: ReasoningStep[]
    }
  | {
      clock: 'notice_window'
      status: 'DEADLINE_MISSED'
      noticeDeadline: ISODate
      assumption: string | null // memo-date fallback can still end in a missed deadline, §3/T22
      recoveryPath: RecoveryPath
      reasoning: ReasoningStep[]
    }

// ---------------------------------------------------------------------------
// §3 Clock 3 — payment window, §138 proviso (c)
// ---------------------------------------------------------------------------

export type Clock3Result =
  | {
      clock: 'payment_window'
      status: 'NEEDS_REVIEW'
      reviewReason: 'missing_trigger' | 'part_payment'
      reasoning: ReasoningStep[]
    }
  | {
      clock: 'payment_window'
      status: 'NEEDS_REVIEW'
      reviewReason: 'pending_service_confirmation' // sent, noticeServiceMode 'unknown', §3/T25
      paymentWindowEnds: AdvisoryDate
      causeOfActionDate: AdvisoryDate
      earliestSafeFilingDate: AdvisoryDate
      reasoning: ReasoningStep[]
    }
  | {
      clock: 'payment_window'
      status: 'RESOLVED'
      paymentWindowEnds: ComputedDate
      reasoning: ReasoningStep[]
    }
  | {
      clock: 'payment_window'
      status: 'live'
      paymentWindowEnds: ComputedDate
      daysRemaining: number
      deemedService: boolean // true if the date came from refusal/unclaimed return, §3/T21
      reasoning: ReasoningStep[]
    }
  | {
      clock: 'payment_window'
      status: 'PASS'
      paymentWindowEnds: ComputedDate
      causeOfActionDate: ComputedDate
      deemedService: boolean
      reasoning: ReasoningStep[]
    }

// ---------------------------------------------------------------------------
// §3 Clock 4 — complaint filing, §142(1)(b)
// ---------------------------------------------------------------------------

export type Clock4Result =
  | {
      clock: 'complaint_filing'
      status: 'not_yet_open'
      filingWindowOpens: ISODate
      filingDeadline: ISODate
      opensInDays: number
      reasoning: ReasoningStep[]
    }
  | {
      clock: 'complaint_filing'
      status: 'live'
      filingWindowOpens: ISODate
      filingDeadline: ISODate
      daysRemaining: number
      reasoning: ReasoningStep[]
    }
  | {
      clock: 'complaint_filing'
      status: 'PASS'
      filingWindowOpens: ISODate
      filingDeadline: ISODate
      complaintFiledDate: ISODate
      reasoning: ReasoningStep[]
    }
  | {
      clock: 'complaint_filing'
      status: 'PREMATURE'
      filingWindowOpens: ISODate
      filingDeadline: ISODate
      complaintFiledDate: ISODate
      recoveryPath: RecoveryPath
      reasoning: ReasoningStep[]
    }
  | {
      clock: 'complaint_filing'
      status: 'DEADLINE_MISSED'
      filingWindowOpens: ISODate
      filingDeadline: ISODate
      recoveryPath: RecoveryPath
      reasoning: ReasoningStep[]
    }

// ---------------------------------------------------------------------------
// §4 — overall status. Closed union, exactly six members. Do not add a seventh
// without re-reading §4 and §6 first.
//
// Clock4Result's 'PREMATURE' status is NOT a seventh member — a
// PREMATURE clock4 always resolves overallStatus to 'NEEDS_REVIEW' (decided
// during M1-T2 review; see LEGAL_RULES.md §4). M1-T4 implements the mapping.
// ---------------------------------------------------------------------------

export type OverallStatus =
  | 'NOT_A_138_CASE'
  | 'RESOLVED'
  | 'NEEDS_REVIEW'
  | 'DEADLINE_MISSED'
  | 'ACT_NOW'
  | 'ON_TRACK'

// ---------------------------------------------------------------------------
// The published contract: one case's facts plus every computed clock.
// A clock is `null` when an earlier gate/clock stopped the chain before it was
// reached (§3: "a later clock is only meaningful if the earlier one passed").
//
// There is no root-level `reasoning` field. It would only ever be
// gateA.reasoning plus whichever clock produced overallStatus, hand-copied —
// exactly the drift risk §6 warns about for the reasoning chain. Consumers
// concatenate gateA.reasoning with the relevant clockN.reasoning themselves.
// ---------------------------------------------------------------------------

export type ClockBoard = {
  caseId: string
  computedAt: ISODate
  today: ISODate
  facts: CaseFacts

  overallStatus: OverallStatus
  provisional: boolean // true iff legallyEnforceableDebt === 'unsure' (§3 Gate A #2)

  gateA: GateAResult
  clock1: Clock1Result | null
  clock2: Clock2Result | null
  clock3: Clock3Result | null
  clock4: Clock4Result | null
}
