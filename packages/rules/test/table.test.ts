import { describe, expect, it } from 'vitest'
import {
  computeClock1,
  computeClock2,
  computeClock3,
  computeClock4,
  computeGateA,
  computeOverallStatus,
  computeSynopsis,
  toIntegerPaise,
} from '../src/index.js'
import type { CaseFacts } from '../src/index.js'

// This file is the literal, line-by-line audit against LEGAL_RULES.md §5's
// test table: one `it('T##: ...')` per table row, named to match, so "all 27
// tests pass" is a checkable claim rather than an inference from scattered
// scenario tests in clocks.test.ts/status.test.ts/dates.test.ts (which cover
// the same ground unit-by-unit and are left as-is). M1-T5.

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

describe('LEGAL_RULES.md §5 test table — full audit', () => {
  it('T01: healthy case, notice window open → live, deadline 2026-10-01, 21 days left, overall ON_TRACK', () => {
    const facts = baseFacts({ bankInfoReceivedDate: '2026-09-01' })
    const today = '2026-09-10'
    const gateA = computeGateA(facts)
    const clock1 = computeClock1(facts, today)
    const clock2 = computeClock2(facts, today)
    expect(clock2.status).toBe('live')
    if (clock2.status === 'live') {
      expect(clock2.noticeDeadline).toBe('2026-10-01')
      expect(clock2.daysRemaining).toBe(21)
    }
    expect(computeOverallStatus(today, gateA, clock1, clock2, null, null)).toBe('ON_TRACK')
  })

  it('T02: urgent case → deadline 2026-09-19, 2 days left, overall ACT_NOW', () => {
    const facts = baseFacts({ bankInfoReceivedDate: '2026-08-20' })
    const today = '2026-09-17'
    const gateA = computeGateA(facts)
    const clock1 = computeClock1(facts, today)
    const clock2 = computeClock2(facts, today)
    expect(clock2.status).toBe('live')
    if (clock2.status === 'live') {
      expect(clock2.noticeDeadline).toBe('2026-09-19')
      expect(clock2.daysRemaining).toBe(2)
    }
    expect(computeOverallStatus(today, gateA, clock1, clock2, null, null)).toBe('ACT_NOW')
  })

  it('T03: notice deadline blown, cheque still valid → DEADLINE_MISSED + recovery: re-present before 2026-10-20', () => {
    const facts = baseFacts({
      chequeDate: '2026-07-20',
      presentationDate: '2026-07-21',
      bankInfoReceivedDate: '2026-07-25',
    })
    const today = '2026-09-17'
    const gateA = computeGateA(facts)
    const clock1 = computeClock1(facts, today)
    const clock2 = computeClock2(facts, today)
    expect(clock2.status).toBe('DEADLINE_MISSED')
    if (clock2.status === 'DEADLINE_MISSED') {
      expect(clock2.recoveryPath.kind).toBe('RE_PRESENT_CHEQUE')
      if (clock2.recoveryPath.kind === 'RE_PRESENT_CHEQUE') {
        expect(clock2.recoveryPath.deadline).toBe('2026-10-20')
      }
    }
    expect(computeOverallStatus(today, gateA, clock1, clock2, null, null)).toBe('DEADLINE_MISSED')
  })

  it('T04: notice deadline blown, cheque stale → DEADLINE_MISSED, no §138 recovery, civil note only', () => {
    const facts = baseFacts({
      chequeDate: '2026-05-01',
      presentationDate: '2026-05-05',
      bankInfoReceivedDate: '2026-05-10',
    })
    const today = '2026-09-17'
    const gateA = computeGateA(facts)
    const clock1 = computeClock1(facts, today)
    const clock2 = computeClock2(facts, today)
    expect(clock2.status).toBe('DEADLINE_MISSED')
    if (clock2.status === 'DEADLINE_MISSED') {
      expect(clock2.recoveryPath.kind).toBe('CIVIL_SUIT_ONLY')
    }
    expect(computeOverallStatus(today, gateA, clock1, clock2, null, null)).toBe('DEADLINE_MISSED')
  })

  it('T05: trigger-day exclusion — info received 2026-09-01 → deadline is 2026-10-01, not 2026-09-30', () => {
    const facts = baseFacts({ bankInfoReceivedDate: '2026-09-01' })
    const result = computeClock2(facts, '2026-09-02')
    if (result.status === 'live') {
      expect(result.noticeDeadline).toBe('2026-10-01')
      expect(result.noticeDeadline).not.toBe('2026-09-30')
    } else {
      throw new Error(`expected live, got ${result.status}`)
    }
  })

  it('T06: 15-day window, exclusion — notice received 2026-09-01 → window ends 2026-09-16, cause of action 2026-09-17', () => {
    const facts = baseFacts({ noticeReceivedDate: '2026-09-01', noticeServiceMode: 'received' })
    const result = computeClock3(facts, '2026-09-20')
    expect(result.status).toBe('PASS')
    if (result.status === 'PASS') {
      expect(result.paymentWindowEnds).toEqual({ basis: 'computed', date: '2026-09-16' })
      expect(result.causeOfActionDate).toEqual({ basis: 'computed', date: '2026-09-17' })
    }
  })

  it('T07: one-month filing window — cause of action 2026-09-17 → filing deadline 2026-10-17', () => {
    const result = computeClock4(baseFacts(), '2026-09-20', '2026-09-17')
    expect(result.filingDeadline).toBe('2026-10-17')
  })

  it('T08: month-end clamping — cause of action 2026-01-31 → filing deadline 2026-02-28', () => {
    const result = computeClock4(baseFacts(), '2026-02-01', '2026-01-31')
    expect(result.filingDeadline).toBe('2026-02-28')
  })

  it('T09: leap-year clamping — cause of action 2028-01-31 → filing deadline 2028-02-29', () => {
    const result = computeClock4(baseFacts(), '2028-02-01', '2028-01-31')
    expect(result.filingDeadline).toBe('2028-02-29')
  })

  it('T10: premature complaint → PREMATURE, flagged, cites Yogendra Pratap Singh, overall NEEDS_REVIEW', () => {
    const facts = baseFacts({ complaintFiledDate: '2026-09-10' })
    const today = '2026-09-17'
    const gateA = computeGateA(facts)
    const clock4 = computeClock4(facts, today, '2026-09-17')
    expect(clock4.status).toBe('PREMATURE')
    if (clock4.status === 'PREMATURE') {
      expect(clock4.recoveryPath.source).toContain('Yogendra Pratap Singh')
    }
    expect(computeOverallStatus(today, gateA, null, null, null, clock4)).toBe('NEEDS_REVIEW')
  })

  it('T11: filed on the last day → in time (PASS)', () => {
    const facts = baseFacts({ complaintFiledDate: '2026-10-17' })
    const result = computeClock4(facts, '2026-10-17', '2026-09-17')
    expect(result.status).toBe('PASS')
  })

  it('T12: filed one day late → DEADLINE_MISSED + condonation path, worded as discretionary', () => {
    const facts = baseFacts({ complaintFiledDate: '2026-10-18' })
    const today = '2026-10-18'
    const gateA = computeGateA(facts)
    const clock4 = computeClock4(facts, today, '2026-09-17')
    expect(clock4.status).toBe('DEADLINE_MISSED')
    if (clock4.status === 'DEADLINE_MISSED') {
      expect(clock4.recoveryPath.kind).toBe('CONDONE_DELAY')
      expect(clock4.recoveryPath.plainEnglish.toLowerCase()).toContain('may')
      expect(clock4.recoveryPath.plainEnglish.toLowerCase()).not.toContain('will be')
    }
    expect(computeOverallStatus(today, gateA, null, null, null, clock4)).toBe('DEADLINE_MISSED')
  })

  it('T13: paid within 15 days → RESOLVED, no offence, outranks everything else', () => {
    const facts = baseFacts({
      noticeReceivedDate: '2026-09-01',
      noticeServiceMode: 'received',
      paymentStatus: 'full',
      paymentDate: '2026-09-10',
    })
    const today = '2026-09-12'
    const gateA = computeGateA(facts)
    const clock3 = computeClock3(facts, today)
    expect(clock3.status).toBe('RESOLVED')
    expect(computeOverallStatus(today, gateA, null, null, clock3, null)).toBe('RESOLVED')
  })

  it('T14: part payment → NEEDS_REVIEW', () => {
    const facts = baseFacts({
      bankInfoReceivedDate: '2026-08-01',
      noticeSentDate: '2026-08-10',
      noticeReceivedDate: '2026-09-01',
      noticeServiceMode: 'received',
      paymentStatus: 'part',
    })
    const today = '2026-09-12'
    const gateA = computeGateA(facts)
    const clock1 = computeClock1(facts, today)
    const clock2 = computeClock2(facts, today)
    const clock3 = computeClock3(facts, today)
    expect(clock2.status).toBe('PASS')
    expect(clock3.status).toBe('NEEDS_REVIEW')
    if (clock3.status === 'NEEDS_REVIEW' && 'reviewReason' in clock3) {
      expect(clock3.reviewReason).toBe('part_payment')
    }
    expect(computeOverallStatus(today, gateA, clock1, clock2, clock3, null)).toBe('NEEDS_REVIEW')
  })

  it('T15: stale cheque at presentation → NOT_A_138_CASE, Clock 1 fails, overall NOT_A_138_CASE', () => {
    const facts = baseFacts({ chequeDate: '2026-01-10', presentationDate: '2026-05-10' })
    const today = '2026-09-17'
    const gateA = computeGateA(facts)
    const clock1 = computeClock1(facts, today)
    expect(clock1.status).toBe('NOT_A_138_CASE')
    expect(computeOverallStatus(today, gateA, clock1, null, null, null)).toBe('NOT_A_138_CASE')
  })

  it('T16: cheque not yet presented, still valid → ACT_NOW: present before 2026-12-01', () => {
    const facts = baseFacts({ chequeDate: '2026-09-01', presentationDate: null })
    const result = computeClock1(facts, '2026-09-17')
    expect(result.status).toBe('ACT_NOW')
    expect(result.lastValidPresentationDate).toBe('2026-12-01')
  })

  it('T17: signature mismatch → NEEDS_REVIEW, clocks still computable for information', () => {
    const facts = baseFacts({ dishonourReason: 'signature_mismatch' })
    const today = '2026-09-17'
    const gateA = computeGateA(facts)
    expect(gateA.status).toBe('NEEDS_REVIEW')
    // "clocks shown for information" — nothing about Gate A's status blocks a
    // caller from still computing Clock 1 for display purposes.
    const clock1 = computeClock1(facts, today)
    expect(clock1.status).toBe('PASS')
    expect(computeOverallStatus(today, gateA, clock1, null, null, null)).toBe('NEEDS_REVIEW')
  })

  it('T18: account closed → proceeds, with the case-law note attached', () => {
    const result = computeGateA(baseFacts({ dishonourReason: 'account_closed' }))
    expect(result.status).toBe('PROCEED_WITH_NOTE')
    expect(result.reasoning.some((step) => step.plainEnglish.toLowerCase().includes('case law'))).toBe(true)
  })

  it('T19: not a legally enforceable debt → NOT_A_138_CASE, stops before Clock 1', () => {
    const facts = baseFacts({ legallyEnforceableDebt: 'no' })
    const today = '2026-09-17'
    const gateA = computeGateA(facts)
    expect(gateA.status).toBe('NOT_A_138_CASE')
    // No clock1 computed at all — the chain stops at Gate A.
    expect(computeOverallStatus(today, gateA, null, null, null, null)).toBe('NOT_A_138_CASE')
  })

  it('T20: unknown notice receipt date → NEEDS_REVIEW, no guessed date anywhere in output', () => {
    const facts = baseFacts({ noticeReceivedDate: null, noticeServiceMode: 'unknown', noticeSentDate: null })
    const today = '2026-09-12'
    const gateA = computeGateA(facts)
    const clock3 = computeClock3(facts, today)
    expect(clock3.status).toBe('NEEDS_REVIEW')
    for (const step of clock3.reasoning) {
      expect(step.resultDate).toBeNull()
    }
    expect(computeOverallStatus(today, gateA, null, null, clock3, null)).toBe('NEEDS_REVIEW')
  })

  it('T21: deemed service on refusal → window ends 2026-09-20, reasoning says deemed service', () => {
    const facts = baseFacts({ noticeReceivedDate: '2026-09-05', noticeServiceMode: 'refused' })
    const result = computeClock3(facts, '2026-09-25')
    expect(result.status).toBe('PASS')
    if (result.status === 'PASS') {
      expect(result.paymentWindowEnds).toEqual({ basis: 'computed', date: '2026-09-20' })
      expect(result.deemedService).toBe(true)
    }
    expect(result.reasoning.some((step) => step.plainEnglish.toLowerCase().includes('deemed service'))).toBe(true)
  })

  it('T22: memo-date fallback — computes from memo date and emits an assumption flag', () => {
    const facts = baseFacts({ bankInfoReceivedDate: null, dishonourMemoDate: '2026-09-01' })
    const result = computeClock2(facts, '2026-09-10')
    expect(result.status).toBe('live')
    if (result.status === 'live') {
      expect(result.noticeDeadline).toBe('2026-10-01')
      expect(result.assumption).not.toBeNull()
      expect(result.assumption?.toLowerCase()).toContain('memo date')
    }
  })

  it('T23: both trigger dates missing → NEEDS_REVIEW, no deadline invented', () => {
    const facts = baseFacts({ bankInfoReceivedDate: null, dishonourMemoDate: null })
    const today = '2026-09-17'
    const gateA = computeGateA(facts)
    const clock1 = computeClock1(facts, today)
    const clock2 = computeClock2(facts, today)
    expect(clock2.status).toBe('NEEDS_REVIEW')
    expect(computeOverallStatus(today, gateA, clock1, clock2, null, null)).toBe('NEEDS_REVIEW')
  })

  it('T24: today is exactly the deadline → still live, 0 days left, ACT_NOW, not missed', () => {
    // This is the off-by-one boundary LEGAL_RULES.md §5 itself flags as the
    // one most likely to break — assert it end to end, not just at Clock 2.
    const facts = baseFacts({ bankInfoReceivedDate: '2026-08-18' })
    const today = '2026-09-17'
    const gateA = computeGateA(facts)
    const clock1 = computeClock1(facts, today)
    const clock2 = computeClock2(facts, today)
    expect(clock2.status).toBe('live')
    if (clock2.status === 'live') {
      expect(clock2.noticeDeadline).toBe('2026-09-17')
      expect(clock2.daysRemaining).toBe(0)
    }
    expect(computeOverallStatus(today, gateA, clock1, clock2, null, null)).toBe('ACT_NOW')
  })

  it('T25: notice sent, receipt unknown, no tracking yet → advisory window, overall NEEDS_REVIEW only', () => {
    const facts = baseFacts({
      bankInfoReceivedDate: '2026-08-15',
      noticeSentDate: '2026-09-01',
      noticeReceivedDate: null,
      noticeServiceMode: 'unknown',
    })
    const gateA = computeGateA(facts)

    // Fixed facts up front: Clock 2 PASS (notice sent within its 30-day
    // window) and Clock 3 the advisory NEEDS_REVIEW branch. Neither depends
    // on `today`, so this is stable across the range checked below.
    const clock1 = computeClock1(facts, '2026-09-17')
    const clock2 = computeClock2(facts, '2026-09-17')
    expect(clock2.status).toBe('PASS')

    const clock3 = computeClock3(facts, '2026-09-17')
    expect(clock3.status).toBe('NEEDS_REVIEW')
    if (clock3.status !== 'NEEDS_REVIEW' || !('reviewReason' in clock3) || clock3.reviewReason !== 'pending_service_confirmation') {
      throw new Error(`expected pending_service_confirmation, got ${JSON.stringify(clock3)}`)
    }

    expect(clock3.paymentWindowEnds.basis).toBe('advisory')
    expect(clock3.paymentWindowEnds.earliest).toBe('2026-09-19')
    expect(clock3.paymentWindowEnds.latest).toBe('2026-09-23')
    expect(clock3.causeOfActionDate.basis).toBe('advisory')
    expect(clock3.earliestSafeFilingDate.basis).toBe('advisory')
    expect(clock3.earliestSafeFilingDate.earliest).toBe(clock3.earliestSafeFilingDate.latest)
    expect(clock3.earliestSafeFilingDate.latest).toBe(clock3.causeOfActionDate.latest)

    expect(
      clock3.reasoning.some((step) => step.source.includes('General Clauses Act 1897')),
    ).toBe(true)

    // "No status other than NEEDS_REVIEW is reachable from an advisory
    // figure": the advisory branch doesn't consult `today` at all, so sweep a
    // wide range of dates — long before, inside, and long after the
    // estimated window — and confirm overall status never moves off
    // NEEDS_REVIEW while the underlying facts stay advisory-only.
    for (const today of ['2026-01-01', '2026-09-19', '2026-09-23', '2027-06-01']) {
      expect(computeOverallStatus(today, gateA, clock1, clock2, clock3, null)).toBe('NEEDS_REVIEW')
    }
  })

  it('T26: missed notice deadline, recovery path present, cites MSR Leathers (structure — rendering is a UI concern)', () => {
    const facts = baseFacts({
      chequeDate: '2026-07-20',
      presentationDate: '2026-07-21',
      bankInfoReceivedDate: '2026-07-25',
    })
    const result = computeClock2(facts, '2026-09-17')
    expect(result.status).toBe('DEADLINE_MISSED')
    if (result.status === 'DEADLINE_MISSED') {
      expect(result.recoveryPath).not.toBeNull()
      expect(result.recoveryPath.source).toContain('MSR Leathers')
    }
  })

  it('T27: synopsis generation from a complete case — every value traceable, zero model-sourced fields', () => {
    const facts = baseFacts({
      bankInfoReceivedDate: '2026-08-01',
      dishonourMemoDate: '2026-07-28',
      noticeSentDate: '2026-08-10',
      noticeReceivedDate: '2026-08-15',
      noticeServiceMode: 'received',
      paymentStatus: 'none',
      interestClaimedInPaise: toIntegerPaise(500000),
      accusedEmail: 'accused@example.com',
      accusedMobile: '+91 98765 43210',
      accusedMessagingDetails: 'WhatsApp: +91 98765 43210',
    })
    const today = '2026-09-05'
    const clock3 = computeClock3(facts, today)
    expect(clock3.status).toBe('PASS')

    const synopsis = computeSynopsis(facts, clock3)

    expect(synopsis.marker).toBe('DRAFT SYNOPSIS — verify against the prescribed format before filing')

    expect(synopsis.partiesParticulars).toEqual({
      payeeName: facts.payeeName,
      payeeAddress: facts.payeeAddress,
      drawerName: facts.drawerName,
      drawerAddress: facts.drawerAddress,
    })

    expect(synopsis.chequeParticulars).toEqual({
      chequeNumber: facts.chequeNumber,
      chequeDate: facts.chequeDate,
      amountInPaise: facts.amountInPaise,
      drawerBankName: facts.drawerBankName,
      drawerBankBranch: facts.drawerBankBranch,
      drawerName: facts.drawerName,
      payeeName: facts.payeeName,
    })

    expect(synopsis.dishonour).toEqual({
      presentationDate: facts.presentationDate,
      dishonourDate: facts.dishonourMemoDate,
      dishonourReason: facts.dishonourReason,
    })

    expect(synopsis.statutoryNotice).toEqual({
      dispatchDate: facts.noticeSentDate,
      mode: facts.noticeServiceMode,
      receiptDate: facts.noticeReceivedDate,
      deemed: false,
      response: facts.paymentStatus,
      responseDate: facts.paymentDate,
    })

    if (clock3.status === 'PASS') {
      expect(synopsis.causeOfAction).toEqual({ date: clock3.causeOfActionDate.date, basis: 'computed' })
    }

    expect(synopsis.reliefSought.amountInPaise).toBe(facts.amountInPaise)
    expect(synopsis.reliefSought.interestClaimedInPaise).toBe(facts.interestClaimedInPaise)
    expect(synopsis.reliefSought.interimCompensationNote).toContain('§143A')
    expect(synopsis.reliefSought.interimCompensationNote.toLowerCase()).toContain('may')

    expect(synopsis.accusedContactParticulars).toEqual({
      accusedEmail: facts.accusedEmail,
      accusedMobile: facts.accusedMobile,
      accusedMessagingDetails: facts.accusedMessagingDetails,
      affidavitWarning: expect.stringContaining('affidavit'),
    })

    // Determinism: same inputs, same output — nothing here is drawn from a
    // model or from any source outside facts/clock3.
    expect(computeSynopsis(facts, clock3)).toEqual(synopsis)
  })

  it('T27b: cause of action not yet accrued → causeOfAction is null with basis not_yet_accrued, never invented', () => {
    const facts = baseFacts({ noticeReceivedDate: '2026-09-01', noticeServiceMode: 'received' })
    const clock3 = computeClock3(facts, '2026-09-05') // still inside the 15-day window
    expect(clock3.status).toBe('live')
    const synopsis = computeSynopsis(facts, clock3)
    expect(synopsis.causeOfAction).toEqual({ date: null, basis: 'not_yet_accrued' })
  })
})
