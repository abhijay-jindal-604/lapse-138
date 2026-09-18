import { describe, expect, it } from 'vitest'
import { computeClock1, computeClock2, computeClock3, computeClock4, computeGateA, toIntegerPaise } from '../src/index.js'
import type { CaseFacts } from '../src/index.js'

// Tests named T01-T23 correspond directly to LEGAL_RULES.md §5's test table.
// This file covers M1-T3's slice (Gate A, Clock 1, Clock 2) and M1-T4's slice
// (Clock 3, Clock 4: T06-T14, T20-T21).

function baseFacts(overrides: Partial<CaseFacts> = {}): CaseFacts {
  return {
    payeeName: 'Anand Traders',
    payeeAddress: '14 MG Road, Pune 411001',
    drawerName: 'Suresh Kumar',
    drawerAddress: '22 Church Street, Pune 411002',
    chequeNumber: '004521',
    chequeDate: '2026-06-01',
    amountInPaise: toIntegerPaise(50000000),
    drawerBankName: 'Sunrise Cooperative Bank',
    drawerBankBranch: 'Church Street Branch',
    payeeBankBranch: 'MG Road Branch',
    presentationDate: '2026-06-05',
    dishonourMemoDate: null,
    bankInfoReceivedDate: null,
    dishonourReason: 'insufficient_funds',
    presentationCount: 1,
    noticeSentDate: null,
    noticeReceivedDate: null,
    noticeServiceMode: 'unknown',
    paymentStatus: 'none',
    paymentDate: null,
    complaintFiledDate: null,
    legallyEnforceableDebt: 'yes',
    interestClaimedInPaise: null,
    accusedEmail: null,
    accusedMobile: null,
    accusedMessagingDetails: null,
    ...overrides,
  }
}

describe('computeGateA', () => {
  it('T17: signature mismatch → NEEDS_REVIEW, clocks shown for information only', () => {
    const result = computeGateA(baseFacts({ dishonourReason: 'signature_mismatch' }))
    expect(result.status).toBe('NEEDS_REVIEW')
    expect(result.reasoning.length).toBeGreaterThan(0)
  })

  it('T18: account closed → proceeds, with the case-law caveat folded into reasoning', () => {
    const result = computeGateA(baseFacts({ dishonourReason: 'account_closed' }))
    expect(result.status).toBe('PROCEED_WITH_NOTE')
    expect(result.reasoning.length).toBeGreaterThanOrEqual(2)
    expect(result.reasoning.some((step) => step.plainEnglish.toLowerCase().includes('case law'))).toBe(true)
  })

  it('stop_payment is covered the same way as account_closed', () => {
    const result = computeGateA(baseFacts({ dishonourReason: 'stop_payment' }))
    expect(result.status).toBe('PROCEED_WITH_NOTE')
  })

  it('insufficient_funds and exceeds_arrangement proceed cleanly', () => {
    expect(computeGateA(baseFacts({ dishonourReason: 'insufficient_funds' })).status).toBe('PROCEED')
    expect(computeGateA(baseFacts({ dishonourReason: 'exceeds_arrangement' })).status).toBe('PROCEED')
  })

  it('T19: not a legally enforceable debt → NOT_A_138_CASE, stops before Clock 1', () => {
    const result = computeGateA(baseFacts({ legallyEnforceableDebt: 'no' }))
    expect(result.status).toBe('NOT_A_138_CASE')
    expect(result.reasoning.length).toBeGreaterThan(0)
  })

  it('legallyEnforceableDebt "unsure" → NEEDS_REVIEW, provisional', () => {
    const result = computeGateA(baseFacts({ legallyEnforceableDebt: 'unsure' }))
    expect(result.status).toBe('NEEDS_REVIEW')
    expect(result.reasoning.length).toBeGreaterThanOrEqual(2)
  })
})

