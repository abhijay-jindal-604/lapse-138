import { describe, expect, it } from 'vitest'
import {
  computeClock1,
  computeClock2,
  computeClock3,
  computeClock4,
  computeGateA,
  computeOverallStatus,
  toIntegerPaise,
} from '../src/index.js'
import type { CaseFacts } from '../src/index.js'

// LEGAL_RULES.md §4: overall status precedence, highest first —
// NOT_A_138_CASE > RESOLVED > NEEDS_REVIEW > DEADLINE_MISSED > ACT_NOW > ON_TRACK.
// Full T01-T27 coverage against computeOverallStatus is M1-T5's job; these are
// sanity tests for each precedence rung, built alongside the M1-T4 clocks.

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

describe('computeOverallStatus', () => {
  it('T01-shaped: healthy case, notice window open 21 days → ON_TRACK', () => {
    const facts = baseFacts({ bankInfoReceivedDate: '2026-09-01' })
    const today = '2026-09-10'
    const gateA = computeGateA(facts)
    const clock1 = computeClock1(facts, today)
    const clock2 = computeClock2(facts, today)
    expect(computeOverallStatus(today, gateA, clock1, clock2, null, null)).toBe('ON_TRACK')
  })

  it('T02-shaped: urgent case, 2 days left → ACT_NOW', () => {
    const facts = baseFacts({ bankInfoReceivedDate: '2026-08-20' })
    const today = '2026-09-17'
    const gateA = computeGateA(facts)
    const clock1 = computeClock1(facts, today)
    const clock2 = computeClock2(facts, today)
    expect(computeOverallStatus(today, gateA, clock1, clock2, null, null)).toBe('ACT_NOW')
  })

  it('NOT_A_138_CASE from Gate A short-circuits everything else', () => {
    const facts = baseFacts({ legallyEnforceableDebt: 'no' })
    const today = '2026-09-17'
    const gateA = computeGateA(facts)
    expect(computeOverallStatus(today, gateA, null, null, null, null)).toBe('NOT_A_138_CASE')
  })

  it('NOT_A_138_CASE from a stale cheque at Clock 1', () => {
    const facts = baseFacts({ chequeDate: '2026-01-10', presentationDate: '2026-05-10' })
    const today = '2026-09-17'
    const gateA = computeGateA(facts)
    const clock1 = computeClock1(facts, today)
    expect(computeOverallStatus(today, gateA, clock1, null, null, null)).toBe('NOT_A_138_CASE')
  })

  it('T13-shaped: paid within 15 days → RESOLVED, outranking a live Clock 4 window', () => {
    const facts = baseFacts({
      noticeReceivedDate: '2026-09-01',
      noticeServiceMode: 'received',
      paymentStatus: 'full',
      paymentDate: '2026-09-10',
    })
    const today = '2026-09-12'
    const gateA = computeGateA(facts)
    const clock3 = computeClock3(facts, today)
    expect(computeOverallStatus(today, gateA, null, null, clock3, null)).toBe('RESOLVED')
  })

  it('T10-shaped: PREMATURE Clock 4 maps to NEEDS_REVIEW, not a seventh status', () => {
    const facts = baseFacts({ complaintFiledDate: '2026-09-10' })
    const today = '2026-09-17'
    const gateA = computeGateA(facts)
    const clock4 = computeClock4(facts, today, '2026-09-17')
    expect(clock4.status).toBe('PREMATURE')
    expect(computeOverallStatus(today, gateA, null, null, null, clock4)).toBe('NEEDS_REVIEW')
  })

  it('T03-shaped: notice deadline blown → DEADLINE_MISSED', () => {
    const facts = baseFacts({ chequeDate: '2026-07-20', bankInfoReceivedDate: '2026-07-25' })
    const today = '2026-09-17'
    const gateA = computeGateA(facts)
    const clock1 = computeClock1(facts, today)
    const clock2 = computeClock2(facts, today)
    expect(computeOverallStatus(today, gateA, clock1, clock2, null, null)).toBe('DEADLINE_MISSED')
  })

  it('T12-shaped: complaint filed one day late → DEADLINE_MISSED', () => {
    const facts = baseFacts({ complaintFiledDate: '2026-10-18' })
    const today = '2026-10-18'
    const gateA = computeGateA(facts)
    const clock4 = computeClock4(facts, today, '2026-09-17')
    expect(computeOverallStatus(today, gateA, null, null, null, clock4)).toBe('DEADLINE_MISSED')
  })

  it('NEEDS_REVIEW ranks above DEADLINE_MISSED deliberately (§4)', () => {
    const facts = baseFacts({
      legallyEnforceableDebt: 'unsure',
      chequeDate: '2026-07-20',
      bankInfoReceivedDate: '2026-07-25',
    })
    const today = '2026-09-17'
    const gateA = computeGateA(facts)
    expect(gateA.status).toBe('NEEDS_REVIEW')
    const clock1 = computeClock1(facts, today)
    const clock2 = computeClock2(facts, today)
    expect(clock2.status).toBe('DEADLINE_MISSED')
    expect(computeOverallStatus(today, gateA, clock1, clock2, null, null)).toBe('NEEDS_REVIEW')
  })

  it("Clock 1's own ACT_NOW status name does not force overall ACT_NOW when the deadline is far off", () => {
    const facts = baseFacts({ chequeDate: '2026-09-01', presentationDate: null })
    const today = '2026-09-17'
    const gateA = computeGateA(facts)
    const clock1 = computeClock1(facts, today)
    expect(clock1.status).toBe('ACT_NOW')
    expect(computeOverallStatus(today, gateA, clock1, null, null, null)).toBe('ON_TRACK')
  })
})
