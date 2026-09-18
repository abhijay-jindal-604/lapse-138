import { describe, expect, it } from 'vitest'
import { computeClock1, computeClock2, computeGateA, toIntegerPaise } from '../src/index.js'
import type { CaseFacts } from '../src/index.js'

// Tests named T01-T23 correspond directly to LEGAL_RULES.md §5's test table.
// This file covers M1-T3's slice: Gate A, Clock 1, Clock 2.

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