describe('computeClock1', () => {
  it('T15: stale cheque at presentation → NOT_A_138_CASE', () => {
    const facts = baseFacts({ chequeDate: '2026-01-10', presentationDate: '2026-05-10' })
    const result = computeClock1(facts, '2026-09-17')
    expect(result.status).toBe('NOT_A_138_CASE')
    expect(result.lastValidPresentationDate).toBe('2026-04-10')
    expect(result.reasoning.length).toBeGreaterThan(0)
  })

  it('T16: cheque not yet presented, still valid → ACT_NOW, present before 2026-12-01', () => {
    const facts = baseFacts({ chequeDate: '2026-09-01', presentationDate: null })
    const result = computeClock1(facts, '2026-09-17')
    expect(result.status).toBe('ACT_NOW')
    expect(result.lastValidPresentationDate).toBe('2026-12-01')
  })

  it('not presented, past validity → NOT_A_138_CASE (stale instrument)', () => {
    const facts = baseFacts({ chequeDate: '2026-01-01', presentationDate: null })
    const result = computeClock1(facts, '2026-09-17')
    expect(result.status).toBe('NOT_A_138_CASE')
  })

  it('presented within validity → PASS', () => {
    const facts = baseFacts({ chequeDate: '2026-07-01', presentationDate: '2026-08-15' })
    const result = computeClock1(facts, '2026-09-17')
    expect(result.status).toBe('PASS')
    expect(result.lastValidPresentationDate).toBe('2026-10-01')
    expect(result.statutorySixMonthDate).toBe('2027-01-01')
  })
})

describe('computeClock2', () => {
  it('T01: healthy case, notice window open', () => {
    const facts = baseFacts({ bankInfoReceivedDate: '2026-09-01' })
    const result = computeClock2(facts, '2026-09-10')
    expect(result.status).toBe('live')
    if (result.status === 'live') {
      expect(result.noticeDeadline).toBe('2026-10-01')
      expect(result.daysRemaining).toBe(21)
      expect(result.assumption).toBeNull()
    }
    expect(result.reasoning.length).toBeGreaterThan(0)
  })

  it('T02: urgent case, 2 days left', () => {
    const facts = baseFacts({ bankInfoReceivedDate: '2026-08-20' })
    const result = computeClock2(facts, '2026-09-17')
    expect(result.status).toBe('live')
    if (result.status === 'live') {
      expect(result.noticeDeadline).toBe('2026-09-19')
      expect(result.daysRemaining).toBe(2)
    }
  })

  it('T03: notice deadline blown, cheque still valid → RE_PRESENT_CHEQUE before 2026-10-20', () => {
    const facts = baseFacts({ chequeDate: '2026-07-20', bankInfoReceivedDate: '2026-07-25' })
    const result = computeClock2(facts, '2026-09-17')
    expect(result.status).toBe('DEADLINE_MISSED')
    if (result.status === 'DEADLINE_MISSED') {
      expect(result.noticeDeadline).toBe('2026-08-24')
      expect(result.recoveryPath.kind).toBe('RE_PRESENT_CHEQUE')
      if (result.recoveryPath.kind === 'RE_PRESENT_CHEQUE') {
        expect(result.recoveryPath.deadline).toBe('2026-10-20')
        expect(result.recoveryPath.source).toContain('MSR Leathers')
      }
    }
  })

  it('T04: notice deadline blown, cheque stale → no §138 recovery, civil note only', () => {
    const facts = baseFacts({ chequeDate: '2026-05-01', bankInfoReceivedDate: '2026-05-10' })
    const result = computeClock2(facts, '2026-09-17')
    expect(result.status).toBe('DEADLINE_MISSED')
    if (result.status === 'DEADLINE_MISSED') {
      expect(result.recoveryPath.kind).toBe('CIVIL_SUIT_ONLY')
    }
  })

  it('T05: trigger-day exclusion — deadline is 2026-10-01, not 2026-09-30', () => {
    const facts = baseFacts({ bankInfoReceivedDate: '2026-09-01' })
    const result = computeClock2(facts, '2026-09-10')
    if (result.status === 'live') {
      expect(result.noticeDeadline).toBe('2026-10-01')
    } else {
      throw new Error(`expected live status, got ${result.status}`)
    }
  })

  it('T22: memo-date fallback — computes from memo date and emits an assumption flag', () => {
    const facts = baseFacts({ bankInfoReceivedDate: null, dishonourMemoDate: '2026-09-01' })
    const result = computeClock2(facts, '2026-09-10')
    expect(result.status).toBe('live')
    if (result.status === 'live') {
      expect(result.noticeDeadline).toBe('2026-10-01')
      expect(result.assumption).not.toBeNull()
    }
  })

  it('T22b: memo-date fallback can still end in a missed deadline, assumption carries through', () => {
    const facts = baseFacts({
      chequeDate: '2026-07-20',
      bankInfoReceivedDate: null,
      dishonourMemoDate: '2026-07-25',
    })
    const result = computeClock2(facts, '2026-09-17')
    expect(result.status).toBe('DEADLINE_MISSED')
    if (result.status === 'DEADLINE_MISSED') {
      expect(result.assumption).not.toBeNull()
      expect(result.recoveryPath.kind).toBe('RE_PRESENT_CHEQUE')
    }
  })

  it('T23: both trigger dates missing → NEEDS_REVIEW, no invented date', () => {
    const facts = baseFacts({ bankInfoReceivedDate: null, dishonourMemoDate: null })
    const result = computeClock2(facts, '2026-09-17')
    expect(result.status).toBe('NEEDS_REVIEW')
    expect(result.reasoning.length).toBeGreaterThan(0)
    if (result.status === 'NEEDS_REVIEW') {
      expect(result.reasoning[0].resultDate).toBeNull()
    }
  })

  it('T24: today equal to the deadline is still live, not missed', () => {
    const facts = baseFacts({ bankInfoReceivedDate: '2026-08-18' })
    const result = computeClock2(facts, '2026-09-17')
    expect(result.status).toBe('live')
    if (result.status === 'live') {
      expect(result.noticeDeadline).toBe('2026-09-17')
      expect(result.daysRemaining).toBe(0)
    }
  })

  it('notice sent in time → PASS', () => {
    const facts = baseFacts({ bankInfoReceivedDate: '2026-08-05', noticeSentDate: '2026-08-25' })
    const result = computeClock2(facts, '2026-09-17')
    expect(result.status).toBe('PASS')
  })

  it('notice sent after the deadline → DEADLINE_MISSED', () => {
    const facts = baseFacts({ bankInfoReceivedDate: '2026-07-25', noticeSentDate: '2026-08-30' })
    const result = computeClock2(facts, '2026-09-17')
    expect(result.status).toBe('DEADLINE_MISSED')
  })
})

describe('computeClock3', () => {
  it('T06: 15-day window, exclusion — window ends 2026-09-16, cause of action 2026-09-17', () => {
    const facts = baseFacts({ noticeReceivedDate: '2026-09-01', noticeServiceMode: 'received' })
    const result = computeClock3(facts, '2026-09-20')
    expect(result.status).toBe('PASS')
    if (result.status === 'PASS') {
      expect(result.paymentWindowEnds).toEqual({ basis: 'computed', date: '2026-09-16' })
      expect(result.causeOfActionDate).toEqual({ basis: 'computed', date: '2026-09-17' })
      expect(result.deemedService).toBe(false)
    }
    expect(result.reasoning.length).toBeGreaterThan(0)
  })

  it('T13: paid within 15 days → RESOLVED, no offence', () => {
    const facts = baseFacts({
      noticeReceivedDate: '2026-09-01',
      noticeServiceMode: 'received',
      paymentStatus: 'full',
      paymentDate: '2026-09-10',
    })
    const result = computeClock3(facts, '2026-09-12')
    expect(result.status).toBe('RESOLVED')
    if (result.status === 'RESOLVED') {
      expect(result.paymentWindowEnds).toEqual({ basis: 'computed', date: '2026-09-16' })
    }
  })

  it('T14: part payment → NEEDS_REVIEW', () => {
    const facts = baseFacts({
      noticeReceivedDate: '2026-09-01',
      noticeServiceMode: 'received',
      paymentStatus: 'part',
    })
    const result = computeClock3(facts, '2026-09-12')
    expect(result.status).toBe('NEEDS_REVIEW')
    if (result.status === 'NEEDS_REVIEW' && 'reviewReason' in result) {
      expect(result.reviewReason).toBe('part_payment')
    }
  })

  it('T20: unknown notice receipt date, no sent date either → NEEDS_REVIEW, no guessed date anywhere', () => {
    const facts = baseFacts({
      noticeReceivedDate: null,
      noticeServiceMode: 'unknown',
      noticeSentDate: null,
    })
    const result = computeClock3(facts, '2026-09-12')
    expect(result.status).toBe('NEEDS_REVIEW')
    if (result.status === 'NEEDS_REVIEW' && 'reviewReason' in result) {
      expect(result.reviewReason).toBe('missing_trigger')
      // This variant of the union carries no date fields at all — the type
      // itself enforces "no guessed date anywhere in output".
      expect('paymentWindowEnds' in result).toBe(false)
    }
    for (const step of result.reasoning) {
      expect(step.resultDate).toBeNull()
    }
  })

  it('T25 setup: notice sent, receipt unknown → advisory window, not asserted as fact', () => {
    const facts = baseFacts({
      noticeReceivedDate: null,
      noticeServiceMode: 'unknown',
      noticeSentDate: '2026-09-01',
    })
    const result = computeClock3(facts, '2026-09-12')
    expect(result.status).toBe('NEEDS_REVIEW')
    if (result.status === 'NEEDS_REVIEW' && 'reviewReason' in result && result.reviewReason === 'pending_service_confirmation') {
      expect(result.paymentWindowEnds.basis).toBe('advisory')
      expect(result.paymentWindowEnds.earliest).toBe('2026-09-19')
      expect(result.paymentWindowEnds.latest).toBe('2026-09-23')
    } else {
      throw new Error(`expected pending_service_confirmation, got ${JSON.stringify(result)}`)
    }
  })

  it('T21: deemed service on refusal — window ends 2026-09-20, reasoning says deemed service', () => {
    const facts = baseFacts({ noticeReceivedDate: '2026-09-05', noticeServiceMode: 'refused' })
    const result = computeClock3(facts, '2026-09-25')
    expect(result.status).toBe('PASS')
    if (result.status === 'PASS') {
      expect(result.paymentWindowEnds).toEqual({ basis: 'computed', date: '2026-09-20' })
      expect(result.deemedService).toBe(true)
    }
    expect(result.reasoning.some((step) => step.plainEnglish.toLowerCase().includes('deemed service'))).toBe(true)
  })

  it('unclaimed return is deemed service the same way as refusal', () => {
    const facts = baseFacts({ noticeReceivedDate: '2026-09-05', noticeServiceMode: 'unclaimed' })
    const result = computeClock3(facts, '2026-09-10')
    expect(result.status).toBe('live')
    if (result.status === 'live') {
      expect(result.deemedService).toBe(true)
    }
  })

  it('live before the payment window closes', () => {
    const facts = baseFacts({ noticeReceivedDate: '2026-09-01', noticeServiceMode: 'received' })
    const result = computeClock3(facts, '2026-09-10')
    expect(result.status).toBe('live')
    if (result.status === 'live') {
      expect(result.paymentWindowEnds).toEqual({ basis: 'computed', date: '2026-09-16' })
      expect(result.daysRemaining).toBe(6)
    }
  })

  it('both trigger dates missing → NEEDS_REVIEW, missing_trigger', () => {
    const facts = baseFacts({ noticeReceivedDate: null, noticeServiceMode: 'received', noticeSentDate: null })
    const result = computeClock3(facts, '2026-09-10')
    expect(result.status).toBe('NEEDS_REVIEW')
    if (result.status === 'NEEDS_REVIEW' && 'reviewReason' in result) {
      expect(result.reviewReason).toBe('missing_trigger')
    }
  })
})

describe('computeClock4', () => {
  it('T07: one-month filing window — cause of action 2026-09-17 → filing deadline 2026-10-17', () => {
    const result = computeClock4(baseFacts(), '2026-09-17', '2026-09-17')
    expect(result.filingDeadline).toBe('2026-10-17')
  })

  it('T08: month-end clamping — cause of action 2026-01-31 → filing deadline 2026-02-28', () => {
    const result = computeClock4(baseFacts(), '2026-01-31', '2026-01-31')
    expect(result.filingDeadline).toBe('2026-02-28')
  })

  it('T09: leap-year clamping — cause of action 2028-01-31 → filing deadline 2028-02-29', () => {
    const result = computeClock4(baseFacts(), '2028-01-31', '2028-01-31')
    expect(result.filingDeadline).toBe('2028-02-29')
  })

  it('T10: premature complaint → PREMATURE, cites Yogendra Pratap Singh, time remains to refile', () => {
    const facts = baseFacts({ complaintFiledDate: '2026-09-10' })
    const result = computeClock4(facts, '2026-09-17', '2026-09-17')
    expect(result.status).toBe('PREMATURE')
    if (result.status === 'PREMATURE') {
      expect(result.recoveryPath.kind).toBe('REFILE_SAME_CAUSE')
      expect(result.recoveryPath.source).toContain('Yogendra Pratap Singh')
      if (result.recoveryPath.kind === 'REFILE_SAME_CAUSE') {
        expect(result.recoveryPath.timeRemains).toBe(true)
        expect(result.recoveryPath.filingDeadline).toBe('2026-10-17')
      }
    }
  })

  it('T10b: premature complaint discovered after the original filing deadline → timeRemains false, does not default to true', () => {
    const facts = baseFacts({ complaintFiledDate: '2026-09-10' })
    const result = computeClock4(facts, '2026-11-01', '2026-09-17')
    expect(result.status).toBe('PREMATURE')
    if (result.status === 'PREMATURE' && result.recoveryPath.kind === 'REFILE_SAME_CAUSE') {
      expect(result.recoveryPath.timeRemains).toBe(false)
    }
  })

  it('T11: filed on the last day → in time', () => {
    const facts = baseFacts({ complaintFiledDate: '2026-10-17' })
    const result = computeClock4(facts, '2026-10-17', '2026-09-17')
    expect(result.status).toBe('PASS')
  })

  it('T12: filed one day late → DEADLINE_MISSED, discretionary condonation path', () => {
    const facts = baseFacts({ complaintFiledDate: '2026-10-18' })
    const result = computeClock4(facts, '2026-10-18', '2026-09-17')
    expect(result.status).toBe('DEADLINE_MISSED')
    if (result.status === 'DEADLINE_MISSED') {
      expect(result.recoveryPath.kind).toBe('CONDONE_DELAY')
      expect(result.recoveryPath.plainEnglish.toLowerCase()).toContain('may')
      expect(result.recoveryPath.plainEnglish.toLowerCase()).not.toContain('will be')
    }
  })

  it('not filed, window not yet open', () => {
    const result = computeClock4(baseFacts(), '2026-09-10', '2026-09-17')
    expect(result.status).toBe('not_yet_open')
    if (result.status === 'not_yet_open') {
      expect(result.opensInDays).toBe(7)
    }
  })

  it('not filed, live within the filing window', () => {
    const result = computeClock4(baseFacts(), '2026-10-01', '2026-09-17')
    expect(result.status).toBe('live')
    if (result.status === 'live') {
      expect(result.daysRemaining).toBe(16)
    }
  })

  it('not filed, deadline missed → DEADLINE_MISSED with condonation path', () => {
    const result = computeClock4(baseFacts(), '2026-11-01', '2026-09-17')
    expect(result.status).toBe('DEADLINE_MISSED')
    if (result.status === 'DEADLINE_MISSED') {
      expect(result.recoveryPath.kind).toBe('CONDONE_DELAY')
    }
  })
})
